import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AppMember = Tables<"app_members">;

export interface MemberLookup {
  getAuthenticatedUser(): Promise<{ id: string } | null>;
  findMemberByUserId(userId: string): Promise<AppMember | null>;
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("로그인이 필요합니다.");
    this.name = "AuthenticationRequiredError";
  }
}

export class MembershipRequiredError extends Error {
  constructor() {
    super("초대된 사용자만 접근할 수 있습니다.");
    this.name = "MembershipRequiredError";
  }
}

export class InactiveMemberError extends Error {
  constructor() {
    super("비활성화된 사용자입니다.");
    this.name = "InactiveMemberError";
  }
}

async function createSupabaseLookup(): Promise<MemberLookup> {
  const supabase = await createServerSupabaseClient();

  return {
    async getAuthenticatedUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;
      return { id: data.user.id };
    },
    async findMemberByUserId(userId) {
      const { data, error } = await supabase
        .from("app_members")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw new Error(`회원 정보를 확인하지 못했습니다: ${error.message}`);
      }
      return data;
    },
  };
}

export async function requireMember(
  lookup?: MemberLookup,
): Promise<AppMember> {
  const source = lookup ?? (await createSupabaseLookup());
  const user = await source.getAuthenticatedUser();

  if (!user) throw new AuthenticationRequiredError();

  const member = await source.findMemberByUserId(user.id);
  if (!member) throw new MembershipRequiredError();
  if (!member.is_active) throw new InactiveMemberError();

  return member;
}
