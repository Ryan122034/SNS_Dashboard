import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNS Dashboard",
  description:
    "Internal dashboard for tracking official channel performance across YouTube, TikTok, Instagram, Facebook, and X."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
