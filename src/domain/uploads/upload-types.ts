import type { Tables } from "@/types/database";

export const UPLOAD_BUCKET = "source-workbooks";
export const MAX_WORKBOOK_SIZE_BYTES = 200 * 1024 * 1024;
export const WORKBOOK_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const uploadKinds = ["shipment", "dv"] as const;
export type UploadKind = (typeof uploadKinds)[number];

export const uploadStatuses = [
  "waiting",
  "uploading",
  "processing",
  "warning",
  "failed",
  "ready_for_review",
  "active",
  "rolled_back",
] as const;
export type UploadStatus = (typeof uploadStatuses)[number];

export type UploadJob = Omit<Tables<"upload_jobs">, "kind" | "status"> & {
  kind: UploadKind;
  status: UploadStatus;
};

export type UploadJobInput = {
  kind: UploadKind;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  storagePath: string;
};

export type UploadTarget = {
  publicId: string;
  sha256: string;
  storagePath: string;
};

export type StorageObject = {
  bucketName: typeof UPLOAD_BUCKET;
  objectName: string;
  uploadUrl: string | null;
};
