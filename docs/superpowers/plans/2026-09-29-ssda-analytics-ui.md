# SSDA Analytics and Customer Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the shipment dashboard, item analysis, customer-name/DV analysis, mapping, and data-quality work queues on approved active data.

**Architecture:** Server-side query services read only active version-scoped summary tables and expose typed view models to focused React feature modules. Global filter state is URL-safe only for non-identity dimensions; customer identity uses the exact Customer No + Customer Name pair in server-resolved routes, and detail rows use cursor pagination.

**Tech Stack:** TypeScript, Next.js App Router, React, Supabase/Postgres RPCs, Zod, Vitest, Testing Library, Playwright, a locally bundled accessible chart library.

**Spec:** `docs/superpowers/specs/2026-09-17-service-supply-dv-analytics-design.md`

## Global Constraints

- Phase One plan `2026-09-29-ssda-foundation-ingestion.md` is complete and its interfaces remain stable.
- Default period is the latest loaded month plus the preceding 11 months.
- Quantity is the default KPI, trend, and sort measure; amount and total cost remain separate selectable measures.
- YoY compares exactly 12 months earlier and is primary; MoM compares the prior month and is secondary.
- The UI uses Korean labels, balanced density, teal/green styling, and icon/text cues in addition to color.
- Visible labels use `고객명` and `SVC팀` consistently.
- Customer automatic linkage and detail identity require both Customer No and Customer Name.
- Null/missing comparison and zero/missing DV denominator must not be coerced to zero.
- `1,000 DV당 출고량` is `출고 수량 / 총 DV × 1,000`; a zero or missing denominator displays `계산 불가`.
- All views show the selected period, filters, active data version, and latest loaded timestamp.

## Review Focus

- A latest month with fewer than 12 months of history must show available months and `비교 데이터 없음`, not synthetic zeros; Tasks 1 and 3 own this test.
- Customer No collisions with different Customer Names must never merge customer details; Task 5 owns this test.
- A mapping change must recalculate all active-period summaries while preserving raw source values and audit history; Task 6 owns this test.
- Cursor pagination must remain stable when multiple rows share the same date and item; Tasks 2 and 4 own this test.
- Every filter must apply to cards, charts, rankings, tables, and later exports using the same population; Task 7 owns this test.

---

### Task 1: Metric, Fiscal-Period, and Comparison Domain

**Files:**
- Create: `src/domain/analytics/period.ts`
- Create: `src/domain/analytics/metrics.ts`
- Create: `src/domain/analytics/comparisons.ts`
- Create: `src/domain/analytics/analytics.test.ts`

**Interfaces:**
- Consumes: monthly additive totals from active summaries.
- Produces: `latestTwelveMonths(latest: PlainMonth): PlainMonth[]`, `fiscalYearLabel(month): string`, `compare(current, previous): Comparison`, and `shipmentPerThousandDv(quantity, dv): number | null`.

- [ ] **Step 1: Write tests for FY24 boundaries, leap/calendar transitions, 12-month windows, YoY/MoM signs, missing baselines, and zero/missing DV.**

```ts
expect(fiscalYearLabel(month("2025-03"))).toBe("FY24 (2024.04–2025.03)")
expect(compare(120, null)).toEqual({ status: "unavailable" })
expect(shipmentPerThousandDv(10, 0)).toBeNull()
```

- [ ] **Step 2: Run `pnpm test src/domain/analytics/analytics.test.ts`; expect failure because the domain functions are absent.**

- [ ] **Step 3: Implement the pure functions with Decimal-compatible inputs and explicit unavailable states.**

- [ ] **Step 4: Run the targeted tests; all pass.**

- [ ] **Step 5: Commit with `git commit -m "feat: add analytics metric rules"`.**

### Task 2: Typed Analytics Query Layer

**Files:**
- Create: `src/domain/analytics/filter-schema.ts`
- Create: `src/domain/analytics/query-service.ts`
- Create: `src/domain/analytics/query-service.test.ts`
- Create via `supabase migration new add_analytics_read_rpcs`: the returned migration path
- Create: `supabase/tests/analytics_queries.test.sql`

**Interfaces:**
- Consumes: `AnalyticsFilters`, active version pointers, monthly summary tables, and detail records.
- Produces: `getDashboard(filters): Promise<DashboardView>`, `getItemDetail(itemId, filters): Promise<ItemDetailView>`, `getCustomerDetail(customerKey, filters): Promise<CustomerDetailView>`, and cursor-based `getShipmentRows(query): Promise<CursorPage<ShipmentRow>>`.

