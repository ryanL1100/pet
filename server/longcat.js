const defaultModel = process.env.LONGCAT_MODEL ?? "LongCat-2.0";
const defaultBaseUrl = "https://api.longcat.chat/openai";
const defaultTimeoutMs = Number(process.env.LONGCAT_TIMEOUT_MS ?? 20000);
const defaultThinking = process.env.LONGCAT_THINKING ?? "disabled";

export function isLongCatConfigured() {
  return Boolean(process.env.LONGCAT_API_KEY);
}

export function getLongCatStatus() {
  return {
    configured: isLongCatConfigured(),
    model: defaultModel,
    baseUrl: redactUrl(process.env.LONGCAT_BASE_URL ?? defaultBaseUrl),
  };
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return "configured";
  }
}

function normalizeEndpoint(baseUrl) {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/v1/chat/completions")) return trimmed;
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function extractContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("LongCat response did not include message content");
  }
  return content.trim();
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response is not JSON");
    return JSON.parse(match[0]);
  }
}

async function callLongCat(messages, { temperature = 0.2, maxTokens = 900 } = {}) {
  if (!isLongCatConfigured()) {
    throw new Error("LongCat is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), defaultTimeoutMs);

  try {
    const response = await fetch(normalizeEndpoint(process.env.LONGCAT_BASE_URL ?? defaultBaseUrl), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.LONGCAT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: defaultModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        thinking: { type: defaultThinking },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? `LongCat request failed with ${response.status}`);
    }

    return extractContent(payload);
  } finally {
    clearTimeout(timeout);
  }
}

export async function callLongCatJson(messages, options) {
  const content = await callLongCat(messages, options);
  return parseJsonObject(content);
}
