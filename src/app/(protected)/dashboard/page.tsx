import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: versions, error } = await supabase
    .from("data_versions")
    .select("kind, row_count, created_at")
    .eq("is_active", true);

  if (error) throw new Error(`대시보드 데이터를 불러오지 못했습니다: ${error.message}`);

  const shipment = versions?.find((version) => version.kind === "shipment");
  const dv = versions?.find((version) => version.kind === "dv");
  const hasData = Boolean(shipment || dv);

  return (
    <section className="analysis-page">
      <header className="page-heading">
        <p className="eyebrow">Overview</p>
        <h1>대시보드</h1>
        <p>활성화된 원본 데이터를 기준으로 SVC 출고와 고객 사용량을 한눈에 확인합니다.</p>
      </header>
      <div className="metric-grid">
        <article className="metric-card"><span>출고 원본</span><strong>{shipment ? `${shipment.row_count.toLocaleString()}건` : "미등록"}</strong></article>
        <article className="metric-card"><span>DV 원본</span><strong>{dv ? `${dv.row_count.toLocaleString()}건` : "미등록"}</strong></article>
        <article className="metric-card"><span>분석 기준</span><strong>고객번호 + 고객명</strong></article>
      </div>
      {!hasData ? (
        <div className="empty-state">
          <strong>아직 분석할 활성 데이터가 없습니다.</strong>
          <span>출고와 DV XLSX 원본을 업로드하면 팀별 출고 현황과 고객별 사용량 분석을 시작할 수 있습니다.</span>
          <Link className="inline-action" href="/data">데이터 업로드로 이동</Link>
        </div>
      ) : null}
    </section>
  );
}
