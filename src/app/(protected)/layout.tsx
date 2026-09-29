import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import {
  type AppMember,
  AuthenticationRequiredError,
  InactiveMemberError,
  MembershipRequiredError,
  requireMember,
} from "@/lib/auth/require-member";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let member: AppMember | null = null;
  let accessDenied = false;

  try {
    member = await requireMember();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    if (
      error instanceof MembershipRequiredError ||
      error instanceof InactiveMemberError
    ) {
      accessDenied = true;
    } else {
      throw error;
    }
  }

  if (accessDenied || !member) {
    return (
      <main className="access-denied">
        <div>
          <p className="eyebrow">접근 제한</p>
          <h1>등록된 활성 사용자가 아닙니다.</h1>
          <p>SSDA 관리자에게 계정 초대 또는 활성화를 요청해 주세요.</p>
        </div>
      </main>
    );
  }

  return <AppShell member={member}>{children}</AppShell>;
}
