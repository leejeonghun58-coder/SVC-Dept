import { describe, expect, it } from "vitest";

import type { Tables } from "@/types/database";

import {
  AuthenticationRequiredError,
  InactiveMemberError,
  MembershipRequiredError,
  requireMember,
  type MemberLookup,
} from "./require-member";

type AppMember = Tables<"app_members">;

const activeMember: AppMember = {
  created_at: "2026-09-29T00:00:00.000Z",
  display_name: "SSDA 관리자",
  email: "admin@example.com",
  id: 1,
  invited_by: null,
  is_active: true,
  public_id: "10000000-0000-0000-0000-000000000001",
  role: "admin",
  updated_at: "2026-09-29T00:00:00.000Z",
  user_id: "20000000-0000-0000-0000-000000000001",
};

function lookup(overrides: Partial<MemberLookup> = {}): MemberLookup {
  return {
    getAuthenticatedUser: async () => ({ id: activeMember.user_id }),
    findMemberByUserId: async () => activeMember,
    ...overrides,
  };
}

describe("requireMember", () => {
  it("rejects a request with no server-validated user", async () => {
    const operation = requireMember(
      lookup({ getAuthenticatedUser: async () => null }),
    );

    await expect(operation).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it("rejects an authenticated user without an invitation record", async () => {
    const operation = requireMember(
      lookup({ findMemberByUserId: async () => null }),
    );

    await expect(operation).rejects.toBeInstanceOf(MembershipRequiredError);
  });

  it("rejects an invited member whose access is inactive", async () => {
    const operation = requireMember(
      lookup({
        findMemberByUserId: async () => ({
          ...activeMember,
          is_active: false,
        }),
      }),
    );

    await expect(operation).rejects.toBeInstanceOf(InactiveMemberError);
  });

  it("returns the active invited member", async () => {
    await expect(requireMember(lookup())).resolves.toEqual(activeMember);
  });
});
