import { guardJson } from "@/lib/api";
import { chatSchema } from "@/lib/validation";
import { groqStream, isGroqConfigured, type GroqMessage } from "@/lib/groq";
import { agronomistSystemPrompt } from "@/lib/prompts";
import { jsonError } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const guard = await guardJson(request, chatSchema, { name: "chat", limitAnon: 0, limitUser: 40, windowSec: 600, requireAuth: true });
  if ("response" in guard) return guard.response;
  const { data: input, user, supabase } = guard;
  if (!user || !supabase) return jsonError("unauthorized", 401);
  if (!isGroqConfigured()) return jsonError("ai_not_configured", 503);

  // 1. Resolve or create the conversation (RLS guarantees ownership).
  let conversationId = input.conversationId;
  if (conversationId) {
    const { data, error } = await supabase.from("chat_conversations").select("id").eq("id", conversationId).maybeSingle();
    if (error || !data) return jsonError("not_found", 404);
  } else {
    const title = input.message.replace(/\s+/g, " ").slice(0, 60);
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id, title, locale: input.locale })
      .select("id")
      .single();
    if (error || !data) return jsonError("save_failed", 500);
    conversationId = data.id as string;
  }

  // 2. Store the user's message, then load recent history.
  const { error: insertError } = await supabase
    .from("chat_messages")
    .insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: input.message });
  if (insertError) return jsonError("save_failed", 500);

  const { data: historyRows } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(14);

  const history: GroqMessage[] = (historyRows ?? [])
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 4000) }));

  const messages: GroqMessage[] = [{ role: "system", content: agronomistSystemPrompt(input.locale) }, ...history];

  // 3. Start the stream; fail cleanly (JSON) if the provider rejects before the first token.
  const generator = groqStream(messages, { temperature: 0.4, maxTokens: 900 });
  let first: IteratorResult<string>;
  try {
    first = await generator.next();
  } catch {
    return jsonError("ai_unavailable", 502, { conversationId });
  }

  const encoder = new TextEncoder();
  const convId = conversationId;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      const push = (text: string) => {
        full += text;
        if (!cancelled) {
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            cancelled = true;
          }
        }
      };
      try {
        if (!first.done && first.value) push(first.value);
        if (!first.done) {
          for await (const delta of generator) {
            if (cancelled) break;
            push(delta);
          }
        }
      } catch {
        // Provider dropped mid-stream; keep whatever we have.
      }
      if (full.trim()) {
        await supabase.from("chat_messages").insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: full.slice(0, 8000) });
      }
      if (!cancelled) {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Conversation-Id": convId,
    },
  });
}
