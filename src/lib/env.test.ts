import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "./env";

describe("environment contract", () => {
  it("rejects a server environment without the service-role secret", () => {
    expect(() =>
      parseServerEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("returns only browser-safe Supabase configuration", () => {
    const parsed = parsePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      SUPABASE_SERVICE_ROLE_KEY: "must-not-leak",
    });

    expect(parsed).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });
    expect("SUPABASE_SERVICE_ROLE_KEY" in parsed).toBe(false);
  });
});
