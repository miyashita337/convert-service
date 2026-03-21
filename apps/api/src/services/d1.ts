import type { ConversionCategory, ConversionJob, JobStatus, OutputFormat } from "@quickconv/shared";

export async function createJob(
  db: D1Database,
  job: Pick<ConversionJob, "id" | "inputFileKey" | "inputFormat" | "outputFormat" | "expiresAt"> & {
    category?: ConversionCategory;
  }
): Promise<void> {
  const category = job.category ?? "image";
  await db
    .prepare(
      `INSERT INTO jobs (id, input_file_key, input_format, output_format, status, category, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`
    )
    .bind(job.id, job.inputFileKey, job.inputFormat, job.outputFormat, category, job.expiresAt)
    .run();
}

export async function getJob(db: D1Database, jobId: string): Promise<ConversionJob | null> {
  const result = await db.prepare("SELECT * FROM jobs WHERE id = ?").bind(jobId).first();
  if (!result) return null;
  return mapRow(result);
}

export async function updateJobStatus(
  db: D1Database,
  jobId: string,
  status: JobStatus,
  extra?: { outputFileKey?: string; fileSize?: number; errorMessage?: string; progress?: number }
): Promise<void> {
  const sets = ["status = ?", "updated_at = datetime('now')"];
  const values: (string | number)[] = [status];

  if (extra?.outputFileKey) {
    sets.push("output_file_key = ?");
    values.push(extra.outputFileKey);
  }
  if (extra?.fileSize) {
    sets.push("file_size = ?");
    values.push(extra.fileSize);
  }
  if (extra?.errorMessage) {
    sets.push("error_message = ?");
    values.push(extra.errorMessage);
  }
  if (extra?.progress !== undefined) {
    sets.push("progress = ?");
    values.push(extra.progress);
  }

  values.push(jobId);
  await db
    .prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function updateJobProgress(
  db: D1Database,
  jobId: string,
  progress: number
): Promise<void> {
  await db
    .prepare("UPDATE jobs SET progress = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(progress, jobId)
    .run();
}

function mapRow(row: Record<string, unknown>): ConversionJob {
  return {
    id: row.id as string,
    inputFileKey: row.input_file_key as string,
    inputFormat: row.input_format as string,
    outputFormat: row.output_format as OutputFormat,
    outputFileKey: (row.output_file_key as string) ?? null,
    status: row.status as JobStatus,
    fileSize: (row.file_size as number) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    progress: (row.progress as number) ?? 0,
    category: (row.category as ConversionCategory) ?? "image",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    expiresAt: row.expires_at as string,
  };
}
