import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "../lib/auth";
import OnboardingModal from "../components/OnboardingModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Age of Self-Realization | Book Launch & Creator Community",
  description: "Join the crowdfunding campaign and participate in the interactive inline reading community for the book launch of The Age of Self-Realization.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const needsOnboarding = !!(user && !user.display_name);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#040408] text-white">
        {children}
        <OnboardingModal isOpen={needsOnboarding} />
      </body>
    </html>
  );
}
