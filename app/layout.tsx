import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicRelay",
  description:
    "A local-first Gemma 4 app that turns public-service paperwork into a multilingual action plan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
