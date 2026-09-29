import { describe, expect, it, vi } from "vitest";

import {
  TUS_CHUNK_SIZE_BYTES,
  createWorkbookUpload,
  workbookUploadFingerprint,
  type TusUploadLike,
  type WorkbookUploadDependencies,
} from "./resumable-uploader";

const job = {
  publicId: "30000000-0000-4000-8000-000000000001",
  sha256: "a".repeat(64),
  storagePath:
    "20000000-0000-0000-0000-000000000001/shipment/30000000-0000-4000-8000-000000000001/source.xlsx",
};

const file = new File([new Uint8Array(32)], "source.xlsx", {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});

describe("resumable workbook upload", () => {
  it("uses the same TUS fingerprint when the same job is retried", async () => {
    const first = await workbookUploadFingerprint(file, job);
    const retry = await workbookUploadFingerprint(file, job);

    expect(retry).toBe(first);
    expect(retry).toContain(job.publicId);
    expect(retry).toContain(job.sha256);
  });

  it("uses a distinct fingerprint for another immutable job", async () => {
    const first = await workbookUploadFingerprint(file, job);
    const second = await workbookUploadFingerprint(file, {
      ...job,
      publicId: "30000000-0000-4000-8000-000000000002",
    });

    expect(second).not.toBe(first);
  });

  it("resumes the previous URL and reports progress using the required chunk size", async () => {
    const previous = {
      size: file.size,
      metadata: { objectName: job.storagePath },
      creationTime: "2026-09-29T00:00:00.000Z",
      urlStorageKey: "stored-key",
      uploadUrl: "https://upload.example/resume",
      parallelUploadUrls: null,
    };
    const upload: TusUploadLike = {
      url: "https://upload.example/resume",
      findPreviousUploads: vi.fn(async () => [previous]),
      resumeFromPreviousUpload: vi.fn(),
      start: vi.fn(),
      abort: vi.fn(async () => undefined),
    };
    let capturedOptions:
      | Parameters<NonNullable<WorkbookUploadDependencies["createTusUpload"]>>[1]
      | undefined;
    const progress = vi.fn();

    const controller = createWorkbookUpload(
      file,
      job,
      progress,
      {
        accessToken: "user-jwt",
        projectRef: "project-ref",
        createTusUpload: (_file, options) => {
          capturedOptions = options;
          return upload;
        },
      },
    );

    await controller.start();
    expect(upload.resumeFromPreviousUpload).toHaveBeenCalledWith(previous);
    expect(upload.start).toHaveBeenCalledOnce();
    expect(capturedOptions).toMatchObject({
      chunkSize: TUS_CHUNK_SIZE_BYTES,
      endpoint:
        "https://project-ref.storage.supabase.co/storage/v1/upload/resumable",
      headers: { authorization: "Bearer user-jwt" },
      metadata: {
        bucketName: "source-workbooks",
        objectName: job.storagePath,
      },
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: true,
    });

    (capturedOptions?.onProgress as (sent: number, total: number) => void)(25, 100);
    expect(progress).toHaveBeenCalledWith(25);
  });

  it("pauses without terminating the remote upload and can resume", async () => {
    const upload: TusUploadLike = {
      url: null,
      findPreviousUploads: vi.fn(async () => []),
      resumeFromPreviousUpload: vi.fn(),
      start: vi.fn(),
      abort: vi.fn(async () => undefined),
    };
    const controller = createWorkbookUpload(file, job, vi.fn(), {
      accessToken: "user-jwt",
      projectRef: "project-ref",
      createTusUpload: () => upload,
    });

    await controller.pause();
    controller.resume();

    expect(upload.abort).toHaveBeenCalledWith(false);
    expect(upload.start).toHaveBeenCalledOnce();
  });

  it("creates a fresh result promise when retrying after a terminal error", async () => {
    let capturedOptions:
      | Parameters<NonNullable<WorkbookUploadDependencies["createTusUpload"]>>[1]
      | undefined;
    const upload: TusUploadLike = {
      url: "https://upload.example/retry",
      findPreviousUploads: vi.fn(async () => []),
      resumeFromPreviousUpload: vi.fn(),
      start: vi.fn(),
      abort: vi.fn(async () => undefined),
    };
    const controller = createWorkbookUpload(file, job, vi.fn(), {
      accessToken: "user-jwt",
      projectRef: "project-ref",
      createTusUpload: (_file, options) => {
        capturedOptions = options;
        return upload;
      },
    });

    const failedResult = controller.result;
    capturedOptions?.onError?.(new Error("network stopped"));
    await expect(failedResult).rejects.toThrow("network stopped");

    controller.resume();
    const retriedResult = controller.result;
    expect(retriedResult).not.toBe(failedResult);
    capturedOptions?.onSuccess?.({} as never);
    await expect(retriedResult).resolves.toMatchObject({
      objectName: job.storagePath,
    });
  });
});
