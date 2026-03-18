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

const IDENTIFY_PROMPT = `You are an expert maker/workshop inventory identifier.
Analyze this image and identify the item shown. This could be ANY workshop item — not just electronics.

CATEGORY RULES — YOU MUST assign one of these exact categories:
- "Electronics" — subcategories: Microcontrollers, Resistors, Capacitors, Switches, LEDs, Displays, Sensors, Power Supply, Connectors, Modules, Cables, Wires, Adapters, Chargers, Batteries, Circuit Boards, ICs, Transistors, Diodes, Relays, Crystals, Fuses
- "Fasteners" — subcategories: Bolts & Screws, Nuts, Washers, Standoffs, Rivets, Anchors, Clips, Pins, Threaded Inserts
- "Tools" — subcategories: Hand Tools, Power Tools, Measuring, Soldering, Cutting, Clamps & Vises, Safety Equipment
- "3D Printing" — subcategories: Filament PLA, Filament PETG, Filament ABS, Resin, Bed Adhesive, Nozzles, Print Beds, Stepper Motors, Belts & Pulleys
- "Materials" — subcategories: Aluminium Stock, Steel Stock, Timber, Acrylic, Foam, Adhesives, Consumables, Tape, Heat Shrink, Solder
- "Mechanical" — subcategories: Bearings, Belts & Pulleys, Springs, Gears, Linear Rails, Motors, Couplings, Servos
- "Safety & PPE" — subcategories: Eye Protection, Gloves, Ear Protection, Masks & Respirators

If the item doesn't fit perfectly, choose the CLOSEST category. Every item gets a category — never leave it empty.

Rules for part_name:
- Write it like an Amazon product listing title
- Start with WHAT IT IS: "USB-C Charging Cable 6ft" not "370-0064-01"
- Include: purpose, type, size/length, brand if visible
- NEVER start with model numbers or codes
- NEVER use "Generic", "Unknown", "N/A"
- Put model/part numbers in the mpn field only

Rules for specs:
- Include physical attributes: length, size, color, connector_type, gauge, pin_count, voltage, resistance
- Only include specs visible or determinable from the image
- Leave manufacturer and mpn as "" if unknown

Return JSON:
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

IMPORTANT: Only identify the ONE most prominent/centered item. Do NOT combine multiple items.
If you cannot identify the item, set confidence below 0.3.`;

const BULK_IDENTIFY_PROMPT = `You are an expert maker/workshop inventory identifier.
This image shows multiple items. Identify each distinct item visible.

Use these exact categories: Electronics, Fasteners, Tools, 3D Printing, Materials, Mechanical, Safety & PPE.
Choose the closest category for each item. Every item must have a category and subcategory.

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
