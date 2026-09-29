import Link from "next/link";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function displayNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value);
}

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: version, error: versionError } = await supabase
    .from("data_versions")
    .select("id, row_count")
    .eq("kind", "dv")
    .eq("is_active", true)
    .maybeSingle();
  if (versionError) throw new Error(`DV 버전을 불러오지 못했습니다: ${versionError.message}`);

  const { data: records, error: recordError } = version
    ? await supabase
      .from("dv_records")
      .select("customer_no, customer_name, total_dv, total_revenue")
      .eq("data_version_id", version.id)
      .order("customer_name")
      .limit(1000)
    : { data: [], error: null };
  if (recordError) throw new Error(`고객별 사용량을 불러오지 못했습니다: ${recordError.message}`);

  const byCustomer = new Map<string, { customerNo: string; customerName: string; dv: number; revenue: number }>();
  for (const record of records ?? []) {
    const key = `${record.customer_no}\u001f${record.customer_name}`;
    const summary = byCustomer.get(key) ?? { customerNo: record.customer_no, customerName: record.customer_name, dv: 0, revenue: 0 };
    summary.dv += Number(record.total_dv);
    summary.revenue += Number(record.total_revenue ?? 0);
    byCustomer.set(key, summary);
  }
  const customers = [...byCustomer.values()].sort((left, right) => right.dv - left.dv);

  return (
    <section className="analysis-page">
      <header className="page-heading">
        <p className="eyebrow">Customer usage</p>
        <h1>고객별 사용량</h1>
        <p>고객번호와 고객명이 일치하는 조합을 기준으로 고객 DV 사용량을 확인합니다.</p>
      </header>
      {!version ? (
        <div className="empty-state">
          <strong>DV 원본이 아직 활성화되지 않았습니다.</strong>
          <span>DV XLSX를 업로드하면 고객별 사용량과 출고 대비 분석을 시작할 수 있습니다.</span>
          <Link className="inline-action" href="/data">DV 파일 업로드</Link>
        </div>
      ) : (
        <>
          <p className="data-note">현재 활성 DV 원본 {version.row_count.toLocaleString()}건 중 화면 조회 범위의 고객별 집계입니다.</p>
          <div className="summary-table-wrap">
            <table className="summary-table">
              <thead><tr><th>고객번호</th><th>고객명</th><th>DV 사용량</th><th>매출</th></tr></thead>
              <tbody>{customers.map((customer) => <tr key={`${customer.customerNo}-${customer.customerName}`}><td>{customer.customerNo}</td><td>{customer.customerName}</td><td>{displayNumber(customer.dv)}</td><td>{displayNumber(customer.revenue)}원</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
