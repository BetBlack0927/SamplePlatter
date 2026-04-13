"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* ─── State type shared with client forms ───────────────────── */

export interface AuthState {
  error: string;
}

/* ─── Sign up ───────────────────────────────────────────────── */

/**
 * Server action for sign-up.
 * Compatible with React 19 useActionState — returns AuthState on error,
 * redirects on success (redirect() throws internally and never returns).
 */
export async function signUp(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState | null> {
  const supabase = await createClient();

  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string).trim().toLowerCase();
  const displayName = (formData.get("display_name") as string).trim();

  if (!username || username.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, and underscores." };
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName || username,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Safety net: if the DB trigger didn't create the profile (e.g. trigger not
  // yet applied in this Supabase project), create it here directly.
  if (signUpData.user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", signUpData.user.id)
      .single();

    if (!existingProfile) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("profiles") as any).insert({
        id: signUpData.user.id,
        username,
        display_name: displayName || username,
      });
    }
  }

  redirect("/");
}

/* ─── Sign in ───────────────────────────────────────────────── */

export async function signIn(
  _prev: AuthState | null,
  formData: FormData
): Promise<AuthState | null> {
  const supabase = await createClient();

  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase returns "Invalid login credentials" — keep it user-friendly
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : error.message,
    };
  }

  redirect("/");
}

/* ─── Sign out ──────────────────────────────────────────────── */

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
