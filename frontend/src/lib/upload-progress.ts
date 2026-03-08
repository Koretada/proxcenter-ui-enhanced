// In-memory upload progress tracking (server-side only)

export type UploadProgress = {
  bytesSent: number
  totalBytes: number
  status: "transferring" | "done" | "error"
  error?: string
}

const uploads = new Map<string, UploadProgress>()

export function setProgress(uploadId: string, progress: UploadProgress) {
  uploads.set(uploadId, progress)
}

export function getProgress(uploadId: string): UploadProgress | null {
  return uploads.get(uploadId) || null
}

export function clearProgress(uploadId: string) {
  uploads.delete(uploadId)
}
