import { NextResponse } from "next/server";
import { recognizeHandwriting } from "@/lib/ai/gemini";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGES = 2;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per image
const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB total

interface ImagePayload {
  data: string;
  mimeType: string;
}

function isValidBase64(s: string): boolean {
  if (s.length === 0) return false;
  try {
    return btoa(atob(s)) === s;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const { ok } = await checkRateLimit(request, { scope: "essay:ocr" });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 잘못되었습니다" },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "요청 본문은 객체여야 합니다" },
      { status: 400 }
    );
  }

  const { images } = body as { images?: unknown };

  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json(
      { error: "이미지를 1장 이상 첨부해 주세요." },
      { status: 400 }
    );
  }

  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다.` },
      { status: 400 }
    );
  }

  const validated: ImagePayload[] = [];
  let totalBytes = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (
      typeof img !== "object" ||
      img === null ||
      typeof (img as ImagePayload).data !== "string" ||
      typeof (img as ImagePayload).mimeType !== "string"
    ) {
      return NextResponse.json(
        { error: `이미지 ${i + 1}번의 형식이 잘못되었습니다.` },
        { status: 400 }
      );
    }

    const { data, mimeType } = img as ImagePayload;

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `이미지 ${i + 1}번: JPEG, PNG, WebP 형식만 지원합니다.` },
        { status: 400 }
      );
    }

    const byteLength = Math.ceil((data.length * 3) / 4);
    if (byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `이미지 ${i + 1}번: 5MB를 초과합니다.` },
        { status: 400 }
      );
    }

    totalBytes += byteLength;
    validated.push({ data, mimeType });
  }

  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: "이미지 총 크기가 10MB를 초과합니다." },
      { status: 400 }
    );
  }

  try {
    const text = await recognizeHandwriting(validated);
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "손글씨 인식에 실패했습니다. 이미지를 확인 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
