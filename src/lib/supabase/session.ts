import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextResponse, NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Refreshes the Supabase auth session on every request and returns the current user.
 * `buildResponse` creates the downstream response carrying the per-request security headers.
 */
export async function updateSession(
  request: NextRequest,
  buildResponse: (request: NextRequest) => NextResponse,
) {
  let response = buildResponse(request);
  if (!isSupabaseConfigured()) return { response, user: null as null | { id: string } };

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = buildResponse(request);
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user: user ? { id: user.id } : null };
}