- [ ] **Step 1: Write pgTAP fixtures and tests proving active-version isolation, all/category filters, item/customer-name/SVC-team filters, correct additive totals, and stable `(service_month, id)` cursor ordering.**

- [ ] **Step 2: Run `supabase test db`; expect failure because analytics RPCs are absent.**

- [ ] **Step 3: Implement security-invoker RPCs/views and indexes matching equality filters before month ranges; do not expose inactive rows.**

- [ ] **Step 4: Write TypeScript contract tests that reject unknown filters and preserve unavailable/null states, then implement the query service.**

- [ ] **Step 5: Run `supabase test db && pnpm test src/domain/analytics/query-service.test.ts`; all pass.**

- [ ] **Step 6: Commit with `git commit -m "feat: add active analytics query layer"`.**

### Task 3: Shipment Dashboard

**Files:**
- Create: `src/app/(protected)/dashboard/page.tsx`
- Create: `src/features/dashboard/dashboard-filters.tsx`
- Create: `src/features/dashboard/kpi-strip.tsx`
- Create: `src/features/dashboard/monthly-trend.tsx`
- Create: `src/features/dashboard/item-rankings.tsx`
- Create: `src/features/dashboard/item-table.tsx`
- Create: `src/features/dashboard/dashboard.test.tsx`
- Create: `tests/e2e/dashboard.spec.ts`
- Modify: `src/app/(protected)/page.tsx`

**Interfaces:**
- Consumes: `DashboardView` and `AnalyticsFilters` from Tasks 1–2.
- Produces: the default protected route and links to item/customer detail that retain applicable filters.

- [ ] **Step 1: Write component tests for default latest-12-month state, quantity default, measure switching, YoY primary/MoM secondary copy, top quantity/increase/decrease lists, unavailable comparisons, and filter reset.**

- [ ] **Step 2: Run dashboard tests; expect failure because components are absent.**

- [ ] **Step 3: Implement the fixed left filter column and right KPI → trend → rankings → table hierarchy with collapsible advanced filters.**

- [ ] **Step 4: Implement table/chart selection links without putting customer identity-bearing values into shareable query strings.**

- [ ] **Step 5: Add e2e checks that each filter changes cards, chart, rankings, and table consistently and returning to `전체` reconciles to the unfiltered totals.**

- [ ] **Step 6: Run unit/e2e tests at normal and narrow desktop widths; verify no clipping and keyboard-visible controls.**

- [ ] **Step 7: Commit with `git commit -m "feat: add shipment analytics dashboard"`.**

### Task 4: Item Analysis

**Files:**
- Create: `src/app/(protected)/items/[itemId]/page.tsx`
- Create: `src/features/items/item-header.tsx`
- Create: `src/features/items/item-trends.tsx`
- Create: `src/features/items/item-breakdowns.tsx`
- Create: `src/features/items/item-shipment-table.tsx`
- Create: `src/features/items/item-detail.test.tsx`
- Create: `tests/e2e/item-detail.spec.ts`

**Interfaces:**
- Consumes: `getItemDetail`, `getShipmentRows`, and inherited filters.
- Produces: an item detail route with monthly quantity/amount/cost trends and customer-name/model/SVC-team comparisons.

- [ ] **Step 1: Write tests for filter-context restoration, separate units for quantity/amount/cost, YoY comparison, customer-name links, and duplicate-safe detail pagination.**

- [ ] **Step 2: Run targeted tests; expect failure because the item feature is absent.**

- [ ] **Step 3: Implement item header, trends, breakdowns, and cursor table with a clear return path to the dashboard.**

- [ ] **Step 4: Add e2e drill-down/return tests and verify all visible labels use `고객명` and `SVC팀`.**

- [ ] **Step 5: Run unit/e2e tests; all pass.**

- [ ] **Step 6: Commit with `git commit -m "feat: add item analysis"`.**

### Task 5: Customer Name and DV Detail

**Files:**
- Create: `src/domain/customers/customer-key.ts`
- Create: `src/domain/customers/customer-key.test.ts`
- Create: `src/app/(protected)/customers/[customerKey]/page.tsx`
- Create: `src/features/customers/customer-header.tsx`
- Create: `src/features/customers/customer-kpis.tsx`
- Create: `src/features/customers/customer-monthly-analysis.tsx`
- Create: `src/features/customers/customer-composition.tsx`
- Create: `src/features/customers/customer-shipment-table.tsx`
- Create: `src/features/customers/customer-detail.test.tsx`
- Create: `tests/e2e/customer-detail.spec.ts`

