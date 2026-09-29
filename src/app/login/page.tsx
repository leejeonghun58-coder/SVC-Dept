import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

async function signIn(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=invalid");

  redirect("/dashboard");
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const message =
    error === "missing"
      ? "이메일과 비밀번호를 입력해 주세요."
      : error === "invalid"
        ? "로그인 정보를 확인해 주세요."
        : null;

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">SSDA</p>
        <h1 id="login-title">서비스 자재 출고·DV 통합분석 시스템</h1>
        <p className="login-description">
          회사에서 초대한 계정으로 로그인해 주세요.
        </p>
        {message ? <p className="form-error" role="alert">{message}</p> : null}
        <form action={signIn} className="login-form">
          <label htmlFor="email">회사 이메일</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <button type="submit">로그인</button>
        </form>
        <p className="login-note">신규 가입은 관리자 초대를 통해서만 가능합니다.</p>
      </section>
    </main>
  );
}
