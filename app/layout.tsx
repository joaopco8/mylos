import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/components/WalletProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FieldCall — AI-Powered World Cup Analysis",
  description:
    "Ask anything about the 2026 World Cup. Live data via TxLINE, AI analysis, verifiable cost on Solana.",
  openGraph: {
    title: "FieldCall — AI-Powered World Cup Analysis",
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
      <body className="h-full">
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
