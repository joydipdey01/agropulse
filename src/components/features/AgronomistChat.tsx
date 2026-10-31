"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, History, MessageSquare, Mic, Plus, Send, Square, Trash2, User, X } from "lucide-react";
import { Alert, Button } from "@/components/ui";
import { SafeMarkdown } from "@/components/ui/SafeMarkdown";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

const MAX_LEN = 1500;
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()));

export function AgronomistChat({
  conversations: initialConversations,
  initialConversationId,
  initialMessages,
}: {
  conversations: ConversationSummary[];
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
}) {
  const { t, locale } = useI18n();
  const [conversations, setConversations] = useState(initialConversations);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const conversationIdRef = useRef<string | null>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceChatActive, setVoiceChatActive] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startingRecorderRef = useRef(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceChatActiveRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth", block: "end" });
  }, [messages, streaming]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    setVoiceSupported(Boolean(navigator.mediaDevices && window.MediaRecorder));
  }, []);

  useEffect(() => () => {
    voiceChatActiveRef.current = false;
    abortRef.current?.abort();
    if (silenceTimerRef.current !== null) window.clearInterval(silenceTimerRef.current);
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
    speechAudioRef.current?.pause();
  }, []);

  const reset = useCallback(() => {
    voiceChatActiveRef.current = false;
    setVoiceChatActive(false);
    setListening(false);
    if (silenceTimerRef.current !== null) window.clearInterval(silenceTimerRef.current);
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    recorderRef.current = null;
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    if (speechAudioRef.current?.src.startsWith("blob:")) URL.revokeObjectURL(speechAudioRef.current.src);
    speechAudioRef.current?.pause();
    speechAudioRef.current = null;
    abortRef.current?.abort();
    conversationIdRef.current = null;
    setConversationId(null);
    setMessages([]);
    setError(null);
    setDrawer(false);
    window.history.replaceState(null, "", "/agronomist");
  }, []);

  const openConversation = async (id: string) => {
    if (streaming || id === conversationId) {
      setDrawer(false);
      return;
    }
    setDrawer(false);
    setError(null);
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (loadError) {
      setError(t.common.genericError);
      return;
    }
    conversationIdRef.current = id;
    setConversationId(id);
    setMessages((data ?? []).map((m) => ({ id: m.id as string, role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) })));
    window.history.replaceState(null, "", `/agronomist?c=${id}`);
  };

  const removeConversation = async (id: string) => {
    if (!window.confirm(t.common.confirmDelete)) return;
    const { error: delError } = await createClient().from("chat_conversations").delete().eq("id", id);
    if (delError) {
      setError(t.common.genericError);
      return;
    }
    setConversations((list) => list.filter((c) => c.id !== id));
    if (id === conversationId) reset();
  };

  const send = async (text: string, speakReply = false) => {
    const message = text.trim();
    if (!message || streaming) return;
    if (message.length > MAX_LEN) {
      setError(t.agronomist.tooLong);
      return;
    }
    setError(null);
    setInput("");
    const assistantId = uid();
    setMessages((m) => [...m, { id: uid(), role: "user", content: message }, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let receivedAny = false;
    let audioStarted = false;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationIdRef.current ?? undefined, message, locale }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        let code = "";
        try {
          code = ((await res.json()) as { error?: string }).error ?? "";
        } catch {
          // ignore
        }
        setMessages((m) => m.filter((x) => x.id !== assistantId));
        if (res.status === 429) setError(t.common.rateLimited);
        else if (code === "ai_not_configured") setError(t.common.aiNotConfigured);
        else if (res.status === 401) setError(t.auth.invalidCredentials);
        else setError(t.common.aiUnavailable);
        return;
      }

      const newId = res.headers.get("X-Conversation-Id");
      if (newId && newId !== conversationIdRef.current) {
        conversationIdRef.current = newId;
        setConversationId(newId);
        window.history.replaceState(null, "", `/agronomist?c=${newId}`);
        setConversations((list) => [{ id: newId, title: message.replace(/\s+/g, " ").slice(0, 60), updated_at: new Date().toISOString() }, ...list.filter((c) => c.id !== newId)]);
      } else if (newId) {
        setConversations((list) => {
          const found = list.find((c) => c.id === newId);
          return found ? [{ ...found, updated_at: new Date().toISOString() }, ...list.filter((c) => c.id !== newId)] : list;
        });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedAny = true;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: snapshot } : x)));
      }
      if (speakReply && acc.trim() && voiceChatActiveRef.current) {
        const speechRes = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: acc.slice(0, 3000), locale }),
          signal: controller.signal,
        });
        if (!speechRes.ok) {
          setError(t.agronomist.voiceOutputFailed);
        } else {
          const audioUrl = URL.createObjectURL(await speechRes.blob());
          const audio = new Audio(audioUrl);
          speechAudioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            speechAudioRef.current = null;
            if (voiceChatActiveRef.current) startListening();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            speechAudioRef.current = null;
            setError(t.agronomist.voiceOutputFailed);
            if (voiceChatActiveRef.current) startListening();
          };
          await audio.play();
          audioStarted = true;
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(t.common.networkError);
        if (!receivedAny) setMessages((m) => m.filter((x) => x.id !== assistantId));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      if (speakReply && !audioStarted && voiceChatActiveRef.current) startListening();
    }
  };

  const transcribeRecording = async (blob: Blob) => {
    if (!voiceChatActiveRef.current || !blob.size) return;
    setVoiceProcessing(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, blob.type.includes("mp4") ? "voice.mp4" : "voice.webm");
      form.append("locale", locale);
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const payload = (await response.json().catch(() => ({}))) as { transcript?: string; error?: string };
      if (!response.ok) {
        setError(response.status === 429 ? t.common.rateLimited : payload.error === "speech_not_configured" ? t.agronomist.voiceNotConfigured : t.agronomist.voiceFailed);
        return;
      }
      const transcript = payload.transcript?.trim();
      if (!transcript) {
        setError(t.agronomist.voiceNoSpeech);
        return;
      }
      setInput(transcript);
      setVoiceProcessing(false);
      await send(transcript, true);
    } catch {
      setError(t.common.networkError);
    } finally {
      setVoiceProcessing(false);
      if (voiceChatActiveRef.current && !speechAudioRef.current) void startListening();
    }
  };

  const startListening = async () => {
    if (!voiceChatActiveRef.current || recorderRef.current || startingRecorderRef.current) return;
    startingRecorderRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startingRecorderRef.current = false;
      if (!voiceChatActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorderRef.current = recorder;
      audioStreamRef.current = stream;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        if (silenceTimerRef.current !== null) window.clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
        recorderRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
        void audioContextRef.current?.close();
        audioContextRef.current = null;
        setListening(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (voiceChatActiveRef.current && blob.size) void transcribeRecording(blob);
      };
      recorder.start(250);
      setListening(true);
      const context = new AudioContext();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let heardSpeech = false;
      let lastVoiceAt = Date.now();
      const startedAt = Date.now();
      silenceTimerRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
        if (rms > 0.025) {
          heardSpeech = true;
          lastVoiceAt = Date.now();
        }
        if ((heardSpeech && Date.now() - lastVoiceAt > 1400) || Date.now() - startedAt > 30000) {
          if (recorder.state !== "inactive") recorder.stop();
        }
      }, 120);
    } catch {
      startingRecorderRef.current = false;
      voiceChatActiveRef.current = false;
      setVoiceChatActive(false);
      setListening(false);
      setError(t.agronomist.voiceFailed);
    }
  };

  const stopVoiceChat = () => {
    voiceChatActiveRef.current = false;
    setVoiceChatActive(false);
    setListening(false);
    setVoiceProcessing(false);
    if (silenceTimerRef.current !== null) window.clearInterval(silenceTimerRef.current);
    silenceTimerRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder?.state !== "inactive") recorder?.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    speechAudioRef.current?.pause();
    speechAudioRef.current = null;
    abortRef.current?.abort();
  };

  const toggleVoice = () => {
    if (voiceChatActiveRef.current) {
      stopVoiceChat();
      return;
    }
    voiceChatActiveRef.current = true;
    setVoiceChatActive(true);
    void startListening();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Do not submit while an IME (Bengali/Hindi phonetic keyboards) is composing text.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 p-4">
        <h2 className="text-sm font-semibold">{t.agronomist.history}</h2>
        <Button size="sm" variant="secondary" onClick={reset}>
          <Plus className="h-4 w-4" aria-hidden />
          {t.agronomist.newChat}
        </Button>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 && <li className="px-3 py-6 text-center text-sm text-subtle">{t.agronomist.noHistory}</li>}
        {conversations.map((c) => (
          <li key={c.id} className="group flex items-center gap-1">
            <button
              type="button"
              onClick={() => openConversation(c.id)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                c.id === conversationId ? "bg-primary-soft font-medium text-link" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{c.title || t.agronomist.untitled}</span>
            </button>
            <button
              type="button"
              onClick={() => removeConversation(c.id)}
              aria-label={t.agronomist.deleteChat}
              title={t.agronomist.deleteChat}
              className="rounded-lg p-2 text-subtle opacity-100 transition-colors hover:bg-danger-soft hover:text-danger lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100dvh-9.5rem)] min-h-[520px] overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-border bg-surface-2/40 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="absolute inset-0 z-20 flex lg:hidden">
          <div className="animate-slide w-72 max-w-[85%] border-r border-border bg-surface shadow-pop">
            <div className="flex justify-end px-2 pt-2">
              <button type="button" onClick={() => setDrawer(false)} aria-label={t.agronomist.closeHistory} className="rounded-lg p-2 text-muted hover:bg-surface-2">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {sidebar}
          </div>
          <button type="button" className="animate-in flex-1 bg-black/40" onClick={() => setDrawer(false)} aria-label={t.agronomist.closeHistory} />
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col" aria-label={t.agronomist.title}>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 lg:hidden">
          <Button size="sm" variant="ghost" onClick={() => setDrawer(true)}>
            <History className="h-4 w-4" aria-hidden />
            {t.agronomist.openHistory}
          </Button>
          <Button size="sm" variant="secondary" onClick={reset}>
            <Plus className="h-4 w-4" aria-hidden />
            {t.agronomist.newChat}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite">
          {messages.length === 0 ? (
            <div className="animate-page mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-fg">
                <Bot className="h-7 w-7" aria-hidden />
              </span>
              <h2 className="mt-5 text-2xl font-bold">{t.agronomist.welcomeTitle}</h2>
              <p className="mt-2 text-muted">{t.agronomist.welcomeText}</p>
              <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                {t.agronomist.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="lift rounded-xl border border-border bg-surface p-4 text-left text-sm text-muted hover:text-fg"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
            <ul className="space-y-6">
              {messages.map((m) => (
                <li key={m.id} className={cn("animate-in flex gap-3", m.role === "user" && "flex-row-reverse")}>
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-accent-soft text-accent" : "bg-primary text-primary-fg")}>
                    {m.role === "user" ? <User className="h-4 w-4" aria-hidden /> : <Bot className="h-4 w-4" aria-hidden />}
                  </span>
                  <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", m.role === "user" ? "bg-primary text-primary-fg" : "border border-border bg-surface-2/60 text-fg")}>
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap break-words text-[15px]">{m.content}</p>
                    ) : m.content ? (
                      <SafeMarkdown text={m.content} />
                    ) : (
                      <p className="animate-pulse-soft text-sm text-muted">{t.agronomist.thinking}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border bg-surface p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            {error && (
              <Alert tone="danger" className="mb-3">
                {error}
              </Alert>
            )}
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                {t.agronomist.placeholder}
              </label>
              <textarea
                id="chat-input"
                ref={textareaRef}
                value={input}
                rows={1}
                maxLength={MAX_LEN + 200}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t.agronomist.placeholder}
                className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-2.5 text-[15px] text-fg placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
              <Button
                type="button"
                variant={voiceChatActive ? "danger" : "secondary"}
                className="h-11 px-3"
                onClick={toggleVoice}
                disabled={voiceSupported !== true || (streaming && !voiceChatActive)}
                aria-label={voiceChatActive ? t.agronomist.endVoiceChat : t.agronomist.voiceInput}
                title={voiceChatActive ? t.agronomist.endVoiceChat : t.agronomist.voiceInput}
              >
                <Mic className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">
                  {voiceProcessing ? t.agronomist.voiceProcessing : listening ? t.agronomist.listening : voiceChatActive ? t.agronomist.endVoiceChat : t.agronomist.voice}
                </span>
              </Button>
              {streaming ? (
                <Button type="button" variant="secondary" className="h-11" onClick={() => abortRef.current?.abort()} aria-label={t.agronomist.stop}>
                  <Square className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t.agronomist.stop}</span>
                </Button>
              ) : (
                <Button type="button" className="h-11" onClick={() => send(input)} disabled={!input.trim()} aria-label={t.agronomist.send}>
                  <Send className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t.agronomist.send}</span>
                </Button>
              )}
            </div>
            {voiceSupported === false && <p className="mt-2 text-center text-xs text-subtle">{t.agronomist.voiceUnsupported}</p>}
            <p className="mt-2 text-center text-xs text-subtle">{t.agronomist.notice}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
