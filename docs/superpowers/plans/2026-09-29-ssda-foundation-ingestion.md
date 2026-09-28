# SSDA Foundation and Data Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the secure web-app foundation and a complete upload → validation → approval → activation → rollback data-version workflow.

**Architecture:** A Next.js App Router application on Vercel uses Supabase Auth, Postgres, and private Storage. Large workbooks upload directly by TUS; a Vercel Workflow streams and validates workbook rows into versioned staging tables, builds summaries, and activates a version only through a short transactional RPC.

**Tech Stack:** TypeScript, Next.js, React, pnpm, Vitest, Testing Library, Playwright, Supabase JS/SSR, Supabase CLI/Postgres/pgTAP, Zod, tus-js-client, ExcelJS streaming reader, Workflow SDK.

**Spec:** `docs/superpowers/specs/2026-09-17-service-supply-dv-analytics-design.md`

## Global Constraints

- The UI language is Korean and the visible terms are `고객명` and `SVC팀`; do not use `담당 조직` or standalone `고객` as UI labels.
- Support current stable Microsoft Edge and Google Chrome on desktop; no mobile-specific UI.
- Use KRW only and exact decimal database types for money and cost.
- Fiscal year starts April 1 and uses the starting year label, for example `FY24 (2024.04–2025.03)`.
- Public signup is disabled; only invited company-email users registered in the app-membership table may access business data.
- Raw workbooks and rows are immutable and versioned; no failed or unapproved job may change active data.
- Files larger than 6 MB upload directly to private Supabase Storage with TUS; they never pass through a Vercel Function request body.
- `Customer No` and `Customer Name` must both match for automatic customer linkage.
- A missing comparison is `비교 데이터 없음`; a zero or missing DV denominator is `계산 불가`.
- Do not commit workbooks, exports, secrets, `.env` files, or generated customer reports.
- Do not implement forecasting, equipment-level shipment/DV analysis, notification delivery, CSV export, currency conversion, or profitability metrics.

## Review Focus

- A resumed or duplicated TUS upload must create one immutable storage object and one job, never two active versions; Task 5 owns this test.
- A workbook with missing required columns or an unreadable sheet must fail validation without touching active data; Task 6 owns this test.
- A workflow retry after partial batch insertion must be idempotent and must not duplicate rows; Task 7 owns this test.
- A version containing negative quantities must retain the signed source value, raise a review warning, and remain visibly provisional until the business policy is approved; Task 6 owns this test.
- An authenticated but unregistered user must be denied database rows, storage objects, upload actions, approvals, and rollback; Tasks 3 and 4 own these tests.

---

### Task 1: Repository, Runtime, and Test Foundation

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/lib/env.ts`
- Create: `src/lib/env.test.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: the approved design spec and existing read-only Python profiling tools.
- Produces: `env` validated by Zod; commands `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.

- [ ] **Step 1: Initialize Git and scaffold a Next.js TypeScript App Router project without overwriting `analysis/`, `tools/`, `tests/`, or `docs/`.**

- [ ] **Step 2: Write `src/lib/env.test.ts` asserting that missing server secrets fail validation and browser configuration exposes only the Supabase URL and publishable key.**

```ts
expect(() => parseServerEnv({})).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
expect(Object.keys(parsePublicEnv(validPublic))).toEqual([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
])
```

- [ ] **Step 3: Run `pnpm test src/lib/env.test.ts` and verify it fails because `parseServerEnv` and `parsePublicEnv` do not exist.**

- [ ] **Step 4: Implement `parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv` and `parsePublicEnv(input: NodeJS.ProcessEnv): PublicEnv` in `src/lib/env.ts`.**

- [ ] **Step 5: Add scripts and pinned dependencies, then run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`; all commands must pass.**

- [ ] **Step 6: Commit with `git commit -m "chore: initialize SSDA web application"`.**

### Task 2: Source Mapping and Import Policy Contract

**Files:**
- Create: `config/source-mappings.json`
- Create: `src/domain/import/source-mapping.ts`
- Create: `src/domain/import/source-mapping.test.ts`
- Create: `docs/data-import-policy.md`
- Modify: `analysis/COST_DATA_PROFILE.md`
- Modify: `analysis/DV_DATA_PROFILE.md`

**Interfaces:**
- Consumes: existing workbook profile JSON/MD and `tools/pivot_cache.py` findings.
- Produces: `SourceMappingSchema`, `loadSourceMapping(kind: "shipment" | "dv"): SourceMapping`, and a documented decision table for exact amount, total-cost, category, SVC-team, model, channel, and negative-quantity fields.

