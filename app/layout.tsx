import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Footer } from "@/components/layout";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VisionBatch - Batch Tagging for Etsy & Adobe Stock",
  description:
    "AI-powered batch tagging tool for marketplace sellers. Automate your product listings with smart clustering and Claude Vision.",
  keywords: ["batch tagging", "etsy", "adobe stock", "ai tagging", "product listing"],
  verification: {
    google: "C9M-8n8R4gW8Q4SKws3RdzvF4xwaSJFGtLpRV5x487A",
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <Footer />
          <Toaster position="bottom-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
