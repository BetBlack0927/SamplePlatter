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
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        {/* Wordmark */}
        <div className="space-y-1">
          <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center mb-4">
            <span className="text-xs font-mono font-black text-black">SP</span>
          </div>
          <h1 className="text-xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary">
            Sign in to submit your flips.
          </p>
        </div>

        <SignInForm />
      </div>
    </div>
  );
}
