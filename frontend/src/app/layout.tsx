import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "The bid no one else can see · solidity to daml on canton",
  description:
    "The same sealed-bid auction, built twice: EVM commit/reveal vs. Canton's native privacy. Place a bid and watch what each party is, and isn't, allowed to see.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="grain min-h-full">
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
