import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; notice?: string; mode?: string }>;
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

async function signUp(formData: FormData) {
  "use server";

  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!displayName || !email || !password) redirect("/login?mode=signup&error=missing");
  if (password.length < 8) redirect("/login?mode=signup&error=password");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) redirect("/login?mode=signup&error=signup");

  redirect("/login?notice=signup");
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, notice, mode } = await searchParams;
  const isSignUp = mode === "signup";
  const message =
    error === "missing"
      ? "이메일과 비밀번호를 입력해 주세요."
      : error === "invalid"
        ? "로그인 정보를 확인해 주세요."
        : error === "password"
          ? "비밀번호는 8자 이상으로 입력해 주세요."
          : error === "signup"
            ? "회원가입을 완료하지 못했습니다. 이메일 또는 가입 설정을 확인해 주세요."
        : null;

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="eyebrow">SVC</p>
        <h1 id="login-title">SVC 고객별 자재출고·DV 분석</h1>
        <p className="login-description">
          월도별 자재 출고와 고객 사용량(DV)을 분석합니다.
        </p>
        {message ? <p className="form-error" role="alert">{message}</p> : null}
        {notice === "signup" ? <p className="form-success" role="status">회원가입이 완료되었습니다. 이메일 인증이 설정된 경우 인증 후 로그인해 주세요.</p> : null}
        <form action={isSignUp ? signUp : signIn} className="login-form">
          {isSignUp ? <><label htmlFor="displayName">이름</label><input id="displayName" name="displayName" autoComplete="name" required /></> : null}
          <label htmlFor="email">회사 이메일</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
          />
          <button type="submit">{isSignUp ? "회원가입" : "로그인"}</button>
        </form>
        {isSignUp ? <p className="login-note">가입한 계정은 일반 사용자 권한으로 대시보드와 분석 화면을 볼 수 있습니다. 데이터 업로드는 관리자만 가능합니다.</p> : <p className="login-note">처음이신가요? <a href="/login?mode=signup">회원가입</a></p>}
      </section>
    </main>
  );
}
