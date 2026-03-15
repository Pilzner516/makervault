// Supabase Edge Function: refresh-prices
// Scheduled weekly to update pricing for low-stock parts
// Deploy: supabase functions deploy refresh-prices
// Schedule: supabase functions set-schedule refresh-prices --cron "0 8 * * 1" (Mondays 8am)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OCTOPART_API_KEY = Deno.env.get('OCTOPART_API_KEY') ?? '';
const OCTOPART_ENDPOINT = 'https://octopart.com/api/v4/endpoint';

const SEARCH_QUERY = `
query SearchParts($q: String!) {
  search(q: $q, limit: 1) {
    results {
      part {
        mpn
        sellers {
          company { name }
          offers {
            prices { price currency quantity }
            in_stock
            product_url
          }
        }
      }
    }
  }
}`;

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get parts that are at or below their reorder threshold
  const { data: lowStockParts, error: partsError } = await supabase
    .from('parts')
    .select('id, mpn, name, quantity, low_stock_threshold')
    .not('mpn', 'is', null)
    .filter('quantity', 'lte', 'low_stock_threshold');

  if (partsError) {
    return new Response(JSON.stringify({ error: partsError.message }), {
      status: 500,
    });
  }

  const results = [];

  for (const part of lowStockParts ?? []) {
    if (!part.mpn) continue;

    try {
      const response = await fetch(OCTOPART_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OCTOPART_API_KEY}`,
        },
        body: JSON.stringify({
          query: SEARCH_QUERY,
          variables: { q: part.mpn },
        }),
      });

      if (!response.ok) continue;

      const json = await response.json();
      const partData = json?.data?.search?.results?.[0]?.part;
      if (!partData?.sellers) continue;

      // Get supplier IDs from DB
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name');

      for (const seller of partData.sellers) {
        const offer = seller.offers?.[0];
        if (!offer) continue;

        const supplierRow = suppliers?.find(
          (s: { name: string }) =>
            s.name.toLowerCase() === seller.company.name.toLowerCase()
        );
        if (!supplierRow) continue;

        const lowestPrice = offer.prices?.[0]?.price ?? null;

        // Check previous price for drop notification
        const { data: existingLink } = await supabase
          .from('part_supplier_links')
          .select('last_price')
          .eq('part_id', part.id)
          .eq('supplier_id', supplierRow.id)
          .single();

        const previousPrice = existingLink?.last_price;

        // Upsert supplier link
        await supabase.from('part_supplier_links').upsert(
          {
            part_id: part.id,
            supplier_id: supplierRow.id,
            product_url: offer.product_url,
            last_price: lowestPrice,
            last_checked_at: new Date().toISOString(),
            in_stock: offer.in_stock,
          },
          { onConflict: 'part_id,supplier_id' }
        );

        // Flag price drops > 10%
        if (
          previousPrice != null &&
          lowestPrice != null &&
          lowestPrice < previousPrice * 0.9
        ) {
          results.push({
            part: part.name,
            supplier: seller.company.name,
            oldPrice: previousPrice,
            newPrice: lowestPrice,
            drop: `${Math.round((1 - lowestPrice / previousPrice) * 100)}%`,
          });
        }
      }
    } catch {
      // Skip parts that fail
    }
  }

  return new Response(
    JSON.stringify({
      updated: lowStockParts?.length ?? 0,
      priceDrops: results,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
