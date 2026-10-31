import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Container, PageHeader } from "@/components/ui";
import { AgronomistChat, type ChatMessage, type ConversationSummary } from "@/components/features/AgronomistChat";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.agronomist.title };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { t } = await getI18n();
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/agronomist");

  const { c } = await searchParams;
  const supabase = await createClient();

  const { data: convRows } = await supabase
    .from("chat_conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  const conversations = (convRows ?? []) as ConversationSummary[];

  let activeId: string | null = null;
  let messages: ChatMessage[] = [];
  if (c && UUID.test(c) && conversations.some((x) => x.id === c)) {
    activeId = c;
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("conversation_id", c)
      .order("created_at", { ascending: true })
      .limit(200);
    messages = (data ?? []).map((m) => ({ id: m.id as string, role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) }));
  }

  return (
    <>
      <PageHeader title={t.agronomist.title} subtitle={t.agronomist.subtitle} />
      <Container className="py-6 sm:py-8">
        <AgronomistChat conversations={conversations} initialConversationId={activeId} initialMessages={messages} />
      </Container>
    </>
  );
}
