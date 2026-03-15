const OCTOPART_API_KEY = process.env.OCTOPART_API_KEY ?? '';
const OCTOPART_ENDPOINT = 'https://octopart.com/api/v4/endpoint';

export interface OctopartResult {
  name: string;
  manufacturer: string;
  mpn: string;
  category: string;
  description: string;
  imageUrl: string | null;
  specs: Record<string, string>;
  sellers: OctopartSeller[];
}

export interface OctopartSeller {
  name: string;
  homepageUrl: string;
  offers: OctopartOffer[];
}

export interface OctopartOffer {
  prices: Array<{ price: number; currency: string; quantity: number }>;
  inStock: boolean;
  stockQuantity: number | null;
  productUrl: string;
}

const SEARCH_QUERY = `
query SearchParts($q: String!) {
  search(q: $q, limit: 5) {
    results {
      part {
        name
        manufacturer { name }
        mpn
        category { name }
        descriptions { text }
        specs { attribute { name } value }
        images { url }
        sellers {
          company { name homepage_url }
          offers {
            prices { price currency quantity }
            in_stock
            stock_quantity
            product_url
          }
        }
      }
    }
  }
}`;

interface RawPart {
  name: string;
  manufacturer: { name: string } | null;
  mpn: string;
  category: { name: string } | null;
  descriptions: Array<{ text: string }>;
  specs: Array<{ attribute: { name: string }; value: string }>;
  images: Array<{ url: string }>;
  sellers: Array<{
    company: { name: string; homepage_url: string };
    offers: Array<{
      prices: Array<{ price: number; currency: string; quantity: number }>;
      in_stock: boolean;
      stock_quantity: number | null;
      product_url: string;
    }>;
  }>;
}

function mapResult(raw: RawPart): OctopartResult {
  return {
    name: raw.name,
    manufacturer: raw.manufacturer?.name ?? '',
    mpn: raw.mpn,
    category: raw.category?.name ?? '',
    description: raw.descriptions?.[0]?.text ?? '',
    imageUrl: raw.images?.[0]?.url ?? null,
    specs: Object.fromEntries(
      (raw.specs ?? []).map((s) => [s.attribute.name, s.value])
    ),
    sellers: (raw.sellers ?? []).map((s) => ({
      name: s.company.name,
      homepageUrl: s.company.homepage_url,
      offers: (s.offers ?? []).map((o) => ({
        prices: o.prices ?? [],
        inStock: o.in_stock,
        stockQuantity: o.stock_quantity,
        productUrl: o.product_url,
      })),
    })),
  };
}

export async function searchOctopart(query: string): Promise<OctopartResult[]> {
  const response = await fetch(OCTOPART_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OCTOPART_API_KEY}`,
    },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { q: query } }),
  });

  if (!response.ok) {
    throw new Error(`Octopart API error: ${response.status}`);
  }

  const json = await response.json();
  const results = json?.data?.search?.results ?? [];
  return results.map((r: { part: RawPart }) => mapResult(r.part));
}

export async function getPartByMPN(mpn: string): Promise<OctopartResult | null> {
  const results = await searchOctopart(mpn);
  return results.find((r) => r.mpn.toLowerCase() === mpn.toLowerCase()) ?? results[0] ?? null;
}
