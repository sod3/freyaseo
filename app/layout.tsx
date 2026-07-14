import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.freyaseo.com"),
  title: {
    default: "Rank First on Google & AI | Multilingual SEO Agency - FreyaSEO",
    template: "%s",
  },
  description:
    "Freya SEO is an SEO agency specializing in SEO for AI search and multilingual SEO, helping businesses rank higher and grow in global markets.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#081c15",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link href="/wp-clone/wp-combined.css" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
