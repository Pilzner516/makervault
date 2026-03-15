import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { GeminiIdentification } from '@/lib/types';

let _model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (_model) return _model;
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_GEMINI_API_KEY not set — cannot use Gemini');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  _model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  return _model;
}

function extractJSON(text: string): string {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Gemini response');
  }
  return jsonMatch[1] ?? jsonMatch[0];
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const result = await getModel().generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(extractJSON(text)) as T;
}

const IDENTIFY_PROMPT = `You are an expert electronics component identifier.
Analyze this image and identify the electronic component shown.

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
  const result = await getModel().generateContent([
    IDENTIFY_PROMPT,
    { inlineData: { data: base64Image, mimeType } },
  ]);
  const text = result.response.text();
  return JSON.parse(extractJSON(text)) as GeminiIdentification;
}

export async function identifyBulkParts(
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<GeminiIdentification[]> {
  const result = await getModel().generateContent([
    BULK_IDENTIFY_PROMPT,
    { inlineData: { data: base64Image, mimeType } },
  ]);
  const text = result.response.text();
  const jsonStr = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\[[\s\S]*\]/);
  if (!jsonStr) throw new Error('No JSON array found in Gemini response');
  return JSON.parse(jsonStr[1] ?? jsonStr[0]) as GeminiIdentification[];
}
