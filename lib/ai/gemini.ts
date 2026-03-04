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
    contents: prompt + "\n\nJSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요. 문자열 값 안의 줄바꿈은 반드시 \\n으로 이스케이프하세요.",
    config: {
      responseMimeType: "application/json",
    },
  });
  let text = response.text ?? "{}";

  // Gemini가 JSON 문자열 내부의 줄바꿈을 이스케이프하지 않는 경우 보정
  text = text.replace(/(?<=:\s*"(?:[^"\\]|\\.)*)(\r?\n)(?=[^"]*")/g, "\\n");

  try {
    return JSON.parse(text) as T;
  } catch {
    // 정규식 보정이 불충분할 경우, 문자열 값 내 raw 개행을 일괄 치환
    const sanitized = text.replace(
      /"(?:[^"\\]|\\.)*"/g,
      (match) => match.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t"),
    );
    return JSON.parse(sanitized) as T;
  }
}
