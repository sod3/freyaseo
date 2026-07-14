import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import { Header } from "@/src/components/layout/Header";
import { Footer } from "@/src/components/layout/Footer";
import { commonEn } from "@/src/content/common/en";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "greek"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.freyaseo.com"),
  title: {
    default: "Freya SEO | AI-Powered SEO & Digital Growth",
    template: "%s",
  },
  description:
    "Freya SEO creates AI-powered SEO, automation, reporting and custom tools for measurable organic growth.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#082014",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${notoSans.variable} antialiased`}>
        <a className="skip-link" href="#main-content">
          {commonEn.skipToContent}
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
