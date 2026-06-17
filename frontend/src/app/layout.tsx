import type { Metadata, Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const SITE_URL = "https://canton-confidential.netlify.app";
const TAGLINE =
  "The same sealed-bid auction, built twice: EVM commit/reveal versus Canton's native privacy.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Confidential Auction on Canton",
  description:
    "The same sealed-bid auction, built twice: EVM commit/reveal vs. Canton's native privacy. Place a bid and watch what each party is, and isn't, allowed to see.",
  openGraph: {
    title: "Confidential Auction on Canton",
    description: TAGLINE,
    url: SITE_URL,
    siteName: "Confidential Auction on Canton",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Confidential Auction on Canton",
    description: TAGLINE,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
