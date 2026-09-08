import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "StockRx",
  description: "Pharmacy inventory and sales tracking for store owners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={`${sans.variable} h-full`}>
      <body
        className="min-h-full font-sans antialiased"
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