**Interfaces:**
- Consumes: exact `{ customerNo, customerName }`, `CustomerDetailView`, and `getShipmentRows`.
- Produces: `encodeCustomerKey(pair): string`, `decodeCustomerKey(key): CustomerPair`, and the customer-detail page used by report generation.

- [ ] **Step 1: Write customer-key tests proving round-trip safety, malformed-key rejection, and distinct keys for the same number with different names.**

- [ ] **Step 2: Write component tests for total DV, total/part/consumable quantities, amount, cost, separate same-month-axis DV and shipment charts, category toggle, top items, YoY, `계산 불가`, and connection status.**

- [ ] **Step 3: Run targeted tests; expect failure because the feature is absent.**

- [ ] **Step 4: Implement the opaque route key and resolve it server-side to the exact number+name pair; never merge by name or number alone.**

- [ ] **Step 5: Implement the customer detail page and cursor table; expose a typed `CustomerReportModel` builder for Phase Three without generating files yet.**

- [ ] **Step 6: Add e2e navigation from dashboard, item analysis, and detail tables; verify a collision fixture opens the correct customer every time.**

- [ ] **Step 7: Run tests and commit with `git commit -m "feat: add customer DV and shipment detail"`.**

### Task 6: Customer Mapping and Data-Quality Work Queue

**Files:**
- Create via `supabase migration new add_customer_mapping_rpcs`: the returned migration path
- Create: `supabase/tests/customer_mapping.test.sql`
- Create: `src/domain/mappings/mapping-service.ts`
- Create: `src/domain/mappings/mapping-service.test.ts`
- Create: `src/app/(protected)/quality/page.tsx`
- Create: `src/features/quality/unmatched-customers.tsx`
- Create: `src/features/quality/validation-issues.tsx`
- Create: `src/features/quality/mapping-history.tsx`
- Create: `tests/e2e/customer-mapping.spec.ts`

**Interfaces:**
- Consumes: unresolved source customer pairs and an approved canonical pair.
- Produces: `approveCustomerMapping(input): Promise<MappingRebuildJob>`, `revokeCustomerMapping(id): Promise<MappingRebuildJob>`, and an audited all-active-period summary rebuild.

- [ ] **Step 1: Write pgTAP tests for exact automatic matches, mismatch queueing, member-only approval, immutable source values, mapping audit records, full-period recalculation, and revocation.**

- [ ] **Step 2: Run database tests; expect failure because mapping RPCs are absent.**

- [ ] **Step 3: Implement mapping/revocation RPCs and a rebuild job that creates replacement summaries before swapping them atomically.**

- [ ] **Step 4: Write and implement the UI work queues for unmatched customers, negative/zero quantities, duplicate periods, missing values, and non-KRW errors.**

- [ ] **Step 5: Add e2e mapping approval and revoke flows; verify raw rows never change and customer-detail totals update across all active periods.**

- [ ] **Step 6: Run tests and commit with `git commit -m "feat: add customer mapping and quality queues"`.**

### Task 7: Data-Management Read UI and Cross-View Consistency

**Files:**
- Modify: `src/app/(protected)/data/page.tsx`
- Create: `src/features/data-management/job-progress.tsx`
- Create: `src/features/data-management/version-diff.tsx`
- Create: `src/features/data-management/data-management.test.tsx`
- Create: `tests/e2e/filter-consistency.spec.ts`
- Create: `docs/test-evidence/analytics-ui.md`

**Interfaces:**
- Consumes: Phase-One job/version services and all Phase-Two view models.
- Produces: complete operational data-management UI and verified cross-view population consistency.

- [ ] **Step 1: Write tests for progress/error rendering, validation issue grouping, previous-version deltas, approval acknowledgement, active/history labels, and rollback confirmation.**

- [ ] **Step 2: Implement the operational UI using existing services without duplicating lifecycle logic in components.**

- [ ] **Step 3: Add an e2e population test that applies period/category/item/customer-name/SVC-team filters and compares dashboard totals with item and customer detail totals from the same fixture.**

- [ ] **Step 4: Verify loading, empty, zero, null, unavailable, provisional, and failed states are visually distinct and accessible without color alone.**

- [ ] **Step 5: Run `supabase test db && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`; record results in `docs/test-evidence/analytics-ui.md`.**

- [ ] **Step 6: Commit with `git commit -m "test: verify analytics UI consistency"`.**
