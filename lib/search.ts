import { supabase } from '@/lib/supabase';
import { generateJSON } from '@/lib/gemini';
import type { Part } from '@/lib/types';

interface ParsedQuery {
  part_name: string | null;
  category: string | null;
  subcategory: string | null;
  specs: Record<string, string> | null;
  keywords: string[];
  intent: 'find_part' | 'check_quantity' | 'find_location' | 'get_ideas';
}

const SEARCH_PARSE_PROMPT = `Parse this electronics inventory search query into structured filters.
Query: "{query}"

Return JSON:
{
  "part_name": string | null,
  "category": string | null,
  "subcategory": string | null,
  "specs": object | null,
  "keywords": string[],
  "intent": "find_part" | "check_quantity" | "find_location" | "get_ideas"
}

Common mappings:
- BJT, FET, MOSFET → category: transistor
- pot → potentiometer
- cap → capacitor
- res, R → resistor
- LED → category: led
- IC, chip → category: ic
- USB-C, USB-A → specs or keywords`;

// Electronics synonyms for fuzzy matching
const SYNONYMS: Record<string, string[]> = {
  transistor: ['BJT', 'FET', 'MOSFET', 'JFET', 'NPN', 'PNP'],
  resistor: ['res', 'resistance', 'ohm'],
  capacitor: ['cap', 'capacitance', 'farad'],
  potentiometer: ['pot', 'variable resistor', 'trimmer'],
  led: ['LED', 'light emitting diode', 'indicator'],
  ic: ['IC', 'chip', 'integrated circuit', 'microchip'],
  cable: ['wire', 'cord', 'lead', 'connector'],
  diode: ['rectifier', 'zener', 'schottky'],
};

function expandSynonyms(term: string): string[] {
  const lower = term.toLowerCase();
  const expanded: string[] = [lower];
  for (const [canonical, syns] of Object.entries(SYNONYMS)) {
    const allTerms = [canonical, ...syns.map((s) => s.toLowerCase())];
    if (allTerms.includes(lower)) {
      expanded.push(canonical, ...syns.map((s) => s.toLowerCase()));
    }
  }
  return [...new Set(expanded)];
}

export async function smartSearch(query: string): Promise<Part[]> {
  // Try NL parsing via Gemini first
  let parsed: ParsedQuery | null = null;
  try {
    parsed = await generateJSON<ParsedQuery>(
      SEARCH_PARSE_PROMPT.replace('{query}', query)
    );
  } catch {
    // Fall through to keyword search
  }

  if (parsed) {
    return await queryFromParsed(parsed);
  }

  // Fallback: keyword search with synonym expansion
  return await keywordSearch(query);
}

async function queryFromParsed(parsed: ParsedQuery): Promise<Part[]> {
  let q = supabase.from('parts').select('*');

  if (parsed.category) {
    q = q.ilike('category', `%${parsed.category}%`);
  }
  if (parsed.subcategory) {
    q = q.ilike('subcategory', `%${parsed.subcategory}%`);
  }
  if (parsed.part_name) {
    q = q.ilike('name', `%${parsed.part_name}%`);
  }

  const { data, error } = await q.order('updated_at', { ascending: false });
  if (error) throw error;

  let results = data as Part[];

  // Post-filter by specs if provided
  if (parsed.specs && Object.keys(parsed.specs).length > 0) {
    results = results.filter((part) => {
      if (!part.specs) return false;
      return Object.entries(parsed.specs!).some(([key, val]) => {
        const specVal = String(part.specs![key] ?? '').toLowerCase();
        return specVal.includes(val.toLowerCase());
      });
    });
  }

  // Post-filter by keywords if no results yet
  if (results.length === 0 && parsed.keywords.length > 0) {
    return await keywordSearch(parsed.keywords.join(' '));
  }

  return results;
}

async function keywordSearch(query: string): Promise<Part[]> {
  const terms = query.split(/\s+/).filter(Boolean);
  const allTerms = terms.flatMap(expandSynonyms);
  const uniqueTerms = [...new Set(allTerms)];

  // Build OR conditions for each term across searchable fields
  const conditions = uniqueTerms
    .map(
      (term) =>
        `name.ilike.%${term}%,manufacturer.ilike.%${term}%,mpn.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`
    )
    .join(',');

  const { data, error } = await supabase
    .from('parts')
    .select('*')
    .or(conditions)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Part[];
}
