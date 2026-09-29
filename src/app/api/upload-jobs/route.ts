import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DuplicateWorkbookError,
  InvalidWorkbookError,
  StoragePathConflictError,
  createUploadJob,
} from "@/domain/uploads/create-upload-job";
import { uploadKinds } from "@/domain/uploads/upload-types";
import { AdministratorRequiredError, requireAdministrator } from "@/lib/auth/require-admin";
import {
  AuthenticationRequiredError,
  InactiveMemberError,
  MembershipRequiredError,
} from "@/lib/auth/require-member";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  kind: z.enum(uploadKinds),
  fileName: z.string().min(1).max(255).regex(/\.xlsx$/i),
  sizeBytes: z.number().int().positive().max(200 * 1024 * 1024),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i),
}).strict();

function safeFileName(fileName: string) {
  const sanitized = fileName
    .normalize("NFKC")
    .trim()
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .replace(/\s+/g, " ");
  return sanitized || "workbook.xlsx";
}

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof MembershipRequiredError || error instanceof InactiveMemberError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof AdministratorRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof InvalidWorkbookError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof DuplicateWorkbookError || error instanceof StoragePathConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return NextResponse.json(
    { error: "업로드 작업을 처리하지 못했습니다." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    await requireAdministrator();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("upload_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ jobs: data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await requireAdministrator();
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "XLSX 파일 정보가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const fileName = safeFileName(parsed.data.fileName);
    const versionId = randomUUID();
    const storagePath = `${member.user_id}/${parsed.data.kind}/${versionId}/${fileName}`;
    const job = await createUploadJob({ ...parsed.data, fileName, storagePath });

    return NextResponse.json(
      {
        job,
        upload: {
          bucketName: "source-workbooks",
          publicId: job.public_id,
          sha256: job.sha256,
          storagePath: job.storage_path,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
