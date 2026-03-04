import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return _ai;
}

export async function generateText(prompt: string): Promise<string> {
  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text ?? "";
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt + "\n\nJSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요.",
    config: {
      responseMimeType: "application/json",
    },
  });
  const text = response.text ?? "{}";
  return JSON.parse(text) as T;
}
