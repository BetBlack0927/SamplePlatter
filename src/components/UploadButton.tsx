"use client";

import { useState } from "react";
import { UploadModal } from "@/components/UploadModal";

interface UploadButtonProps {
  sampleId: string;
  userId: string;
  activeDate: string;
}

/**
 * Thin client component that owns the open/closed state of the upload modal.
 * The Today page (Server Component) passes in the sample context.
 */
export function UploadButton({ sampleId, userId, activeDate }: UploadButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-1 btn btn-primary btn-md uppercase tracking-wider"
      >
        <UploadIcon />
        Upload Your Flip
      </button>

      {open && (
        <UploadModal
          sampleId={sampleId}
          userId={userId}
          activeDate={activeDate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function UploadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 9V2M3 4.5l3-3 3 3M1 9.5v1a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-1" />
    </svg>
  );
}
