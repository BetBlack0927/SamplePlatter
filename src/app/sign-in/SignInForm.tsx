"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthState } from "@/lib/actions/auth";

const INPUT_CLASS =
  "w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors";

export function SignInForm() {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    signIn,
    null
  );

  return (
    <form action={action} className="space-y-4">
      {/* Inline error */}
      {state?.error && (
        <div className="px-3 py-2.5 bg-error/10 border border-error/30 rounded-sm">
          <p className="text-xs font-mono text-error">{state.error}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-[10px] font-mono uppercase tracking-widest text-text-muted"
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
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-[10px] font-mono uppercase tracking-widest text-text-muted"
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
          className={INPUT_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-accent text-black text-sm font-mono font-semibold py-2.5 rounded-sm hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {pending ? "Signing in…" : "Sign In"}
      </button>

      <p className="text-xs font-mono text-text-muted text-center">
        No account?{" "}
        <Link
          href="/sign-up"
          className="text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
