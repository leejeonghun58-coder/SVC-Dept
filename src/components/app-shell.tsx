import Link from "next/link";
import { redirect } from "next/navigation";

import type { AppMember } from "@/lib/auth/require-member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const navigation = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/shipments", label: "부·소모품 출고현황" },
  { href: "/customers", label: "고객별 사용량" },
  { href: "/data", label: "데이터 업로드" },
];

async function signOut() {
  "use server";
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export function AppShell({
  member,
  children,
}: {
  member: AppMember;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SVC</span>
          <strong>SVC 고객별 자재출고·DV 분석</strong>
        </div>
        <nav aria-label="주요 메뉴">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className="member-panel">
          <span>{member.display_name}</span>
          <small>{member.email}</small>
          <form action={signOut}>
            <button type="submit" className="text-button">로그아웃</button>
          </form>
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}
