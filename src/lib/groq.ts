import "server-only";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class GroqError extends Error {
  constructor(public status: number) {
    super(`Groq request failed with status ${status}`);
  }
}

export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY;
  return Boolean(key && key.length > 10 && !key.includes("your-"));
}

function model(): string {
  return process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
}

interface Options {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

async function call(messages: GroqMessage[], stream: boolean, opts: Options) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: model(),
      messages,
      stream,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 900,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    cache: "no-store",
  });
  if (!res.ok) throw new GroqError(res.status);
  return res;
}

/** One-shot completion. Returns plain text. */
export async function groqComplete(messages: GroqMessage[], opts: Options = {}): Promise<string> {
  const res = await call(messages, false, opts);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Streaming completion. Yields text deltas as they arrive. */
export async function* groqStream(messages: GroqMessage[], opts: Options = {}): AsyncGenerator<string> {
  const res = await call(messages, true, { timeoutMs: 60_000, ...opts });
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // ignore partial / keep-alive lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
