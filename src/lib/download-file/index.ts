import path from "node:path";
import { promises as fs } from "fs";

export type DownloadProgress = {
  percentage: number;
  totalBytes: number;
  downloadedBytes: number;
};

export const downloadFile = async ({
  URL,
  destination,
  onProgress,
}: {
  URL: string;
  destination: string;
  onProgress?: (progress: DownloadProgress) => void;
}) => {
  const response = await fetch(URL);

  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`
    );
  }

  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
  let downloadedBytes = 0;

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];

  let lastProgress = null;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      downloadedBytes += value.length;

      if (onProgress) {
        const percentage = totalBytes
          ? Math.floor((downloadedBytes / totalBytes) * 100)
          : 0;

        if (percentage !== lastProgress) {
          onProgress({
            percentage,
            totalBytes: totalBytes ?? 0,
            downloadedBytes,
          });
        }

        lastProgress = percentage;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);
};
