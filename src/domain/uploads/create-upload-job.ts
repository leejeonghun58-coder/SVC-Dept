import { requireMember } from "@/lib/auth/require-member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  MAX_WORKBOOK_SIZE_BYTES,
  uploadKinds,
  type UploadJob,
  type UploadJobInput,
} from "./upload-types";

export type { UploadJob, UploadJobInput } from "./upload-types";

type JobInsert = UploadJobInput & {
  createdBy: string;
  status: "waiting";
};

type DatabaseConflict = Error & {
  code?: string;
  details?: string;
};

export interface CreateUploadJobDependencies {
  authorize(): Promise<{ user_id: string }>;
  insertJob(input: JobInsert): Promise<UploadJob>;
}

export class InvalidWorkbookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWorkbookError";
  }
}

export class DuplicateWorkbookError extends Error {
  constructor() {
    super("같은 종류와 내용의 원본 파일이 이미 등록되어 있습니다.");
    this.name = "DuplicateWorkbookError";
  }
}

export class StoragePathConflictError extends Error {
  constructor() {
    super("이미 사용된 업로드 경로입니다.");
    this.name = "StoragePathConflictError";
  }
}

const defaultDependencies: CreateUploadJobDependencies = {
  authorize: requireMember,
  async insertJob(input) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("upload_jobs")
      .insert({
        created_by: input.createdBy,
        file_name: input.fileName,
        kind: input.kind,
        sha256: input.sha256.toLowerCase(),
        size_bytes: input.sizeBytes,
        status: input.status,
        storage_path: input.storagePath,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as UploadJob;
  },
};

function validateInput(input: UploadJobInput) {
  if (!uploadKinds.includes(input.kind)) {
    throw new InvalidWorkbookError("지원하지 않는 데이터 종류입니다.");
  }
  if (!/^[^/\\\u0000-\u001f]+\.xlsx$/i.test(input.fileName)) {
    throw new InvalidWorkbookError("XLSX 파일만 업로드할 수 있습니다.");
  }
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_WORKBOOK_SIZE_BYTES
  ) {
    throw new InvalidWorkbookError("파일 크기는 1바이트 이상 200MB 이하여야 합니다.");
  }
  if (!/^[0-9a-f]{64}$/i.test(input.sha256)) {
    throw new InvalidWorkbookError("SHA-256 값이 올바르지 않습니다.");
  }
}

function validateOwnedVersionedPath(
  input: UploadJobInput,
  userId: string,
) {
  const segments = input.storagePath.split("/");
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    segments.length !== 4 ||
    segments[0] !== userId ||
    segments[1] !== input.kind ||
    !uuidPattern.test(segments[2]) ||
    segments[3] !== input.fileName ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new InvalidWorkbookError("사용자별 버전 업로드 경로가 올바르지 않습니다.");
  }
}

function classifyConflict(error: unknown): never {
  const conflict = error as DatabaseConflict;
  const evidence = `${conflict.message ?? ""} ${conflict.details ?? ""}`;

  if (conflict.code === "23505" && evidence.includes("kind, sha256")) {
    throw new DuplicateWorkbookError();
  }
  if (conflict.code === "23505" && evidence.includes("storage_path")) {
    throw new StoragePathConflictError();
  }
  throw error;
}

export async function createUploadJob(
  input: UploadJobInput,
  dependencies: CreateUploadJobDependencies = defaultDependencies,
): Promise<UploadJob> {
  validateInput(input);
  const member = await dependencies.authorize();
  validateOwnedVersionedPath(input, member.user_id);

  try {
    return await dependencies.insertJob({
      ...input,
      sha256: input.sha256.toLowerCase(),
      createdBy: member.user_id,
      status: "waiting",
    });
  } catch (error) {
    classifyConflict(error);
  }
}
