export default function DashboardPage() {
  return (
    <section>
      <p className="eyebrow">출고 대시보드</p>
      <h1>서비스 자재 현황</h1>
      <p>승인된 데이터 버전을 기준으로 출고와 DV 지표를 제공합니다.</p>
      <div className="empty-state">
        <strong>활성 데이터가 아직 없습니다.</strong>
        <span>데이터 관리에서 출고 및 DV 파일을 등록해 주세요.</span>
      </div>
    </section>
  );
}
