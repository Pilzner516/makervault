import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { GeminiIdentification } from '@/lib/types';

let _model: GenerativeModel | null = null;

// Try models in order — flash-lite has a separate (often available) quota pool
const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

function getModel(): GenerativeModel {
  if (_model) return _model;
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY not set — cannot use Gemini');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  _model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  return _model;
}

async function callWithFallback(fn: (model: GenerativeModel) => Promise<string>): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY not set');
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await fn(model);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Only retry on quota/rate errors (429)
      if (msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
        continue;
      }
      throw e;
    }
  }
  throw new Error('All Gemini models exceeded quota. Try again later or check your API key at https://aistudio.google.com/apikey');
}

function extractJSON(text: string): string {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Gemini response');
  }
  return jsonMatch[1] ?? jsonMatch[0];
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const text = await callWithFallback(async (model) => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
  return JSON.parse(extractJSON(text)) as T;
}

const IDENTIFY_PROMPT = `You are an expert electronics component identifier.
Analyze this image and identify the electronic component shown.

Rules for part_name — THIS IS CRITICAL:
- Write it exactly like an Amazon/eBay product listing title
- Start with WHAT IT IS, not model numbers or part numbers
- Good: "Fitbit Charging Cable USB 3ft" — bad: "370-0064-01 Fitbit"
- Good: "HDMI Cable Male-to-Male 6ft Black" — bad: "G6GLO HDMI"
- Good: "Arduino Nano V3 Microcontroller Board" — bad: "ATmega328P Board"
- Include: purpose, connector types, length/size, brand if recognizable
- NEVER start with a model number, part number, or code
- NEVER use "Generic", "Unknown", "N/A", or "Not specified"
- If you don't know the manufacturer, leave manufacturer as ""
- Put model/part numbers in the mpn field, NOT in part_name

Rules for specs:
- Always include physical attributes you can estimate: length, size, weight, connector_type, color, gauge, pin_count
- For cables: include length, connector_a, connector_b, color
- For resistors/caps: include resistance/capacitance, tolerance, wattage, package
- For ICs: include pin_count, package, voltage
- Only include specs you can actually determine from the image. Leave manufacturer and mpn as empty strings "" if unknown.

Return a JSON object with:
{
  "part_name": string,
  "manufacturer": string,
  "mpn": string,
  "category": string,
  "subcategory": string,
  "specs": object,
  "markings_detected": string[],
  "confidence": number,
  "alternatives": [
    { "part_name": string, "mpn": string, "confidence": number }
  ]
}

IMPORTANT: If the image shows multiple different items, only identify the ONE most prominent or centered item. Do NOT combine multiple items into a single entry (e.g. do NOT say "Cable Set" or "3-pack"). Each scan should identify exactly ONE component.

If you cannot identify the component, set confidence below 0.3 and explain in part_name.`;

const BULK_IDENTIFY_PROMPT = `You are an expert electronics component identifier.
This image shows multiple electronic components (e.g. a bin or tray of parts).
Identify each distinct component visible.

Return a JSON array of objects, each with:
{
  "part_name": string,
  "manufacturer": string,
  "mpn": string,
  "category": string,
  "subcategory": string,
  "specs": object,
  "markings_detected": string[],
  "confidence": number,
  "alternatives": []
}`;

export async function identifyPart(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<GeminiIdentification> {
  const text = await callWithFallback(async (model) => {
    const result = await model.generateContent([
      IDENTIFY_PROMPT,
      { inlineData: { data: base64Image, mimeType } },
    ]);
    return result.response.text();
  });
  return JSON.parse(extractJSON(text)) as GeminiIdentification;
}

export async function identifyBulkParts(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<GeminiIdentification[]> {
  const text = await callWithFallback(async (model) => {
    const result = await model.generateContent([
      BULK_IDENTIFY_PROMPT,
      { inlineData: { data: base64Image, mimeType } },
    ]);
    return result.response.text();
  });
  const jsonStr = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\[[\s\S]*\]/);
  if (!jsonStr) throw new Error('No JSON array found in Gemini response');
  return JSON.parse(jsonStr[1] ?? jsonStr[0]) as GeminiIdentification[];
}
