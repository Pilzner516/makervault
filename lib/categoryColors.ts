// Category color map — matches Supabase seed data colours
const CATEGORY_COLORS: Record<string, string> = {
  'Electronics': '#00c8e8',
  'Robotics': '#e879f9',
  'Fasteners': '#38bdf8',
  'Tools': '#32d47a',
  '3D Printing': '#a78bfa',
  'Materials': '#f05032',
  'Mechanical': '#60a5fa',
  'Safety & PPE': '#94a3b8',
};

export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return '#888888';
  const color = CATEGORY_COLORS[category];
  if (color) return color;
  const lower = category.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_COLORS)) {
    if (key.toLowerCase() === lower) return val;
  }
  return '#888888';
}
