import Link from "next/link";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none">
      <rect width="40" height="40" rx="10" fill="var(--primary)" />
      <path d="M20 31V18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 21c0-4.4-3.2-7.4-8-7.4 0 4.6 3 7.4 8 7.4Z" fill="#fff" fillOpacity="0.95" />
      <path d="M20 17.5c0-4.6 3.3-7.6 8.2-7.6 0 4.7-3.1 7.6-8.2 7.6Z" fill="#fff" fillOpacity="0.8" />
      <path d="M12 31h16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

export function Logo({ name }: { name: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={name}>
      <LogoMark />
      <span className="text-[17px] font-bold tracking-tight text-fg">{name}</span>
    </Link>
  );
}