- [ ] **Step 1: Write mapping tests for header aliases, required columns, FY month parsing, KRW enforcement, and rejection of ambiguous duplicate aliases.**

```ts
expect(resolveHeader(mapping, "CustomerNo")).toBe("customerNo")
expect(() => validateHeaders(mapping, ["CustomerNo"])).toThrow(/필수 열/)
expect(parseBillingMonth("24-04")).toEqual(new Date("2024-04-01T00:00:00.000Z"))
```

- [ ] **Step 2: Run `pnpm test src/domain/import/source-mapping.test.ts`; expect failure because the contract is absent.**

- [ ] **Step 3: Implement the mapping contract and populate only mappings supported by the profile evidence; mark unresolved business fields as `approvalRequired: true` rather than guessing.**

- [ ] **Step 4: Document the negative-quantity policy as `review_required`: retain source values, create warnings, and block an “official/final” status until the user approves a business rule.**

- [ ] **Step 5: Run the mapping tests and the existing Python tests with `pnpm test && python -m unittest discover -s tests -v`; all must pass.**

- [ ] **Step 6: Commit with `git commit -m "docs: define workbook import contract"`.**

### Task 3: Supabase Schema, Private Storage, RLS, and Audit Foundation

**Files:**
- Create: `supabase/config.toml`
- Create via `supabase migration new create_ssda_core`: the returned migration path
- Create via `supabase migration new create_ssda_storage`: the returned migration path
- Create: `supabase/tests/core_schema.test.sql`
- Create: `supabase/tests/rls.test.sql`
- Create: `src/types/database.ts`

**Interfaces:**
- Consumes: user IDs from `auth.users` and version/job domain terms from the spec.
- Produces: tables `app_members`, `upload_jobs`, `data_versions`, `shipment_records`, `dv_records`, `customers`, `customer_mappings`, `validation_issues`, `monthly_item_summary`, `monthly_customer_summary`, `monthly_customer_item_summary`, `audit_events`; RPCs introduced later consume these tables.

- [ ] **Step 1: Start local Supabase and generate migration filenames using `supabase migration new`, never handwritten timestamps.**

- [ ] **Step 2: Write pgTAP tests asserting exact numeric money types, immutable version foreign keys, indexed foreign keys/filter keys, private bucket existence, RLS enabled on exposed tables, and denial for an authenticated non-member.**

- [ ] **Step 3: Run `supabase test db`; expect failures because the schema is absent.**

- [ ] **Step 4: Implement the core schema with `bigint identity` internal keys, stable public UUID identifiers, `date` month keys, `numeric` financial values, `timestamptz` audit fields, check constraints, and no premature table partitioning.**

- [ ] **Step 5: Implement membership-based RLS and private Storage policies; never authorize from editable `user_metadata`, and never expose `service_role` to the client.**

- [ ] **Step 6: Run `supabase test db` and `supabase db lint`; all tests pass and no security finding remains unresolved.**

- [ ] **Step 7: Generate `src/types/database.ts`, run `pnpm typecheck`, and commit with `git commit -m "feat: add versioned Supabase data model"`.**

### Task 4: Invite-Only Authentication and Protected Application Shell

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/auth/require-member.ts`
- Create: `src/lib/auth/require-member.test.ts`
- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/(protected)/layout.tsx`
- Create: `src/components/app-shell.tsx`
- Create: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `app_members.user_id` and Supabase session claims.
- Produces: `requireMember(): Promise<AppMember>` and a protected shell with navigation labels `출고 대시보드`, `품목 분석`, `고객명·DV 분석`, `데이터 관리`, `매핑·품질`.

- [ ] **Step 1: Write unit tests for no session, authenticated non-member, inactive member, and active invited member.**

- [ ] **Step 2: Run `pnpm test src/lib/auth/require-member.test.ts`; expect failure because `requireMember` is absent.**

- [ ] **Step 3: Implement server/browser Supabase clients and `requireMember()` using server-validated identity plus the membership table.**

- [ ] **Step 4: Implement login, sign-out, middleware session refresh, and the protected desktop shell with keyboard-visible focus states.**

- [ ] **Step 5: Add Playwright cases proving logged-out redirect, non-member denial, active-member access, and absence of secret keys in browser assets.**

- [ ] **Step 6: Run `pnpm test && pnpm test:e2e tests/e2e/auth.spec.ts`; all pass.**

