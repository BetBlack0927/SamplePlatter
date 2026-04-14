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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/98 backdrop-blur-sm">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-12 flex items-center gap-6 sm:gap-8">
        {/* Wordmark */}
        <Link
          href="/"
          className="shrink-0 group"
        >
          <span className="text-sm text-text-primary tracking-[-0.02em] leading-none">
            <span className="font-semibold">Sample</span>
            <span className="font-normal"> Platter</span>
          </span>
        </Link>

        <NavLinks />

        {/* Spacer to push auth to right */}
        <div className="flex-1" />

        {/* Auth */}
        <div className="flex items-center gap-1.5 shrink-0">
          {user ? (
            <>
              {profileUsername ? (
                <Link
                  href={`/profile/${profileUsername}`}
                  className="text-[10px] font-mono font-semibold text-text-secondary hover:text-text-primary transition-colors px-2 py-1.5 hover:bg-surface"
                  style={{ borderRadius: 'var(--radius-minimal)' }}
                >
                  {profileUsername}
                </Link>
              ) : (
                <span className="text-[10px] font-mono text-text-muted px-2 py-1.5">
                  {user.email?.split("@")[0] ?? "account"}
                </span>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors px-2 py-1.5 hover:bg-surface"
                  style={{ borderRadius: 'var(--radius-minimal)' }}
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors px-2 py-1.5 hover:bg-surface"
                style={{ borderRadius: 'var(--radius-minimal)' }}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-[10px] font-mono bg-text-primary text-black font-bold px-2.5 py-1.5 hover:bg-white transition-colors uppercase tracking-wide"
                style={{ borderRadius: 'var(--radius-minimal)' }}
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
