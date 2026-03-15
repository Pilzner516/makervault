// MakerVault shared types — single source of truth for all agents

export interface Part {
  id: string;
  user_id: string;
  name: string;
  manufacturer: string | null;
  mpn: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  specs: Record<string, string> | null;
  quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  datasheet_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewPart = Omit<Part, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface StorageLocation {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  qr_code: string | null;
  description: string | null;
  created_at: string;
}

export interface PartLocation {
  id: string;
  part_id: string;
  location_id: string;
  quantity: number;
}

export interface Supplier {
  id: string;
  name: string;
  base_url: string | null;
  affiliate_tag: string | null;
  api_key_env_var: string | null;
}

export interface PartSupplierLink {
  id: string;
  part_id: string;
  supplier_id: string;
  supplier_part_number: string | null;
  product_url: string | null;
  last_price: number | null;
  last_checked_at: string | null;
  in_stock: boolean | null;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  estimated_hours: number | null;
  source_url: string | null;
  source: 'instructables' | 'hackster' | 'ai_generated' | null;
  status: 'idea' | 'in_progress' | 'completed';
  created_at: string;
}

export interface ProjectPart {
  id: string;
  project_id: string;
  part_id: string;
  quantity_needed: number;
  quantity_owned: number;
  notes: string | null;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  mpn: string | null;
  category: string | null;
  notes: string | null;
  preferred_supplier: string | null;
  created_at: string;
}

export interface SearchHistoryEntry {
  id: string;
  user_id: string;
  query: string;
  result_count: number;
  created_at: string;
}

export interface VoiceIntent {
  action: 'search' | 'add' | 'update' | 'delete' | 'count' | 'locate' | 'unknown';
  entity: string | null;
  params: Record<string, string>;
  raw: string;
}

// Camera & AI types

export interface GeminiIdentification {
  part_name: string;
  manufacturer: string;
  mpn: string;
  category: string;
  subcategory: string;
  specs: Record<string, string>;
  markings_detected: string[];
  confidence: number;
  alternatives: Array<{
    part_name: string;
    mpn: string;
    confidence: number;
  }>;
}

export interface ConfirmationFeedback {
  image_hash: string;
  gemini_suggestion: string;
  action: 'confirmed' | 'chose_alternative' | 'edited' | 'rejected';
  final_mpn: string;
}

// Voice types

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface VoiceParsedIntent {
  intent: string;
  entities: {
    part_name: string | null;
    mpn: string | null;
    quantity: number | null;
    location: string | null;
    supplier: string | null;
  };
  response_needed: boolean;
  clarification_needed: boolean;
  clarification_question: string | null;
}
