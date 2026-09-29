import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_TEST_SECRET_KEY;
const runId = randomUUID();
const email = `upload-${runId}@example.invalid`;
const password = `Ssda-${randomUUID()}-9!`;
const fileName = `resume-${runId}.xlsx`;

let admin: SupabaseClient;
let userId: string;
let storagePath: string | undefined;

test.beforeAll(async () => {
  if (!supabaseUrl || !secretKey) {
    throw new Error("Supabase E2E 환경변수가 필요합니다.");
  }
  admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) throw created.error;
  userId = created.data.user.id;
  const membership = await admin.from("app_members").insert({
    user_id: userId,
    email,
    display_name: "E2E 업로드 사용자",
    role: "viewer",
    is_active: true,
  });
  if (membership.error) throw membership.error;
});

test.afterAll(async () => {
  if (!admin) return;
  if (storagePath) {
    await admin.storage.from("source-workbooks").remove([storagePath]);
  }
  if (userId) {
    await admin.from("upload_jobs").delete().eq("created_by", userId);
    await admin.from("app_members").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
});

test("끊긴 TUS 업로드를 재개해 작업과 객체를 정확히 하나씩 만든다", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("회사 이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/data");
  await expect(page.getByRole("heading", { name: "데이터 관리" })).toBeVisible();

  let interruptedPatchCount = 0;
  await page.route(
    /\/storage\/v1\/upload\/resumable(?:\/.*)?$/,
    async (route) => {
      if (route.request().method() === "PATCH" && interruptedPatchCount === 0) {
        interruptedPatchCount += 1;
        await route.abort("connectionfailed");
        return;
      }
      await route.continue();
    },
  );

  const fixture = Buffer.alloc(7 * 1024 * 1024, 0x41);
  fixture.set(Buffer.from("PK\u0003\u0004"), 0);
  await page.getByLabel("XLSX 원본 파일").setInputFiles({
    name: fileName,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: fixture,
  });
  await expect(page.getByTestId("selected-file")).toContainText(fileName);
  await page.getByRole("button", { name: "무결성 확인 후 업로드" }).click();

  await expect(page.getByText("업로드 완료 · 처리 대기")).toBeVisible({
    timeout: 45_000,
  });
  expect(interruptedPatchCount).toBe(1);

  const jobs = await admin
    .from("upload_jobs")
    .select("storage_path")
    .eq("created_by", userId)
    .eq("file_name", fileName);
  if (jobs.error) throw jobs.error;
  expect(jobs.data).toHaveLength(1);
  const uploadedPath = jobs.data[0]?.storage_path;
  if (!uploadedPath) throw new Error("업로드 작업의 Storage 경로가 없습니다.");
  storagePath = uploadedPath;

  const segments = uploadedPath.split("/");
  const objectName = segments.pop();
  const folder = segments.join("/");
  const objects = await admin.storage.from("source-workbooks").list(folder);
  if (objects.error) throw objects.error;
  expect(objects.data.filter((object) => object.name === objectName)).toHaveLength(1);
});
