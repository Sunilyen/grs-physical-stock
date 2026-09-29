import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/app-shell";

export const metadata: Metadata = {
  title: "GRS Physical Stock — Purchase & Store Management",
  description: "End-of-Day Physical Stock Counting Module",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
