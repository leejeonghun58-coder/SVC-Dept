"use client";

import { Upload, type PreviousUpload, type UploadOptions } from "tus-js-client";

import {
  UPLOAD_BUCKET,
  WORKBOOK_CONTENT_TYPE,
  type StorageObject,
  type UploadTarget,
} from "@/domain/uploads/upload-types";

export const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;

export interface TusUploadLike {
  url: string | null;
  findPreviousUploads(): Promise<PreviousUpload[]>;
  resumeFromPreviousUpload(previousUpload: PreviousUpload): void;
  start(): void;
  abort(shouldTerminate?: boolean): Promise<void>;
}

export type WorkbookUploadDependencies = {
  accessToken: string;
  projectRef: string;
  createTusUpload?: (file: File, options: UploadOptions) => TusUploadLike;
};

export type WorkbookUploadController = {
  readonly result: Promise<StorageObject>;
  start(): Promise<void>;
  pause(): Promise<void>;
  resume(): void;
};

export async function workbookUploadFingerprint(
  _file: File,
  job: UploadTarget,
) {
  return `ssda-workbook:${job.publicId}:${job.sha256}`;
}

function deferredResult() {
  let resolve!: (value: StorageObject) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<StorageObject>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

export function createWorkbookUpload(
  file: File,
  job: UploadTarget,
  onProgress: (percent: number) => void,
  dependencies: WorkbookUploadDependencies,
): WorkbookUploadController {
  let resultState = deferredResult();
  let terminalFailure = false;
  const createTusUpload =
    dependencies.createTusUpload ??
    ((source: File, options: UploadOptions) => new Upload(source, options));

  const upload = createTusUpload(file, {
    endpoint: `https://${dependencies.projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
    retryDelays: [0, 3_000, 5_000, 10_000, 20_000],
    headers: {
      authorization: `Bearer ${dependencies.accessToken}`,
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    chunkSize: TUS_CHUNK_SIZE_BYTES,
    fingerprint: (source) => workbookUploadFingerprint(source, job),
    metadata: {
      bucketName: UPLOAD_BUCKET,
      objectName: job.storagePath,
      contentType: WORKBOOK_CONTENT_TYPE,
      cacheControl: "3600",
    },
    onProgress(bytesUploaded, bytesTotal) {
      const percent = bytesTotal === 0 ? 0 : (bytesUploaded / bytesTotal) * 100;
      onProgress(Number(percent.toFixed(2)));
    },
    onError(error) {
      terminalFailure = true;
      resultState.reject(error);
    },
    onSuccess() {
      terminalFailure = false;
      resultState.resolve({
        bucketName: UPLOAD_BUCKET,
        objectName: job.storagePath,
        uploadUrl: upload.url,
      });
    },
  });

  return {
    get result() {
      return resultState.promise;
    },
    async start() {
      const previousUploads = await upload.findPreviousUploads();
      const previous = previousUploads.find(
        (item) => item.metadata.objectName === job.storagePath,
      );
      if (previous) upload.resumeFromPreviousUpload(previous);
      upload.start();
    },
    pause: () => upload.abort(false),
    resume() {
      if (terminalFailure) {
        resultState = deferredResult();
        terminalFailure = false;
      }
      upload.start();
    },
  };
}

export async function uploadWorkbook(
  file: File,
  job: UploadTarget,
  onProgress: (percent: number) => void,
  dependencies: WorkbookUploadDependencies,
): Promise<StorageObject> {
  const controller = createWorkbookUpload(file, job, onProgress, dependencies);
  await controller.start();
  return controller.result;
}
