import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { FORMAT_TO_MIME } from "@quickconv/shared";

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });

  const response = await client.send(command);
  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function uploadToR2(key: string, buffer: Buffer, format: string): Promise<void> {
  const client = getClient();
  const contentType = FORMAT_TO_MIME[format] || "application/octet-stream";

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await client.send(command);
}
