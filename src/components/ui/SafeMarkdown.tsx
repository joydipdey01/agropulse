import { Fragment, type ReactNode } from "react";

/** Renders a safe subset of Markdown (headings, lists, bold, italic, code) without any raw HTML. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) nodes.push(<strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) nodes.push(<code key={key} className="rounded bg-surface-2 px-1 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>);
    else nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function SafeMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      const idx = blocks.length;
      blocks.push(
        <p key={`p-${idx}`} className="mb-3 last:mb-0">
          {paragraph.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {inline(l, `p${idx}-${i}`)}
            </Fragment>
          ))}
        </p>,
      );
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const idx = blocks.length;
      const Tag = list.ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={`l-${idx}`} className={`mb-3 space-y-1.5 pl-5 last:mb-0 ${list.ordered ? "list-decimal" : "list-disc"}`}>
          {list.items.map((item, i) => (
            <li key={i}>{inline(item, `l${idx}-${i}`)}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const idx = blocks.length;
      blocks.push(
        <p key={`h-${idx}`} className="mb-2 mt-1 font-semibold text-fg">
          {inline(heading[2], `h${idx}`)}
        </p>,
      );
    } else if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      const content = (bullet ?? numbered)![1];
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(content);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return <div className="text-[15px] leading-relaxed">{blocks}</div>;
}
