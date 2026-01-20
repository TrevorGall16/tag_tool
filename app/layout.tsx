import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TagArchitect - Batch Tagging for Etsy & Adobe Stock",
  description:
    "AI-powered batch tagging tool for marketplace sellers. Automate your product listings with smart clustering and Claude Vision.",
  keywords: ["batch tagging", "etsy", "adobe stock", "ai tagging", "product listing"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
