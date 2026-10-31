// Public values only. NEXT_PUBLIC_* variables must be referenced literally so Next.js can inline them.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return (
    /^https:\/\/[^\s]+$/.test(SUPABASE_URL) &&
    !SUPABASE_URL.includes("your-") &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes("your-")
  );
}
