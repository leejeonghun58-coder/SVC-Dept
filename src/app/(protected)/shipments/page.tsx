import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function numberValue(value: number | null) {
  return value === null ? 0 : Number(value);
}

function displayNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value);
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: version, error: versionError } = await supabase
    .from("data_versions")
    .select("id, row_count")
    .eq("kind", "shipment")
    .eq("is_active", true)
    .maybeSingle();
  if (versionError) throw new Error(`출고 버전을 불러오지 못했습니다: ${versionError.message}`);

  const { data: records, error: recordError } = version
    ? await supabase
      .from("shipment_records")
      .select("svc_team, quantity, exact_amount, total_cost")
      .eq("data_version_id", version.id)
      .order("billing_month", { ascending: false })
      .limit(1000)
    : { data: [], error: null };
  if (recordError) throw new Error(`출고 현황을 불러오지 못했습니다: ${recordError.message}`);

  const byTeam = new Map<string, { rows: number; quantity: number; amount: number; cost: number }>();
  for (const record of records ?? []) {
    const name = record.svc_team?.trim() || "미지정 SVC팀";
    const summary = byTeam.get(name) ?? { rows: 0, quantity: 0, amount: 0, cost: 0 };
    summary.rows += 1;
    summary.quantity += numberValue(record.quantity);
    summary.amount += numberValue(record.exact_amount);
    summary.cost += numberValue(record.total_cost);
    byTeam.set(name, summary);
  }
  const teamNames = [...byTeam.keys()].sort((left, right) => left.localeCompare(right, "ko-KR"));
  const displayedTeams = team ? teamNames.filter((name) => name === team) : teamNames;

  return (
    <section className="analysis-page">
      <header className="page-heading">
        <p className="eyebrow">Shipment status</p>
        <h1>부·소모품 출고현황</h1>
        <p>SVC팀별 출고 수량과 금액을 확인합니다. 고객별 출고와 DV 비교는 고객별 사용량 메뉴에서 이어집니다.</p>
      </header>
      {!version ? (
        <div className="empty-state">
          <strong>출고 원본이 아직 활성화되지 않았습니다.</strong>
          <span>부품·소모품 출고 XLSX를 업로드하면 이 화면에서 SVC팀별 현황을 볼 수 있습니다.</span>
          <Link className="inline-action" href="/data">출고 파일 업로드</Link>
        </div>
      ) : (
        <>
          <form className="filter-bar" action="/shipments">
            <label htmlFor="team">SVC팀</label>
            <select id="team" name="team" defaultValue={team ?? ""}>
              <option value="">전체 팀</option>
              {teamNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <button type="submit">적용</button>
          </form>
          <p className="data-note">현재 활성 출고 원본 {version.row_count.toLocaleString()}건 중 화면 조회 범위의 팀별 집계입니다.</p>
          <div className="summary-table-wrap">
            <table className="summary-table">
              <thead><tr><th>SVC팀</th><th>출고 행</th><th>출고 수량</th><th>출고 금액</th><th>출고 원가</th></tr></thead>
              <tbody>{displayedTeams.map((name) => {
                const summary = byTeam.get(name)!;
                return <tr key={name}><td>{name}</td><td>{displayNumber(summary.rows)}</td><td>{displayNumber(summary.quantity)}</td><td>{displayNumber(summary.amount)}원</td><td>{displayNumber(summary.cost)}원</td></tr>;
              })}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
