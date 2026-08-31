import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Reigna — Outbound Intelligence Platform",
    template: "%s · Reigna",
  },
  description:
    "Reigna finds decision-makers, researches them individually, writes distinct email for each one, and tells you who deserves your attention today.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}