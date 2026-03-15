import { generateJSON } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import type { Part, Project } from '@/lib/types';

export interface AIProjectSuggestion {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  category: string;
  parts_needed: Array<{
    name: string;
    mpn: string | null;
    quantity: number;
    user_has: boolean;
    quantity_owned: number;
  }>;
  source_suggestion: string;
}

export interface ExternalProject {
  title: string;
  description: string;
  url: string;
  source: 'instructables' | 'hackster';
  thumbnailUrl: string | null;
  matchScore: number;
}

export function buildInventorySummary(parts: Part[]): string {
  const grouped: Record<string, string[]> = {};
  for (const part of parts) {
    const cat = part.category ?? 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(`${part.name} (${part.quantity})`);
  }
  return Object.entries(grouped)
    .map(([cat, items]) => `${cat}: ${items.join(', ')}`)
    .join('\n');
}

const PROJECT_PROMPT = `You are an expert electronics maker and educator.
The user has the following parts in their inventory:
{inventory}

Suggest 5 project ideas they could build. For each project:
- Prioritize projects where they already own most/all parts
- Range from beginner to advanced difficulty
- Include a mix of categories (robotics, IoT, displays, audio, etc.)

Return JSON array:
[{
  "title": string,
  "description": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimated_hours": number,
  "category": string,
  "parts_needed": [{
    "name": string,
    "mpn": string | null,
    "quantity": number,
    "user_has": boolean,
    "quantity_owned": number
  }],
  "source_suggestion": string
}]`;

export async function generateProjectIdeas(
  parts: Part[]
): Promise<AIProjectSuggestion[]> {
  if (parts.length === 0) return [];

  const summary = buildInventorySummary(parts);
  const prompt = PROJECT_PROMPT.replace('{inventory}', summary);
  return await generateJSON<AIProjectSuggestion[]>(prompt);
}

export async function searchInstructables(
  query: string
): Promise<ExternalProject[]> {
  try {
    const response = await fetch(
      `https://www.instructables.com/json-api/search?q=${encodeURIComponent(query)}&limit=10`
    );
    if (!response.ok) return [];
    const data = await response.json();

    const items = Array.isArray(data) ? data : data?.items ?? [];
    return items.map(
      (item: {
        title: string;
        body: string;
        url: string;
        image: { url: string } | null;
      }) => ({
        title: item.title ?? '',
        description: item.body?.slice(0, 200) ?? '',
        url: item.url?.startsWith('http')
          ? item.url
          : `https://www.instructables.com${item.url ?? ''}`,
        source: 'instructables' as const,
        thumbnailUrl: item.image?.url ?? null,
        matchScore: 0,
      })
    );
  } catch {
    return [];
  }
}

export async function searchHackster(
  query: string
): Promise<ExternalProject[]> {
  try {
    const response = await fetch(
      `https://www.hackster.io/search?q=${encodeURIComponent(query)}&type=project`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return [];

    // Hackster doesn't have a proper public API — parse what we can
    const text = await response.text();
    // Try to extract project data from the response
    const titleMatches = text.matchAll(
      /<h2[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h2>/g
    );
    const results: ExternalProject[] = [];
    for (const match of titleMatches) {
      results.push({
        title: match[1]?.trim() ?? '',
        description: '',
        url: `https://www.hackster.io/search?q=${encodeURIComponent(query)}`,
        source: 'hackster' as const,
        thumbnailUrl: null,
        matchScore: 0,
      });
      if (results.length >= 5) break;
    }
    return results;
  } catch {
    return [];
  }
}

export function calculateMatchScore(
  projectParts: Array<{ name: string; quantity: number }>,
  inventory: Part[]
): number {
  if (projectParts.length === 0) return 0;

  let owned = 0;
  for (const needed of projectParts) {
    const match = inventory.find((p) =>
      p.name.toLowerCase().includes(needed.name.toLowerCase())
    );
    if (match && match.quantity >= needed.quantity) {
      owned++;
    }
  }

  return Math.round((owned / projectParts.length) * 100);
}

export async function startBuild(
  projectId: string,
  partsToReserve: Array<{ partId: string; quantity: number }>
): Promise<void> {
  // Mark project as in_progress
  await supabase
    .from('projects')
    .update({ status: 'in_progress' })
    .eq('id', projectId);

  // Snapshot quantities
  for (const { partId, quantity } of partsToReserve) {
    await supabase
      .from('project_parts')
      .update({ quantity_owned: quantity })
      .eq('project_id', projectId)
      .eq('part_id', partId);
  }
}

export async function completeBuild(
  projectId: string,
  consumedParts: Array<{ partId: string; quantityUsed: number }>
): Promise<void> {
  // Mark project as completed
  await supabase
    .from('projects')
    .update({ status: 'completed' })
    .eq('id', projectId);

  // Decrement consumed quantities
  for (const { partId, quantityUsed } of consumedParts) {
    const { data: part } = await supabase
      .from('parts')
      .select('quantity')
      .eq('id', partId)
      .single();

    if (part) {
      await supabase
        .from('parts')
        .update({
          quantity: Math.max(0, (part.quantity as number) - quantityUsed),
          updated_at: new Date().toISOString(),
        })
        .eq('id', partId);
    }
  }
}
