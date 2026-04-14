import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/supabase/queries";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function SignInPage() {
  // Redirect already-authenticated users away from the sign-in page
  const session = await getCurrentSession();
  if (session) redirect("/");

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Wordmark */}
        <div className="space-y-3">
          <div className="text-base text-text-primary tracking-[-0.02em] leading-none">
            <span className="font-semibold">Sample</span>
            <span className="font-normal"> Platter</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Welcome back</h1>
            <p className="text-xs text-text-secondary mt-1">
              Sign in to submit your flips.
            </p>
          </div>
        </div>

        <SignInForm />
      </div>
    </div>
  );
}
