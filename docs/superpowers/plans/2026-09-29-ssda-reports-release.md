# SSDA Reports and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trustworthy Excel/PDF outputs, complete security and performance validation, and deploy the tested MVP through GitHub, Vercel, and Supabase.

**Architecture:** Report services consume the same typed filtered view models as the UI, so exports cannot silently use a different population. Excel files preserve detailed rows; customer PDFs render a bounded summary+analysis model. Release gates combine automated reconciliation, browser tests, Supabase advisors, production configuration checks, and an operator runbook.

**Tech Stack:** TypeScript, Next.js, ExcelJS, @react-pdf/renderer, Vitest, Playwright, Supabase CLI/advisors, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-17-service-supply-dv-analytics-design.md`

## Global Constraints

- Plans `2026-09-29-ssda-foundation-ingestion.md` and `2026-09-29-ssda-analytics-ui.md` are complete.
- General dashboard/item data download is Excel only; customer formal reports support Excel and summary+analysis PDF.
- Customer reports are scoped by exact Customer No + Customer Name plus the active filters and period.
- Every output states customer number/name when applicable, period, filters, generation time, and data version.
- Excel preserves KRW values at won precision and provides summary plus filtered detail.
- Customer Excel has `요약`, `월별 DV`, `부품 출고 상세`, and `소모품 출고 상세` sheets.
- Customer PDF contains customer information, KPIs, monthly DV/shipment analysis, part/consumable composition, top items, and YoY; it excludes all detail rows.
- Generated reports are private, short-lived, auditable, and never committed to Git.

## Review Focus

- Exports generated after an active-version change must identify and use one consistent version, never mix old and new rows; Tasks 1–3 own this test.
- Excel cell types must remain numeric for quantity/money/DV while identifiers with leading zeros remain text; Task 1 owns this test.
- A PDF with long Korean customer/item names must wrap without clipping and keep the exact customer identity visible; Task 2 owns this test.
- Large filtered exports must finish asynchronously without blocking the browser or exposing private URLs; Task 3 owns this test.
- Production must deny unauthenticated access even if a report URL or Storage path is guessed; Tasks 3 and 5 own this test.

---

### Task 1: Excel Export Services

**Files:**
- Create: `src/domain/reports/report-model.ts`
- Create: `src/domain/reports/report-model.test.ts`
- Create: `src/domain/reports/excel-export.ts`
- Create: `src/domain/reports/excel-export.test.ts`
- Create: `src/app/api/exports/excel/route.ts`
- Create: `src/features/reports/excel-download-button.tsx`
- Create: `tests/e2e/excel-export.spec.ts`

**Interfaces:**
- Consumes: `DashboardView`, `ItemDetailView`, `CustomerReportModel`, `AnalyticsFilters`, and one pinned active `dataVersionId`.
- Produces: `buildGeneralWorkbook(input): Promise<Buffer>` and `buildCustomerWorkbook(input): Promise<Buffer>`.

- [ ] **Step 1: Write tests that open generated workbooks and assert exact sheet names, metadata cells, numeric value types, text identifiers with leading zeros, filter-consistent totals, and no rows outside the requested customer/category/period.**

- [ ] **Step 2: Run targeted tests; expect failure because export services do not exist.**

- [ ] **Step 3: Implement shared report-model builders from the same query-service results used by the UI; pin one version at job start.**

- [ ] **Step 4: Implement general summary+detail workbooks and customer `요약`/`월별 DV`/`부품 출고 상세`/`소모품 출고 상세` workbooks with Korean labels and won precision.**

- [ ] **Step 5: Add an authorized route/button and e2e download checks for Dashboard, Item, and Customer pages.**

- [ ] **Step 6: Run unit/e2e tests and commit with `git commit -m "feat: add verified Excel exports"`.**

### Task 2: Customer Summary and Analysis PDF

**Files:**
- Create: `src/domain/reports/customer-pdf.tsx`
- Create: `src/domain/reports/customer-pdf.test.tsx`
- Create: `src/domain/reports/report-charts.tsx`
- Create: `src/app/api/reports/customers/[customerKey]/pdf/route.ts`
- Create: `src/features/reports/pdf-download-button.tsx`
- Create: `tests/e2e/customer-pdf.spec.ts`
- Create: `src/assets/fonts/NotoSansKR-Regular.ttf`

**Interfaces:**
- Consumes: one `CustomerReportModel` pinned to a data version.
- Produces: `renderCustomerPdf(model): Promise<Buffer>` with multiple A4 pages and no raw-detail appendix.

- [ ] **Step 1: Write structural tests for customer identity, report metadata, KPI values, monthly DV/shipment sections, part/consumable composition, top items, YoY labels, unavailable comparison text, and absence of full detail rows.**

- [ ] **Step 2: Run targeted tests; expect failure because the PDF renderer is absent.**

- [ ] **Step 3: Implement a locally bundled Korean-font PDF template with repeating header/footer, page numbers, bounded charts/tables, and text wrapping.**

- [ ] **Step 4: Render fixtures containing long Korean names, 12 months, missing DV, and large/negative values; rasterize every page and visually inspect for clipping, overlap, broken glyphs, and misleading scales.**

- [ ] **Step 5: Add the authorized customer PDF route/button and e2e checks for correct MIME type, filename, identity, and filters.**

- [ ] **Step 6: Run tests and commit with `git commit -m "feat: add customer analysis PDF reports"`.**

### Task 3: Asynchronous Report Jobs and Private Delivery

**Files:**
- Create via `supabase migration new add_report_jobs`: the returned migration path
- Create: `supabase/tests/report_jobs.test.sql`
- Create: `src/workflows/generate-report.ts`
- Create: `src/domain/reports/report-job-service.ts`
- Create: `src/domain/reports/report-job-service.test.ts`
- Create: `src/features/reports/report-job-status.tsx`

**Interfaces:**
- Consumes: member ID, report kind, customer key if applicable, filters, and pinned version ID.
- Produces: `requestReport(input): Promise<ReportJob>`, `generateReport(jobId): Promise<void>`, and a time-limited member-authorized download.

- [ ] **Step 1: Write database tests for member-only jobs, immutable version/filter snapshots, private object paths, expiry, audit records, and denial after expiry or to a different user.**

- [ ] **Step 2: Run database/unit tests; expect failure because jobs and services are absent.**

- [ ] **Step 3: Implement the report-job schema and durable generation workflow with idempotent retries and no public Storage URLs.**

- [ ] **Step 4: Implement status UI and member-authorized download retrieval; generated files expire after 24 hours and the UI must show the expiry time.**

- [ ] **Step 5: Run a large synthetic export test and prove the browser request returns promptly while the job continues in the background.**

- [ ] **Step 6: Commit with `git commit -m "feat: add private asynchronous report delivery"`.**

### Task 4: Reconciliation, Accessibility, and Browser Acceptance Suite

**Files:**
- Create: `tests/e2e/reconciliation.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/report-consistency.spec.ts`
- Create: `tests/fixtures/acceptance-dataset.ts`
- Create: `docs/test-evidence/reconciliation.md`
- Create: `docs/test-evidence/browser-acceptance.md`

**Interfaces:**
- Consumes: deterministic accepted shipment/DV versions and all user-facing pages/exports.
- Produces: release evidence that source totals, UI, and exports reconcile.

- [ ] **Step 1: Create a deterministic fixture with parts, consumables, exact and mismatched customers, zero/negative quantities, missing/zero DV, unavailable YoY, and same-sort-key detail rows.**

- [ ] **Step 2: Write reconciliation tests comparing source fixture totals to database summaries, KPI cards, chart source data, detail tables, Excel cells, and PDF text for the same filters.**

- [ ] **Step 3: Write accessibility tests for keyboard navigation, focus visibility, labeled filters, table headers, non-color status cues, and chart summaries.**

- [ ] **Step 4: Run the suite in Playwright Chromium configured for current Chrome and Edge channels at normal and narrow desktop widths.**

- [ ] **Step 5: Record actual pass results, screenshots, and any browser-only limitations in the evidence docs; do not claim checks that did not run.**

- [ ] **Step 6: Commit with `git commit -m "test: add release reconciliation suite"`.**

### Task 5: Security, Performance, and Failure-Recovery Gate

**Files:**
- Create: `tests/security/authorization.spec.ts`
- Create: `tests/performance/query-budgets.test.ts`
- Create: `tests/performance/import-budgets.test.ts`
- Create: `docs/test-evidence/security-performance.md`
- Create: `docs/runbooks/incident-recovery.md`

**Interfaces:**
- Consumes: deployed-like local stack, Supabase advisors, representative 2.3M-row sizing data or a justified scaled fixture.
- Produces: release gate evidence and recovery instructions; no new product feature.

- [ ] **Step 1: Test unauthenticated, non-member, cross-user report, guessed Storage path, direct REST, and stale-session access; every case must be denied.**

- [ ] **Step 2: Run Supabase Security and Performance Advisors; fix all relevant RLS, missing-index, unsafe-function, and query-plan findings before proceeding.**

- [ ] **Step 3: With representative 2.3M-row cardinality, assert p95 server response budgets of 3 seconds for initial dashboard, 2 seconds for filter changes, 1 second for a 100-row cursor page, and 3 seconds for customer detail.**

- [ ] **Step 4: Exercise interrupted uploads, repeated workflow steps, parser failure, summary failure, concurrent approvals, mapping rebuild failure, report failure, and rollback; verify active data remains unchanged when required.**

- [ ] **Step 5: Document measured timings/resource use and incident recovery, including how to identify the active version and safely rollback.**

- [ ] **Step 6: Commit with `git commit -m "test: complete security and performance gate"`.**

### Task 6: GitHub, Supabase, and Vercel Release

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Create: `vercel.json`
- Create: `.github/workflows/ci.yml`
- Create: `docs/runbooks/deployment.md`
- Create: `docs/runbooks/user-invitation.md`
- Create: `docs/test-evidence/production-smoke.md`
- Modify: `PROJECT_HANDOFF.md`

**Interfaces:**
- Consumes: approved private GitHub repository, user-owned/authorized Supabase and Vercel projects, all passing release gates.
- Produces: deployed MVP, reproducible CI, deployment/invite procedures, and verified handoff documentation.

- [ ] **Step 1: Verify current official Vercel Workflow and Supabase plan limits, runtime resources, Storage/database capacity, and expected monthly cost; record the dated decision in `docs/runbooks/deployment.md`.**

- [ ] **Step 2: Configure CI to install from the lockfile and run Python regressions, database tests, lint, typecheck, unit tests, e2e tests, and production build without secrets in logs.**

- [ ] **Step 3: Create/connect the private GitHub repository, Supabase project, and Vercel project using the user's own or explicitly authorized organization accounts; configure secrets only in provider settings.**

- [ ] **Step 4: Apply migrations, create private buckets, disable public signup, invite the initial user, deploy the app/workflows, and verify the deployed revision matches the tested commit.**

- [ ] **Step 5: Run production smoke tests for login, upload, validation, approval, dashboard, item/customer details, mapping, Excel, PDF, report expiry, rollback, and unauthorized denial in Edge and Chrome.**

- [ ] **Step 6: Update `PROJECT_HANDOFF.md` with repository/project identifiers that are safe to record, exact setup commands, current version, remaining business-policy decisions, and no secrets.**

- [ ] **Step 7: Commit with `git commit -m "docs: finalize SSDA production handoff"`.**

### Task 7: Final Release Evidence

**Files:**
- Create: `docs/test-evidence/release-summary.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: every automated and production smoke-test result.
- Produces: a concise release decision with known limitations and follow-up items.

- [ ] **Step 1: Rerun the complete CI-equivalent suite from a clean checkout and record exact commands, versions, and pass/fail counts.**

- [ ] **Step 2: Confirm the deployed app uses the same commit and migration set, then rerun the highest-risk reconciliation and authorization checks.**

- [ ] **Step 3: Record known limitations: negative-quantity results remain provisional until business approval; unresolved source mappings or corporate-cloud approval block official production use.**

- [ ] **Step 4: Commit with `git commit -m "docs: record SSDA release evidence"`.**
