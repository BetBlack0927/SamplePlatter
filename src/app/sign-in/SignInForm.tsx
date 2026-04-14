"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "@/lib/actions/auth";

export function SignInForm() {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    signIn,
    null
  );

  return (
    <form action={action} className="space-y-3">
      {/* Inline error */}
      {state?.error && (
        <div className="px-3 py-2 bg-error/10 border border-error/30" style={{ borderRadius: 'var(--radius-minimal)' }}>
          <p className="text-[10px] font-mono text-error">{state.error}</p>
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-[8px] font-mono uppercase tracking-[0.22em] text-text-muted font-semibold"
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
          className="w-full bg-surface border border-border px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
          style={{ borderRadius: 'var(--radius-minimal)' }}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="block text-[8px] font-mono uppercase tracking-[0.22em] text-text-muted font-semibold"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full bg-surface border border-border px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors"
          style={{ borderRadius: 'var(--radius-minimal)' }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full btn btn-primary btn-md uppercase tracking-wider mt-1"
      >
        {pending ? "Signing in" : "Sign In"}
      </button>

      <p className="text-[10px] font-mono text-text-muted text-center">
        No account?{" "}
        <Link
          href="/sign-up"
          className="text-text-secondary hover:text-text-primary transition-colors font-semibold"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
