import { create } from 'zustand';
import { generateJSON } from '@/lib/gemini';
import * as tts from '@/lib/tts';
import type { VoiceIntent, VoiceParsedIntent, ConversationTurn } from '@/lib/types';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceStore {
  state: VoiceState;
  transcript: string;
  partialTranscript: string;
  lastResponse: string;
  lastIntent: VoiceParsedIntent | null;
  conversationHistory: ConversationTurn[];
  ambientMode: boolean;
  error: string | null;

  setState: (state: VoiceState) => void;
  setTranscript: (text: string) => void;
  setPartialTranscript: (text: string) => void;
  setError: (error: string | null) => void;
  toggleAmbientMode: () => void;
  processTranscript: (text: string) => Promise<VoiceParsedIntent>;
  speakResponse: (text: string) => Promise<void>;
  reset: () => void;
}

const MAX_HISTORY = 3;

const INTENT_PARSE_PROMPT = `You are a voice assistant for an electronics parts inventory app.
Parse this voice command into a structured intent.

Command: "{transcript}"
Conversation history: {history}

Return JSON:
{
  "intent": string,
  "entities": {
    "part_name": string | null,
    "mpn": string | null,
    "quantity": number | null,
    "location": string | null,
    "supplier": string | null
  },
  "response_needed": boolean,
  "clarification_needed": boolean,
  "clarification_question": string | null
}

Valid intents: query_inventory, check_quantity, find_location, update_quantity, consume_parts, get_project_ideas, reorder_part, low_stock_check, add_part, unknown`;

function formatHistory(history: ConversationTurn[]): string {
  if (history.length === 0) return 'None';
  return history
    .map((t) => `${t.role}: "${t.text}"`)
    .join(' → ');
}

// Fallback regex parser when Gemini is unavailable
function fallbackParse(text: string): VoiceParsedIntent {
  const lower = text.toLowerCase();
  const patterns: Array<{ intent: string; re: RegExp }> = [
    { intent: 'check_quantity', re: /how many\s+(.+)/i },
    { intent: 'find_location', re: /where (?:is|are)\s+(.+)/i },
    { intent: 'query_inventory', re: /(?:do i have|find|search for?)\s+(.+)/i },
    { intent: 'consume_parts', re: /(?:i (?:just )?used|consumed?)\s+(\d+)\s+(.+)/i },
    { intent: 'update_quantity', re: /add\s+(\d+)\s+(.+)/i },
    { intent: 'low_stock_check', re: /(?:low stock|running low|what am i low on)/i },
    { intent: 'add_part', re: /add (?:a )?new\s+(.+)/i },
    { intent: 'reorder_part', re: /(?:order|reorder|buy)\s+(.+)/i },
    { intent: 'get_project_ideas', re: /(?:what can i build|project ideas?|suggest)/i },
  ];

  for (const { intent, re } of patterns) {
    const match = lower.match(re);
    if (match) {
      const quantityMatch = text.match(/(\d+)/);
      return {
        intent,
        entities: {
          part_name: match[match.length === 3 ? 2 : 1]?.trim() ?? null,
          mpn: null,
          quantity: quantityMatch ? parseInt(quantityMatch[1], 10) : null,
          location: null,
          supplier: null,
        },
        response_needed: true,
        clarification_needed: false,
        clarification_question: null,
      };
    }
  }

  return {
    intent: 'unknown',
    entities: { part_name: null, mpn: null, quantity: null, location: null, supplier: null },
    response_needed: false,
    clarification_needed: true,
    clarification_question: `I heard "${text}" — what would you like to do?`,
  };
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  state: 'idle',
  transcript: '',
  partialTranscript: '',
  lastResponse: '',
  lastIntent: null,
  conversationHistory: [],
  ambientMode: false,
  error: null,

  setState: (state) => set({ state }),
  setTranscript: (text) => set({ transcript: text }),
  setPartialTranscript: (text) => set({ partialTranscript: text }),
  setError: (error) => set({ error }),
  toggleAmbientMode: () => set((s) => ({ ambientMode: !s.ambientMode })),

  processTranscript: async (text) => {
    set({ state: 'processing', transcript: text, error: null });

    const history = get().conversationHistory;

    // Add user turn
    const userTurn: ConversationTurn = {
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    let parsed: VoiceParsedIntent;
    try {
      const prompt = INTENT_PARSE_PROMPT
        .replace('{transcript}', text)
        .replace('{history}', formatHistory(history));
      parsed = await generateJSON<VoiceParsedIntent>(prompt);
    } catch {
      parsed = fallbackParse(text);
    }

    const updatedHistory = [...history, userTurn].slice(-MAX_HISTORY);
    set({ lastIntent: parsed, conversationHistory: updatedHistory });

    return parsed;
  },

  speakResponse: async (text) => {
    set({ state: 'speaking', lastResponse: text });

    // Add assistant turn to history
    const assistantTurn: ConversationTurn = {
      role: 'assistant',
      text,
      timestamp: Date.now(),
    };
    const history = [...get().conversationHistory, assistantTurn].slice(-MAX_HISTORY);
    set({ conversationHistory: history });

    await tts.speak(text);
    set({ state: 'idle' });
  },

  reset: () =>
    set({
      state: 'idle',
      transcript: '',
      partialTranscript: '',
      error: null,
      lastIntent: null,
    }),
}));
