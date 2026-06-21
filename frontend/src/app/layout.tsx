import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stealth Relayer — Privacy Infrastructure",
  description:
    "Gas-abstracted stealth address infrastructure for Solana. Deposit, withdraw, and settle without exposing a trail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-base text-primary font-sans antialiased selection:bg-accent/20 selection:text-accent">
        {children}
      </body>
    </html>
  );
}
