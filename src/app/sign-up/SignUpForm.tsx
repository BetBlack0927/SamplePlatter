"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/lib/actions/auth";

const INPUT_STYLE = { borderRadius: 'var(--radius-minimal)' };
const INPUT_CLASS =
  "w-full bg-surface border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors";

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    signUp,
    null
  );

  return (
    <form action={action} className="space-y-3">
      {/* Inline error */}
      {state?.error && (
        <div className="px-3 py-2.5 bg-error/10 border border-error/30" style={INPUT_STYLE}>
          <p className="text-[11px] font-mono text-error">{state.error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label
            htmlFor="username"
            className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            autoComplete="username"
            placeholder="bxbeats"
            pattern="[a-zA-Z0-9_]+"
            title="Letters, numbers, and underscores only"
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="display_name"
            className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
          >
            Display Name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            maxLength={50}
            autoComplete="name"
            placeholder="BX Beats"
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="block text-[11px] font-mono tracking-[0.08em] text-text-secondary font-semibold"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full btn btn-primary btn-md uppercase tracking-wider mt-1"
      >
        {pending ? "Creating account" : "Create Account"}
      </button>

      <p className="text-[10px] font-mono text-text-muted text-center leading-relaxed">
        By signing up you agree to the rules of the platter.
      </p>

      <p className="text-[11px] font-mono text-text-muted text-center">
        Already on the platter?{" "}
        <Link
          href="/sign-in"
          className="text-text-secondary hover:text-text-primary transition-colors font-semibold"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
