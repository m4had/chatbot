const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || "https://libretranslate.com";
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";

interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = "auto"
): Promise<TranslationResult> {
  try {
    const body: Record<string, string> = {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: "text",
    };
    if (LIBRETRANSLATE_API_KEY) body.api_key = LIBRETRANSLATE_API_KEY;

    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      translatedText: data.translatedText,
      detectedLanguage: data.detectedLanguage?.language,
    };
  } catch (error) {
    // Fallback: return original text with error note
    console.error("Translation failed:", error);
    return {
      translatedText: text,
      detectedLanguage: undefined,
    };
  }
}

export async function detectLanguage(text: string): Promise<string> {
  try {
    const response = await fetch(`${LIBRETRANSLATE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text }),
    });

    if (!response.ok) return "en";
    const data = await response.json();
    return data[0]?.language || "en";
  } catch {
    return "en";
  }
}

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
  pt: "Portuguese", ru: "Russian", zh: "Chinese", ja: "Japanese", ko: "Korean",
  ar: "Arabic", hi: "Hindi", nl: "Dutch", pl: "Polish", tr: "Turkish",
  sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish", el: "Greek",
  he: "Hebrew", th: "Thai", vi: "Vietnamese", id: "Indonesian", ms: "Malay",
  uk: "Ukrainian", cs: "Czech", ro: "Romanian", hu: "Hungarian",
};
