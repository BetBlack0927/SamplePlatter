import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/supabase/queries";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default async function SignUpPage() {
  // Redirect already-authenticated users away from the sign-up page
  const session = await getCurrentSession();
  if (session) redirect("/");

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Wordmark */}
        <div className="space-y-3">
          <div className="text-lg font-semibold uppercase text-text-primary tracking-[0.14em] leading-none">
            Freqy
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              Join Freqy
            </h1>
            <p className="text-sm text-text-secondary mt-1.5">
              New flips can hit at any time. Make yours on Freqy.
            </p>
          </div>
        </div>

        <SignUpForm />
      </div>
    </div>
  );
}
