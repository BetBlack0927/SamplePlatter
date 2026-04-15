"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createSubmission } from "@/lib/actions/submissions";

const ACCEPTED_TYPES = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

type Stage = "idle" | "uploading" | "success";

interface UploadModalProps {
  sampleId: string;
  userId: string;
  activeDate: string; // "YYYY-MM-DD" — used for storage path
  onClose: () => void;
}

export function UploadModal({
  sampleId,
  userId,
  activeDate,
  onClose,
}: UploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [isDragging, setIsDragging] = useState(false);

  /* ── File validation ─────────────────────────────────── */

  const validateAndSet = (f: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav)$/i)) {
      setError("Only MP3 and WAV files are accepted.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File is too large. Maximum size is 50 MB.");
      return;
    }
    setFile(f);
    // Pre-fill title from filename (strip extension)
    if (!title) {
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim());
    }
  };

  /* ── Drag and drop ───────────────────────────────────── */

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) validateAndSet(f);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title]
  );

  /* ── Extract audio duration client-side ─────────────── */

  const getDuration = (f: File): Promise<number | null> =>
    new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(f);
        const audio = document.createElement("audio");
        audio.src = url;
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          const d = audio.duration;
          resolve(isFinite(d) ? Math.round(d) : null);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

  /* ── Submit ──────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select an audio file.");
      return;
    }
    if (!title.trim()) {
      setError("Track title is required.");
      return;
    }

    setStage("uploading");

    try {
      // 1. Extract duration
      const durationSeconds = await getDuration(file);

      // 2. Build storage path
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
      const storagePath = `${userId}/${activeDate}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      // 3. Upload to Supabase Storage (browser → storage directly)
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(storagePath, file, {
          contentType: file.type || "audio/mpeg",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 4. Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("submissions").getPublicUrl(storagePath);

      // 5. Save submission row via server action (auth re-verified server-side)
      const result = await createSubmission({
        sampleId,
        title: title.trim(),
        audioUrl: publicUrl,
        storagePath,
        durationSeconds,
      });

      if (result.error) {
        // Roll back the stored file on DB failure
        await supabase.storage.from("submissions").remove([storagePath]);
        throw new Error(result.error);
      }

      // 6. Success
      setStage("success");
      router.refresh();

      // Auto-close after a beat
      setTimeout(onClose, 2200);
    } catch (err) {
      setStage("idle");
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  /* ── Render ──────────────────────────────────────────── */

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={stage === "uploading" ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload your flip"
        className="fixed z-50 inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4"
      >
        <div className="w-full sm:max-w-md bg-background border border-border shadow-2xl" style={{ borderRadius: 'var(--radius-minimal)' }}>
          {stage === "success" ? (
            <SuccessView />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border bg-surface">
                <div>
                  <h2 className="text-sm font-bold text-text-primary tracking-tight">
                    Upload Your Flip
                  </h2>
                  <p className="text-[10px] font-mono text-text-secondary mt-1">
                    MP3 or WAV · max 50 MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={stage === "uploading"}
                  className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors disabled:opacity-30"
                  style={{ borderRadius: 'var(--radius-minimal)' }}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="px-4 py-4 space-y-3">
                {/* Error */}
                {error && (
                  <div className="px-3 py-2.5 bg-error/10 border border-error/30" style={{ borderRadius: 'var(--radius-minimal)' }}>
                    <p className="text-[11px] font-mono text-error">{error}</p>
                  </div>
                )}

                {/* Drop zone */}
                <div
                  ref={dropRef}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed cursor-pointer transition-all duration-150 select-none ${
                    isDragging
                      ? "border-border-focus bg-surface-elevated"
                      : file
                      ? "border-border-focus bg-surface"
                      : "border-border hover:border-border-focus hover:bg-surface"
                  }`}
                  style={{ borderRadius: 'var(--radius-minimal)' }}
                >
                  {file ? (
                    <>
                      <FileCheckIcon />
                      <p className="text-[11px] font-mono text-text-primary text-center px-4 truncate max-w-full font-semibold">
                        {file.name}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB ·{" "}
                        <span
                          className="text-text-primary hover:text-white font-semibold cursor-pointer underline underline-offset-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setError(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          change
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <AudioIcon />
                      <p className="text-[11px] font-mono text-text-secondary text-center">
                        Drop file or{" "}
                        <span className="text-text-primary font-semibold">click to browse</span>
                      </p>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mp3,.wav,audio/mpeg,audio/wav"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) validateAndSet(f);
                    }}
                  />
                </div>

                {/* Title input */}
                <div className="space-y-1">
                  <label
                    htmlFor="flip-title"
                    className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
                  >
                    Track Title
                  </label>
                  <input
                    id="flip-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    placeholder="Name your flip"
                    className="w-full bg-surface border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
                    style={{ borderRadius: 'var(--radius-minimal)' }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 px-4 pb-4">
                <button
                  type="submit"
                  disabled={stage === "uploading" || !file}
                  className="flex-1 btn btn-primary btn-md uppercase tracking-wider"
                >
                  {stage === "uploading" ? (
                    <>
                      <SpinnerIcon />
                      Uploading
                    </>
                  ) : (
                    <>
                      <UploadIcon />
                      Submit Flip
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={stage === "uploading"}
                  className="btn btn-secondary btn-md uppercase tracking-wider disabled:opacity-30"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Success screen ────────────────────────────────────────── */

function SuccessView() {
  return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10">
      <div className="w-11 h-11 bg-surface-elevated border border-border-focus flex items-center justify-center" style={{ borderRadius: 'var(--radius-minimal)' }}>
        <CheckIcon />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-text-primary tracking-tight">Flip submitted</p>
        <p className="text-[11px] font-mono text-text-muted mt-1">
          Your track is live on the Listen page.
        </p>
      </div>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 1l10 10M11 1L1 11" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-text-muted">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function FileCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-text-secondary">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="9 15 11 17 15 13" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 9V2M3 4.5l3-3 3 3M1 9.5v1a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-primary">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="animate-spin"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
