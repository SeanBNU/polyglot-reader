import { NextResponse } from "next/server";

const DEEPL_LANG_MAP: Record<string, string> = {
  es: "ES",
  de: "DE",
  fr: "FR",
};

interface Body {
  text?: string;
  sourceLang?: string;
  targetLang?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const sourceLang = (body.sourceLang ?? "").toLowerCase();
  const targetLang = (body.targetLang ?? "en").toUpperCase();

  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      translation: `[no DEEPL_API_KEY set] ${text}`,
      provider: "stub",
      warning:
        "Add DEEPL_API_KEY in Vercel env vars to enable real translations.",
    });
  }

  const isFree = apiKey.endsWith(":fx");
  const url = isFree
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const params = new URLSearchParams();
  params.append("text", text);
  params.append("target_lang", targetLang);
  if (sourceLang && DEEPL_LANG_MAP[sourceLang]) {
    params.append("source_lang", DEEPL_LANG_MAP[sourceLang]);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `DeepL error ${res.status}: ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      translations: { text: string; detected_source_language: string }[];
    };
    const first = data.translations?.[0];
    return NextResponse.json({
      translation: first?.text ?? "",
      detectedSource: first?.detected_source_language ?? null,
      provider: "deepl",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Translate failed: ${message}` },
      { status: 500 }
    );
  }
}