- [ ] **Step 7: Commit with `git commit -m "feat: add invite-only authenticated shell"`.**

### Task 5: Direct Resumable Workbook Upload and Job Creation

**Files:**
- Create: `src/domain/uploads/upload-types.ts`
- Create: `src/domain/uploads/create-upload-job.ts`
- Create: `src/domain/uploads/create-upload-job.test.ts`
- Create: `src/features/data-management/resumable-uploader.ts`
- Create: `src/features/data-management/resumable-uploader.test.ts`
- Create: `src/app/api/upload-jobs/route.ts`
- Create: `src/app/(protected)/data/page.tsx`
- Create: `src/features/data-management/upload-panel.tsx`

**Interfaces:**
- Consumes: `requireMember()`, private bucket policies, and `UploadKind = "shipment" | "dv"`.
- Produces: `createUploadJob(input: { kind; fileName; sizeBytes; sha256; storagePath }): Promise<UploadJob>` and `uploadWorkbook(file, job, onProgress): Promise<StorageObject>`.

- [ ] **Step 1: Write tests rejecting non-XLSX files, duplicate SHA-256 hashes, unsupported sizes, path reuse, and unauthenticated job creation; verify retry resumes the same TUS fingerprint.**

- [ ] **Step 2: Run the targeted Vitest files; expect failures because upload services do not exist.**

- [ ] **Step 3: Implement an authenticated job route that generates a versioned unique storage path and returns only scoped upload information.**

- [ ] **Step 4: Implement TUS direct upload to the Supabase direct-storage hostname with progress, pause, resume, and retry status; do not proxy bytes through Next.js.**

- [ ] **Step 5: Build the Korean upload panel and job-status list, distinguishing waiting, uploading, processing, warning, failed, ready-for-review, active, and rolled-back states.**

- [ ] **Step 6: Run unit tests and an e2e interrupted-upload fixture test; all pass and exactly one job/object is created.**

- [ ] **Step 7: Commit with `git commit -m "feat: add resumable workbook uploads"`.**

### Task 6: Streaming Workbook Parsers and Validation Rules

**Files:**
- Create: `src/domain/import/common.ts`
- Create: `src/domain/import/shipment-parser.ts`
- Create: `src/domain/import/dv-parser.ts`
- Create: `src/domain/import/pivot-cache-reader.ts`
- Create: `src/domain/import/validators.ts`
- Create: `src/domain/import/import-fixtures.ts`
- Create: `src/domain/import/shipment-parser.test.ts`
- Create: `src/domain/import/dv-parser.test.ts`
- Create: `src/domain/import/validators.test.ts`

**Interfaces:**
- Consumes: `SourceMapping`, a workbook byte stream, and target `dataVersionId`.
- Produces: `parseShipmentRows(stream, mapping): AsyncIterable<ShipmentInput>`, `parseDvRows(stream, mapping): AsyncIterable<DvInput>`, and `validateImport(summary): ValidationIssue[]`.

- [ ] **Step 1: Create synthetic fixtures covering normal worksheets, the second-year pivot cache, blank rows, exact duplicates, conflicting equipment-month DV rows, missing columns, non-KRW values, zero quantities, negative quantities, and invalid periods.**

- [ ] **Step 2: Write tests asserting canonical fields, exact decimal strings, preserved signed quantities, warning/error severity, no automatic removal of conflicting DV rows, and masked error samples without customer PII.**

- [ ] **Step 3: Run targeted parser tests; expect failures because parsers do not exist.**

- [ ] **Step 4: Implement streaming worksheet parsing and a narrowly scoped pivot-cache reader equivalent to the verified Python behavior; never load all 2.3M rows into memory.**

- [ ] **Step 5: Implement validators with stable codes such as `MISSING_REQUIRED_COLUMN`, `DUPLICATE_FILE`, `NEGATIVE_QTY_REVIEW`, `ZERO_QTY_INFO`, `DV_CONFLICT_REVIEW`, `NON_KRW_ERROR`, and `PERIOD_OUT_OF_RANGE`.**

- [ ] **Step 6: Run TypeScript parser tests and existing Python regression tests; all pass with matching fixture outputs.**

- [ ] **Step 7: Commit with `git commit -m "feat: parse and validate source workbooks"`.**

### Task 7: Durable Ingestion Workflow, Batch Loading, and Pre-Aggregation

