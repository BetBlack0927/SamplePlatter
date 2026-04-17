import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { NavLinks } from "@/components/NavLinks";
import { getCurrentSession } from "@/lib/supabase/queries";


export async function Navbar() {
  const session = await getCurrentSession();
  const user = session?.user ?? null;
  const profileUsername = session?.profile?.username ?? null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/98 backdrop-blur-sm">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-14 flex items-center gap-6 sm:gap-8">
        {/* Wordmark */}
        <Link
          href="/"
          className="shrink-0 group"
        >
          <span className="text-base font-semibold uppercase text-text-primary tracking-[0.14em] leading-none">
            Freqy
          </span>
        </Link>

        <NavLinks />

        {/* Spacer to push auth to right */}
        <div className="flex-1" />

        {/* Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              {profileUsername ? (
                <Link
                  href={`/profile/${profileUsername}`}
                  className="text-[11px] font-mono font-semibold text-text-secondary hover:text-text-primary transition-colors px-2.5 py-1.5 hover:bg-surface"
                  style={{ borderRadius: 'var(--radius-minimal)' }}
                >
                  {profileUsername}
                </Link>
              ) : (
                <span className="text-[11px] font-mono text-text-muted px-2.5 py-1.5">
                  {user.email?.split("@")[0] ?? "account"}
                </span>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors px-2.5 py-1.5 hover:bg-surface"
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
                className="text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors px-2.5 py-1.5 hover:bg-surface"
                style={{ borderRadius: 'var(--radius-minimal)' }}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-[11px] font-mono bg-text-primary text-black font-bold px-3 py-1.5 hover:bg-white transition-colors uppercase tracking-[0.16em]"
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
