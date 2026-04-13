"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthState } from "@/lib/actions/auth";

const INPUT_CLASS =
  "w-full bg-surface border border-border rounded-sm px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors";

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(
    signUp,
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block text-[10px] font-mono uppercase tracking-widest text-text-muted"
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
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="display_name"
            className="block text-[10px] font-mono uppercase tracking-widest text-text-muted"
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
          />
        </div>
      </div>

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
          minLength={8}
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          className={INPUT_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-accent text-black text-sm font-mono font-semibold py-2.5 rounded-sm hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {pending ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-[10px] font-mono text-text-muted text-center leading-relaxed">
        By signing up you agree to the rules of the platter.
      </p>

      <p className="text-xs font-mono text-text-muted text-center">
        Already on the platter?{" "}
        <Link
          href="/sign-in"
          className="text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
