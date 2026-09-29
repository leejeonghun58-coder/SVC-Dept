import { UploadPanel } from "@/features/data-management/upload-panel";
import { requireAdministrator } from "@/lib/auth/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DataManagementPage() {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("upload_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`업로드 작업을 불러오지 못했습니다: ${error.message}`);

  return (
    <section className="data-management">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Data upload</p>
          <h1>데이터 업로드</h1>
          <p>출고 또는 DV 원본 XLSX를 안전하게 등록합니다. 등록된 원본은 검증과 분석 단계에 사용됩니다.</p>
        </div>
      </header>
      <UploadPanel initialJobs={data} />
    </section>
  );
}
