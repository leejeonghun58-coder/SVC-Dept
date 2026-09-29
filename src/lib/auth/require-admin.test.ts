import { describe, expect, it } from "vitest";

import { AdministratorRequiredError, assertAdministrator } from "./require-admin";
import type { AppMember } from "./require-member";

function member(role: AppMember["role"]): AppMember {
  return {
    id: 1,
    public_id: "00000000-0000-4000-8000-000000000001",
    user_id: "00000000-0000-4000-8000-000000000002",
    email: "member@example.com",
    display_name: "일반 사용자",
    role,
    is_active: true,
    invited_by: null,
    created_at: "2026-09-29T00:00:00.000Z",
    updated_at: "2026-09-29T00:00:00.000Z",
  };
}

describe("assertAdministrator", () => {
  it("permits an administrator", () => {
    expect(assertAdministrator(member("admin"))).toEqual(member("admin"));
  });

  it.each(["operator", "viewer"] as const)("rejects %s members", (role) => {
    expect(() => assertAdministrator(member(role))).toThrow(AdministratorRequiredError);
  });
});
