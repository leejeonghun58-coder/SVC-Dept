"use client";

import { useRef, useState, type FormEvent } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database";

import { createWorkbookUpload, type WorkbookUploadController } from "./resumable-uploader";

type UploadJobRow = Tables<"upload_jobs">;
type LocalPhase = "idle" | "hashing" | "uploading" | "paused" | "processing" | "failed";

const statusLabels: Record<string, string> = {
  waiting: "대기",
  uploading: "업로드 중",
  processing: "처리 중",
  warning: "경고",
  failed: "실패",
  ready_for_review: "검토 준비",
  active: "활성",
  rolled_back: "롤백됨",
};

const localLabels: Record<LocalPhase, string> = {
  idle: "파일을 선택해 주세요.",
  hashing: "파일 무결성 확인 중",
  uploading: "Supabase Storage로 직접 업로드 중",
  paused: "업로드 일시정지",
  processing: "업로드 완료 · 분석 준비",
  failed: "업로드 실패 · 재시도 가능",
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function projectRefFromPublicUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("Supabase 공개 URL이 설정되지 않았습니다.");
  const projectRef = new URL(value).hostname.split(".")[0];
  if (!projectRef) throw new Error("Supabase 프로젝트 참조값을 확인할 수 없습니다.");
  return projectRef;
}

export function UploadPanel({ initialJobs }: { initialJobs: UploadJobRow[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [kind, setKind] = useState<"shipment" | "dv">("shipment");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<LocalPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const controllerRef = useRef<WorkbookUploadController | null>(null);

  async function refreshJobs() {
    const response = await fetch("/api/upload-jobs", { cache: "no-store" });
    if (!response.ok) return;
    const body = (await response.json()) as { jobs: UploadJobRow[] };
    setJobs(body.jobs);
  }

  async function startUpload(selectedFile: File, selectedKind: typeof kind) {
    setMessage(null);
    setPhase("hashing");
    setProgress(0);
    const sha256 = await sha256Hex(selectedFile);
    const response = await fetch("/api/upload-jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: selectedKind,
        fileName: selectedFile.name,
        sizeBytes: selectedFile.size,
        sha256,
      }),
    });
    const body = (await response.json()) as {
      error?: string;
      upload?: { publicId: string; sha256: string; storagePath: string };
    };
    if (!response.ok || !body.upload) {
      throw new Error(body.error ?? "업로드 작업을 만들지 못했습니다.");
    }

    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error("로그인 세션을 확인해 주세요.");
    const controller = createWorkbookUpload(selectedFile, body.upload, setProgress, {
      accessToken: data.session.access_token,
      projectRef: projectRefFromPublicUrl(),
    });
    controllerRef.current = controller;
    setPhase("uploading");
    await controller.start();
    await controller.result;
    setPhase("processing");
    setProgress(100);
    await refreshJobs();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("업로드할 XLSX 파일을 선택해 주세요.");
      return;
    }
    try {
      await startUpload(file, kind);
    } catch (error) {
      setPhase("failed");
      setMessage(error instanceof Error ? error.message : "업로드에 실패했습니다.");
      await refreshJobs();
    }
  }

  async function pause() {
    await controllerRef.current?.pause();
    setPhase("paused");
  }

  function resume() {
    controllerRef.current?.resume();
    setPhase("uploading");
  }

  async function retry() {
    if (!file) return;
    try {
      if (controllerRef.current) {
        setPhase("uploading");
        controllerRef.current.resume();
        await controllerRef.current.result;
        setPhase("processing");
        setProgress(100);
      } else {
        await startUpload(file, kind);
      }
      await refreshJobs();
    } catch (error) {
      setPhase("failed");
      setMessage(error instanceof Error ? error.message : "재시도에 실패했습니다.");
    }
  }

  return (
    <div className="upload-layout">
      <section className="upload-card" aria-labelledby="upload-title">
        <div>
          <p className="eyebrow">Direct resumable upload</p>
          <h2 id="upload-title">원본 파일 업로드</h2>
        </div>
        <form onSubmit={handleSubmit} className="upload-form">
          <label htmlFor="upload-kind">데이터 종류</label>
          <select id="upload-kind" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} disabled={phase === "hashing" || phase === "uploading"}>
            <option value="shipment">부품·소모품 출고</option>
            <option value="dv">DV (Document Volume)</option>
          </select>
          <label htmlFor="workbook">XLSX 원본 파일</label>
          <input id="workbook" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={phase === "hashing" || phase === "uploading"} />
          <p className="selected-file" data-testid="selected-file">{file ? `선택 파일: ${file.name}` : "선택된 파일 없음"}</p>
          <p className="form-help">최대 200MB · 같은 종류와 내용의 파일은 중복 등록되지 않습니다. 업로드된 원본은 검증·분석 단계에 사용됩니다.</p>
          <button type="submit" disabled={phase === "hashing" || phase === "uploading"}>무결성 확인 후 업로드</button>
        </form>
        <div className="upload-progress" aria-live="polite">
          <div className="progress-copy"><strong>{localLabels[phase]}</strong><span>{progress.toFixed(0)}%</span></div>
          <progress max="100" value={progress}>업로드 {progress.toFixed(0)}%</progress>
          {message ? <p className="form-error" role="alert">{message}</p> : null}
          <div className="upload-actions">
            {phase === "uploading" ? <button type="button" onClick={pause}>일시정지</button> : null}
            {phase === "paused" ? <button type="button" onClick={resume}>계속</button> : null}
            {phase === "failed" ? <button type="button" onClick={retry}>재시도</button> : null}
          </div>
        </div>
      </section>

      <section className="job-card" aria-labelledby="jobs-title">
        <div className="job-card-heading">
          <div><p className="eyebrow">Upload jobs</p><h2 id="jobs-title">최근 작업</h2></div>
          <button type="button" className="secondary-button" onClick={refreshJobs}>새로고침</button>
        </div>
        {jobs.length === 0 ? <p className="empty-state">등록된 업로드 작업이 없습니다.</p> : (
          <div className="job-table-wrap">
            <table className="job-table">
              <thead><tr><th>파일명</th><th>종류</th><th>크기</th><th>상태</th><th>등록 시각</th></tr></thead>
              <tbody>{jobs.map((job) => (
                <tr key={job.public_id}>
                  <td>{job.file_name}</td><td>{job.kind === "shipment" ? "출고" : "DV"}</td><td>{formatBytes(job.size_bytes)}</td>
                  <td><span className={`status status-${job.status}`}>{statusLabels[job.status] ?? job.status}</span></td>
                  <td>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(job.created_at))}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
