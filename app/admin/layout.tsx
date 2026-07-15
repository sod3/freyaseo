import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Freya SEO Admin",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
