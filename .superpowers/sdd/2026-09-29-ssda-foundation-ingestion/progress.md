# SDD ledger — plan: docs/superpowers/plans/2026-09-29-ssda-foundation-ingestion.md

Setup: baseline commit `0602c38`; implementation branch `feat/ssda-foundation`; existing Python baseline 7/7 tests passed.

Ruling: The repository did not exist before execution, so no linked worktree could be created before initialization. Work proceeds in the newly created repository on the dedicated `feat/ssda-foundation` branch — this isolates changes from `main`; cost if wrong: directory-level isolation is weaker than a linked worktree, but the baseline commit and feature branch preserve rollback.

Ruling: The installed Superpowers package contains `sdd-workspace`, `task-brief`, and `review-package`, but this Windows runtime has no Bash and the referenced `task-start`/`task-done` scripts are absent. Use this manual plan-scoped ledger, direct task excerpts, Git commit ranges, and fresh test commands — cost if wrong: automated brief/completion formatting is unavailable, but all required evidence remains in Git and this ledger.

Pre-flight Task 1 → Tasks 3–8: project scripts, TypeScript configuration, environment parsing, and test commands are foundational; names in Task 1 match all consumers.

Pre-flight Task 2 → Task 6: `SourceMapping` and `loadSourceMapping(kind)` are produced and consumed with identical names.

Pre-flight Task 3 → Tasks 4–8: schema tables and generated `Database` types are the shared persistence contract; no naming conflict found.

Pre-flight Task 4 → Tasks 5 and 8: `requireMember(): Promise<AppMember>` is the authorization boundary both consumers require.

Pre-flight Task 5 → Task 7: upload job and immutable Storage object identify the workflow input; no conflict found.

Pre-flight Task 6 → Task 7: parser `AsyncIterable` contracts and validation issues match the workflow inputs.

Pre-flight Task 7 → Task 8: workflow leaves a validated, summarized, inactive version; activation consumes exactly that state.

Task 1: in progress (BASE `0602c38`).

Task 1: Ruling: the bundled pnpm runtime is 11.25.0 and ignores the legacy `package.json#pnpm.onlyBuiltDependencies` field; use `pnpm-workspace.yaml#allowBuilds` with only `unrs-resolver: true` and record pnpm 11.25.0 in `packageManager` — this preserves the intended one-package build allowlist; cost if wrong: lint/module resolution could fail or an unnecessary install script could run, bounded to the named pinned package.

Task 1: complete. RED evidence: `pnpm test src/lib/env.test.ts` failed with `Cannot find module './env'` before implementation. GREEN evidence (2026-09-29): `pnpm test -- --reporter=dot` passed 1 file / 2 tests; `pnpm lint` exit 0; `pnpm typecheck` exit 0; `pnpm build` exit 0 with `/` statically generated; bundled Python `unittest discover -s tests -v` passed 7/7. Next.js added `.next/dev/types/**/*.ts` to `tsconfig.json` during the successful production build.

Task 1 commit: `301c1c3 chore: initialize SSDA web application`.

Task 2: complete (BASE `301c1c3`). RED evidence: targeted mapping test failed with `Cannot find module './source-mapping'`. GREEN evidence (2026-09-29): Vitest passed 2 files / 12 tests; TypeScript typecheck exit 0; ESLint exit 0; Python regression suite passed 7/7; `git diff --check` exit 0. Contract decision: only profile-observed headers are mapped; unresolved amount, cost, category, SVC-team, model, channel, and newest-file currency semantics remain `approvalRequired` or activation-blocking as documented. Negative quantities remain signed with `review_required`; customer auto-link requires both customer number and customer name.

Task 2 commit: `d325277 docs: define workbook import contract`.

Task 3: in progress (BASE `d325277`). Supabase CLI `2.118.0` installed as a pinned dev dependency after checking the current registry version. The CLI created `supabase/config.toml` and timestamped migrations `20260929002707_create_ssda_core.sql` and `20260929002709_create_ssda_storage.sql`. Current official guidance reviewed: explicit Data API grants are required with `auto_expose_new_tables = false`; every exposed table has RLS; policies use `to authenticated`, `(select auth.uid())`, and indexed membership predicates; Storage uses a private bucket and object RLS without client service-role access.

Task 3 environment block: this PC has no `docker` executable. `supabase test db` therefore failed before schema execution with `ECONNREFUSED 127.0.0.1:54322` and the CLI suggestion `Make sure Docker is running, then run: supabase start`. The pgTAP contracts and draft migrations are present but unverified and uncommitted. Do not mark Task 3 complete or proceed as if the schema passed until either Docker/local Supabase is available or a safe linked Supabase test project is explicitly provided.

Task 3: complete. User selected a dedicated hosted development project. Supabase OAuth login succeeded and new project `SSDA Development` (`uttshmnzrfwdsvepsjxo`, Seoul `ap-northeast-2`) reached `ACTIVE_HEALTHY`; no secret or database password was persisted in tracked files. The project was linked, draft SQL was iterated using `db query --linked`, and both local migration versions were recorded as applied only after validation. RED evidence: the empty remote database returned `# Looks like you failed 38 tests of 38`. GREEN evidence (fresh 2026-09-29): core pgTAP reached `ok 38`; RLS/non-member pgTAP reached `ok 18`; `db lint` reported no schema errors; security/performance Advisor reported no warn/error issues; local and remote migration versions `20260929002707` and `20260929002709` match; generated `src/types/database.ts` came from the linked schema. Local regressions: Vitest 2 files / 12 tests, Python 7/7, ESLint, TypeScript, and Next.js production build all passed. Ruling: because the linked pgTAP CLI wrapper still requires Docker, execute the same transactional pgTAP SQL through Management API `db query --linked --file`; cost if wrong: CLI test-runner formatting is unavailable, while the assertions execute in the actual target Postgres and roll back their fixtures.

Task 4: complete (BASE `b45fc0b`). RED evidence: `pnpm test src/lib/auth/require-member.test.ts` failed with `Cannot find module './require-member'`. GREEN evidence (fresh 2026-09-29): Vitest passed 3 files / 16 tests; hosted-development-project Playwright passed 4/4 for logged-out redirect, non-member denial, active-member shell access, and privileged-key absence from browser HTML/JavaScript; Python regressions passed 7/7; ESLint, TypeScript, and the Next.js production build passed. The E2E fixture created and deleted disposable Auth users and supplied the legacy `service_role` value only as a transient process variable; no privileged key was written to a file or browser bundle. Ruling: use Next.js 16 `src/proxy.ts` instead of the plan's deprecated `src/middleware.ts`; cost if wrong: an older Next.js runtime would not discover Proxy, while this repository pins Next.js 16.3.6 and the production build reports the Proxy route. Ruling: Proxy performs optimistic claim-based redirects only, while `requireMember()` performs the authoritative server-validated identity and active `app_members` lookup next to protected content.