**Files:**
- Create: `src/workflows/ingest-workbook.ts`
- Create: `src/workflows/steps/download-source.ts`
- Create: `src/workflows/steps/parse-and-stage.ts`
- Create: `src/workflows/steps/validate-version.ts`
- Create: `src/workflows/steps/build-summaries.ts`
- Create: `src/domain/import/batch-writer.ts`
- Create: `src/domain/import/batch-writer.test.ts`
- Create: `src/workflows/ingest-workbook.test.ts`
- Modify: `src/app/api/upload-jobs/route.ts`

**Interfaces:**
- Consumes: `uploadJobId`, parser AsyncIterables, Supabase server client.
- Produces: `ingestWorkbook(uploadJobId: string): Promise<IngestionResult>` and idempotent steps keyed by job/version/step.

- [ ] **Step 1: Write tests for stage transitions, 1,000-row bounded batches, retry after a committed batch, duplicate step invocation, validation failure, summary failure, and unchanged active-version pointers.**

- [ ] **Step 2: Run workflow tests; expect failures because the workflow is absent.**

- [ ] **Step 3: Implement durable steps that update progress outside long database transactions and record structured failures without raw row values.**

- [ ] **Step 4: Implement batch/COPY loading with deterministic row hashes and unique `(data_version_id, source_row_hash)` protection so retries cannot duplicate rows.**

- [ ] **Step 5: Build version-scoped monthly item/customer/customer-item summaries only after validation completes; keep the version inactive.**

- [ ] **Step 6: Run workflow tests plus a synthetic 100,000-row streaming test under a documented memory ceiling; all pass.**

- [ ] **Step 7: Commit with `git commit -m "feat: add durable ingestion workflow"`.**

### Task 8: Review, Activation, Replacement, and Rollback

**Files:**
- Create via `supabase migration new add_version_activation_rpcs`: the returned migration path
- Create: `supabase/tests/version_activation.test.sql`
- Create: `src/domain/versions/version-service.ts`
- Create: `src/domain/versions/version-service.test.ts`
- Create: `src/features/data-management/version-review.tsx`
- Create: `src/features/data-management/version-history.tsx`
- Create: `tests/e2e/version-lifecycle.spec.ts`

**Interfaces:**
- Consumes: a ready `dataVersionId`, validation results, version diffs, and authenticated member ID.
- Produces: `approveVersion(id, acknowledgement): Promise<ActiveVersion>`, `rollbackVersion(id): Promise<ActiveVersion>`, and transactional RPCs that switch one period/kind pointer and write `audit_events`.

- [ ] **Step 1: Write pgTAP tests proving error versions cannot activate, warning versions require acknowledgement, same-period replacement is atomic, rollback creates a new audit event, and concurrent approvals leave exactly one active version.**

- [ ] **Step 2: Run `supabase test db`; expect failures because activation RPCs do not exist.**

- [ ] **Step 3: Implement short transactional RPCs that verify membership and version readiness, switch pointers, and append audit records without deleting old versions.**

- [ ] **Step 4: Write UI/service tests for added/deleted/changed row counts and quantity/amount/cost/DV deltas, then implement review and history screens.**

- [ ] **Step 5: Add an e2e lifecycle test: upload fixture → validate → acknowledge warning → approve → replace same period → rollback; verify dashboard-read pointers at each step.**

- [ ] **Step 6: Run `supabase test db && pnpm test && pnpm test:e2e tests/e2e/version-lifecycle.spec.ts`; all pass.**

- [ ] **Step 7: Commit with `git commit -m "feat: add version approval and rollback"`.**

### Task 9: Phase-One Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Create: `docs/runbooks/data-ingestion.md`
- Create: `docs/runbooks/version-recovery.md`
- Create: `docs/test-evidence/foundation-ingestion.md`

**Interfaces:**
- Consumes: all Phase-One commands and workflows.
- Produces: reproducible local setup, test evidence, and operator runbooks; no application API changes.

- [ ] **Step 1: Run the complete verification suite: `python -m unittest discover -s tests -v`, `supabase test db`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.**

- [ ] **Step 2: Record command versions, pass counts, and any intentionally deferred live-service checks in `docs/test-evidence/foundation-ingestion.md`.**

- [ ] **Step 3: Document local Supabase setup, invite flow, resumable upload, warning acknowledgement, activation, and rollback without placing secrets or customer data in docs.**

- [ ] **Step 4: Run a secret/data scan over tracked files and verify `.gitignore` excludes raw data, exports, `.env*`, generated reports, and caches.**

- [ ] **Step 5: Commit with `git commit -m "docs: add ingestion operations guide"`.**
