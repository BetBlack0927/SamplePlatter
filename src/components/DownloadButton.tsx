"use client";

import { useState } from "react";

interface DownloadButtonProps {
  audioUrl: string;
  storagePath: string;
  /** Sample title — used to name the downloaded file, e.g. "Late Summer" → late-summer.mp3 */
  title: string;
}

/**
 * Triggers a browser download of the sample audio file.
 *
 * Strategy: append `?download=filename.ext` to the public Supabase Storage URL.
 * The Storage CDN reads that param and responds with
 * `Content-Disposition: attachment; filename="..."`, so the browser saves it
 * instead of opening it. No blob-fetching, no server round-trip.
 */
export function DownloadButton({ audioUrl, storagePath, title }: DownloadButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const canDownload = !!audioUrl && !!storagePath;

  const handleDownload = () => {
    if (!canDownload || status === "loading") return;
    setStatus("loading");

    const ext = extractExt(storagePath);
    const filename = `${slugify(title)}.${ext}`;
    const downloadUrl = `${audioUrl}?download=${encodeURIComponent(filename)}`;

    const a = document.createElement("a");
    a.href = downloadUrl;
    // The download attribute is a hint; the server Content-Disposition header
    // is what actually forces the save dialog cross-origin.
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Brief "done" flash, then back to idle
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2000);
  };

  if (!canDownload) {
    return (
      <span className="flex items-center gap-1.5 text-text-muted text-[11px] font-mono px-3 py-2.5 cursor-not-allowed opacity-40 select-none">
        <DownloadIcon />
        Unavailable
      </span>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={status === "loading"}
      className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary text-[11px] font-mono px-3 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={`Download ${title}`}
    >
      {status === "loading" ? (
        <>
          <SpinnerIcon />
          <span>Downloading…</span>
        </>
      ) : status === "done" ? (
        <>
          <CheckIcon />
          <span>Saved</span>
        </>
      ) : (
        <>
          <DownloadIcon />
          <span>Download</span>
        </>
      )}
    </button>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

/** "my beat.mp3" or "my%20beat.mp3" → "mp3" */
function extractExt(storagePath: string): string {
  const decoded = decodeURIComponent(storagePath);
  const last = decoded.split("/").pop() ?? "";
  return last.includes(".") ? last.split(".").pop()!.toLowerCase() : "mp3";
}

/** "Late Summer" → "late-summer" */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ─── Icons ───────────────────────────────────────────────────── */

function DownloadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 1v7M3 5.5l3 3 3-3M1 9.5v1a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-1" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent">
      <polyline points="2 6 5 9 10 3" />
    </svg>
  );
}
