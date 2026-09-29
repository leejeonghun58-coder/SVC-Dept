import { UploadPanel } from "@/features/data-management/upload-panel";
import { requireMember } from "@/lib/auth/require-member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DataManagementPage() {
  await requireMember();
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
          <p className="eyebrow">Data management</p>
          <h1>데이터 관리</h1>
          <p>출고 또는 DV 원본 XLSX를 검증하고 재개 가능한 방식으로 업로드합니다.</p>
        </div>
      </header>
      <UploadPanel initialJobs={data} />
    </section>
  );
}
