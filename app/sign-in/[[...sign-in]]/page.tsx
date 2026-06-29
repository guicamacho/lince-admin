import Image from "next/image";
import { SignIn } from "@clerk/nextjs";

// Login only — no <SignUp/>, no signup link (staff are provisioned by hand in the
// separate admin Clerk instance; signups are disabled there). PRD-04 AD-1.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Image src="/lince-mark-light.svg" alt="" width={36} height={36} priority />
        <span className="font-display text-2xl font-bold">
          Lince <span className="text-gold-500">Admin</span>
        </span>
      </div>
      {expired && (
        <p className="mb-4 w-full max-w-sm rounded-lg border border-ink-500 bg-ink-700 px-3 py-2 text-center text-sm text-warm-300">
          Sua sessão expirou. Entre novamente.
        </p>
      )}
      <SignIn />
      <p className="mt-8 text-xs uppercase tracking-[0.18em] text-warm-500">
        Console interno · acesso restrito
      </p>
    </main>
  );
}
