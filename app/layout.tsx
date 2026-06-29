import type { Metadata } from "next";
import { Schibsted_Grotesk, Manrope, Space_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  weight: ["400", "500", "600", "700", "800"],
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Lince Admin",
  description: "Console interno — operações, compliance e tesouraria.",
};

// Admin Clerk instance is SEPARATE from the customer pool (PRD-02 §4A): login-only,
// no signup route. MFA is enforced at the Clerk instance level.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      localization={ptBR}
      signInUrl="/sign-in"
      signInForceRedirectUrl="/dashboard"
      signInFallbackRedirectUrl="/dashboard"
      appearance={{
        variables: {
          colorPrimary: "#f2a93c",
          colorBackground: "#0e1411",
          colorNeutral: "#e8eae6",
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
          borderRadius: "0.625rem",
        },
      }}
    >
      <html
        lang="pt-BR"
        className={`${schibsted.variable} ${manrope.variable} ${spaceMono.variable} h-full antialiased`}
      >
        <body className="min-h-full bg-ink-900 font-sans text-warm-100">{children}</body>
      </html>
    </ClerkProvider>
  );
}
