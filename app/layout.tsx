import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/components/WalletProvider";

// `next build` loads this layout module in several parallel workers to
// prerender routes — without this guard, each one would call bot.launch()
// and open a competing long-poll connection to the same token (and then
// immediately error on shutdown, since launch() never got to finish).
if (
  process.env.TELEGRAM_BOT_TOKEN &&
  process.env.NODE_ENV !== "test" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  import("@/lib/telegramBot")
    .then(({ startBot }) => startBot())
    .catch(console.error);
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Mylos — AI-Powered World Cup Analysis",
  description:
    "Ask anything about the 2026 World Cup. Live data via TxLINE, AI analysis, verifiable cost on Solana.",
  icons: {
    icon: "/faviconbola.webp",
    shortcut: "/faviconbola.webp",
    apple: "/faviconbola.webp",
  },
  openGraph: {
    title: "Mylos — AI-Powered World Cup Analysis",
    description: "Live data · AI · On-chain cost",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full overflow-x-hidden" suppressHydrationWarning>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
