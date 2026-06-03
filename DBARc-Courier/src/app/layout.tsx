import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fly Courier - Logistics Dashboard",
  description: "Enterprise Logistics Management Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased light">
      <body className="min-h-full flex flex-col bg-background text-on-surface">
        {children}
      </body>
    </html>
  );
}
