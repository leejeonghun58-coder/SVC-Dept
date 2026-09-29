import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_TEST_SECRET_KEY;
const password = `Ssda-${randomUUID()}-9!`;
const runId = randomUUID();
const activeEmail = `active-${runId}@example.invalid`;
const nonMemberEmail = `non-member-${runId}@example.invalid`;

let admin: SupabaseClient;
let activeUserId: string;
let nonMemberUserId: string;

test.beforeAll(async () => {
  if (!supabaseUrl || !secretKey) {
    throw new Error("Supabase E2E 환경변수가 필요합니다.");
  }

  admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const active = await admin.auth.admin.createUser({
    email: activeEmail,
    password,
    email_confirm: true,
  });
  if (active.error || !active.data.user) throw active.error;
  activeUserId = active.data.user.id;

  const nonMember = await admin.auth.admin.createUser({
    email: nonMemberEmail,
    password,
    email_confirm: true,
  });
  if (nonMember.error || !nonMember.data.user) throw nonMember.error;
  nonMemberUserId = nonMember.data.user.id;

  const membership = await admin.from("app_members").insert({
    user_id: activeUserId,
    email: activeEmail,
    display_name: "E2E 활성 사용자",
    role: "viewer",
    is_active: true,
  });
  if (membership.error) throw membership.error;
});

test.afterAll(async () => {
  if (!admin) return;
  if (activeUserId) await admin.auth.admin.deleteUser(activeUserId);
  if (nonMemberUserId) await admin.auth.admin.deleteUser(nonMemberUserId);
});

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("회사 이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
}

test("로그아웃 사용자를 로그인 화면으로 보낸다", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /서비스 자재 출고/ })).toBeVisible();
});

test("등록되지 않은 인증 사용자의 업무 화면 접근을 거부한다", async ({ page }) => {
  await login(page, nonMemberEmail);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "등록된 활성 사용자가 아닙니다." })).toBeVisible();
});

test("활성 초대 회원에게 보호된 앱 셸을 표시한다", async ({ page }) => {
  await login(page, activeEmail);

  await expect(page).toHaveURL(/\/dashboard$/);
  const navigation = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(navigation.getByRole("link", { name: "출고 대시보드" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "품목 분석" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "고객명·DV 분석" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "데이터 관리" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "매핑·품질" })).toBeVisible();
});

test("브라우저 문서와 번들에 Supabase 비밀키를 포함하지 않는다", async ({ page, request }) => {
  await page.goto("/login");
  expect(await page.content()).not.toContain(secretKey);

  const scripts = await page.locator("script[src]").evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLScriptElement).src),
  );
  for (const script of scripts) {
    const response = await request.get(script);
    expect(await response.text()).not.toContain(secretKey);
  }
});
