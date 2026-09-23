import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { ConvixWordmark } from "@/components/brand/logo";

export const metadata = {
  title: "Inloggen",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;
  const configMissing = errorParam === "config";
  const authError = errorParam === "auth";

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-app-atmosphere" />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="glass-card rounded-[1.75rem] p-6">
          <Link href="/" className="inline-flex w-fit">
            <ConvixWordmark />
          </Link>
          <div className="mt-8">
            <LoginForm
              configMissing={configMissing}
              authError={authError}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
