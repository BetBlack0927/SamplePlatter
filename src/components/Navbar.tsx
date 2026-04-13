import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { NavLinks } from "@/components/NavLinks";


export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileUsername: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profileUsername = (data as any)?.username ?? null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        {/* Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group"
        >
          <span className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center">
            <span className="text-[10px] font-mono font-black text-black leading-none">
              SP
            </span>
          </span>
          <span className="text-sm font-semibold tracking-tight text-text-primary hidden sm:block">
            Sample Platter
          </span>
        </Link>

        <NavLinks />

        {/* Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {profileUsername ? (
                <Link
                  href={`/profile/${profileUsername}`}
                  className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded-sm hover:bg-surface"
                >
                  {profileUsername}
                </Link>
              ) : (
                // Authenticated but profile not found yet — show email prefix
                <span className="text-xs font-mono text-text-muted px-2 py-1">
                  {user.email?.split("@")[0] ?? "account"}
                </span>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-sm hover:bg-surface"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors px-2 py-1 rounded-sm hover:bg-surface"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-xs font-mono bg-accent text-black font-semibold px-3 py-1.5 rounded-sm hover:bg-accent/90 transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
