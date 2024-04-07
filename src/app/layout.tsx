import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Čakalne dobe - Sledilnik",
  description: "Pregled čakalnih dob v slovenskem zdravstvu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sl">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
