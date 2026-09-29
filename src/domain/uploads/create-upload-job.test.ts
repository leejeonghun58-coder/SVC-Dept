import { describe, expect, it, vi } from "vitest";

import { AuthenticationRequiredError } from "@/lib/auth/require-member";

import {
  DuplicateWorkbookError,
  InvalidWorkbookError,
  StoragePathConflictError,
  createUploadJob,
  type CreateUploadJobDependencies,
  type UploadJob,
} from "./create-upload-job";

const userId = "20000000-0000-0000-0000-000000000001";
const sha256 = "a".repeat(64);
const storagePath = `${userId}/shipment/30000000-0000-4000-8000-000000000001/source.xlsx`;

const createdJob: UploadJob = {
  completed_at: null,
  created_at: "2026-09-29T00:00:00.000Z",
  created_by: userId,
  error_code: null,
  error_message: null,
  file_name: "source.xlsx",
  id: 1,
  kind: "shipment",
  progress_percent: 0,
  public_id: "30000000-0000-4000-8000-000000000001",
  sha256,
  size_bytes: 1024,
  status: "waiting",
  storage_path: storagePath,
  updated_at: "2026-09-29T00:00:00.000Z",
};

function dependencies(
  overrides: Partial<CreateUploadJobDependencies> = {},
): CreateUploadJobDependencies {
  return {
    authorize: vi.fn(async () => ({ user_id: userId })),
    insertJob: vi.fn(async () => createdJob),
    ...overrides,
  };
}

function validInput() {
  return {
    kind: "shipment" as const,
    fileName: "source.xlsx",
    sizeBytes: 1024,
    sha256,
    storagePath,
  };
}

describe("createUploadJob", () => {
  it("rejects files that are not XLSX workbooks", async () => {
    const input = { ...validInput(), fileName: "source.csv" };

    await expect(createUploadJob(input, dependencies())).rejects.toBeInstanceOf(
      InvalidWorkbookError,
    );
  });

  it.each([0, 209_715_201])("rejects unsupported size %i", async (sizeBytes) => {
    const input = { ...validInput(), sizeBytes };

    await expect(createUploadJob(input, dependencies())).rejects.toBeInstanceOf(
      InvalidWorkbookError,
    );
  });

  it("rejects unauthenticated job creation before inserting", async () => {
    const insertJob = vi.fn(async () => createdJob);
    const deps = dependencies({
      authorize: vi.fn(async () => {
        throw new AuthenticationRequiredError();
      }),
      insertJob,
    });

    await expect(createUploadJob(validInput(), deps)).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );
    expect(insertJob).not.toHaveBeenCalled();
  });

  it("rejects a duplicate workbook hash", async () => {
    const deps = dependencies({
      insertJob: vi.fn(async () => {
        throw Object.assign(new Error("Key (kind, sha256) already exists"), {
          code: "23505",
          details: "Key (kind, sha256)=(shipment, hash) already exists.",
        });
      }),
    });

    await expect(createUploadJob(validInput(), deps)).rejects.toBeInstanceOf(
      DuplicateWorkbookError,
    );
  });

  it("rejects storage-path reuse", async () => {
    const deps = dependencies({
      insertJob: vi.fn(async () => {
        throw Object.assign(new Error("Key (storage_path) already exists"), {
          code: "23505",
          details: "Key (storage_path)=(existing.xlsx) already exists.",
        });
      }),
    });

    await expect(createUploadJob(validInput(), deps)).rejects.toBeInstanceOf(
      StoragePathConflictError,
    );
  });

  it("rejects paths outside the authenticated user's versioned folder", async () => {
    const input = {
      ...validInput(),
      storagePath: "another-user/shipment/source.xlsx",
    };

    await expect(createUploadJob(input, dependencies())).rejects.toBeInstanceOf(
      InvalidWorkbookError,
    );
  });

  it("creates a waiting job for a valid immutable path", async () => {
    const deps = dependencies();

    await expect(createUploadJob(validInput(), deps)).resolves.toEqual(createdJob);
    expect(deps.insertJob).toHaveBeenCalledWith({
      ...validInput(),
      createdBy: userId,
      status: "waiting",
    });
  });
});
