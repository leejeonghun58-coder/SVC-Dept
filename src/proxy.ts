import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { parsePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const protectedPrefixes = [
  "/dashboard",
  "/items",
  "/customers",
  "/data",
  "/mappings",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectWithAuthCookies(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
) {
  const target = NextResponse.redirect(new URL(pathname, request.url));
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
  return target;
}

export async function proxy(request: NextRequest) {
  const env = parsePublicEnv(process.env);
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [name, value] of Object.entries(headers)) {
            response.headers.set(name, value);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && isProtectedPath(pathname)) {
    return redirectWithAuthCookies(request, response, "/login");
  }
  if (isAuthenticated && pathname === "/login") {
    return redirectWithAuthCookies(request, response, "/dashboard");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
