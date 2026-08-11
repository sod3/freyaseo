import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { readSingleton } from "@/src/lib/cms/reader";
import "./globals.css";

type SiteSettings = {
  defaultTitle?: string;
  description?: string;
  primaryDomain?: string;
  favicon?: string | null;
  appleTouchIcon?: string | null;
  defaultSocialImage?: string | null;
};

type SeoSettings = {
  defaults?: {
    title?: { en?: string };
    description?: { en?: string };
    robotsIndex?: boolean;
    robotsFollow?: boolean;
    openGraphTitle?: { en?: string };
    openGraphDescription?: { en?: string };
    openGraphImage?: string | null;
    twitterTitle?: { en?: string };
    twitterDescription?: { en?: string };
    twitterImage?: string | null;
    twitterCardType?: "summary" | "summary_large_image";
  };
};

function safeMetadataBase(value?: string) {
  try {
    return new URL(value || "https://www.freyaseo.com");
  } catch {
    return new URL("https://www.freyaseo.com");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const [site, seo] = await Promise.all([
    readSingleton<SiteSettings>("siteSettings"),
    readSingleton<SeoSettings>("seoSettings"),
  ]);
  const defaults = seo?.defaults;
  const title = site?.defaultTitle || defaults?.title?.en || "Rank First on Google & AI | Multilingual SEO Agency - FreyaSEO";
  const description =
    site?.description ||
    defaults?.description?.en ||
    "Freya SEO is an SEO agency specializing in SEO for AI search and multilingual SEO, helping businesses rank higher and grow in global markets.";
  const socialImage = defaults?.openGraphImage || site?.defaultSocialImage || "/og.png";
  const favicon = site?.favicon || "/favicon.png";

  return {
    metadataBase: safeMetadataBase(site?.primaryDomain),
    title: { default: title, template: "%s" },
    description,
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: site?.appleTouchIcon || undefined,
    },
    robots: {
      index: defaults?.robotsIndex !== false,
      follow: defaults?.robotsFollow !== false,
    },
    openGraph: {
      title: defaults?.openGraphTitle?.en || title,
      description: defaults?.openGraphDescription?.en || description,
      images: [socialImage],
      type: "website",
    },
    twitter: {
      card: defaults?.twitterCardType || "summary_large_image",
      title: defaults?.twitterTitle?.en || title,
      description: defaults?.twitterDescription?.en || description,
      images: [defaults?.twitterImage || socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#081c15",
};

type MarketingSettings = {
  ga4MeasurementId?: string;
  gtmContainerId?: string;
  searchConsoleVerification?: string;
  bingWebmasterVerification?: string;
  metaPixelId?: string;
  linkedInInsightTagId?: string;
};

function isValidGa4(value?: string) {
  return /^G-[A-Z0-9]+$/.test(value || "");
}

function isValidGtm(value?: string) {
  return /^GTM-[A-Z0-9]+$/.test(value || "");
}

function isSafeTrackingId(value?: string) {
  return /^[A-Za-z0-9_-]+$/.test(value || "");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const marketing = await readSingleton<MarketingSettings>("marketingSettings");
  const gtmId = isValidGtm(marketing?.gtmContainerId) ? marketing?.gtmContainerId : undefined;
  const ga4Id = !gtmId && isValidGa4(marketing?.ga4MeasurementId) ? marketing?.ga4MeasurementId : undefined;
  const metaPixelId = isSafeTrackingId(marketing?.metaPixelId) ? marketing?.metaPixelId : undefined;
  const linkedInInsightTagId = isSafeTrackingId(marketing?.linkedInInsightTagId) ? marketing?.linkedInInsightTagId : undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link href="/wp-clone/wp-combined.css" rel="stylesheet" />
        {marketing?.searchConsoleVerification ? <meta name="google-site-verification" content={marketing.searchConsoleVerification} /> : null}
        {marketing?.bingWebmasterVerification ? <meta name="msvalidate.01" content={marketing.bingWebmasterVerification} /> : null}
      </head>
      <body suppressHydrationWarning>
        {gtmId ? (
          <>
            <Script id="gtm-init" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
            </Script>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          </>
        ) : null}
        {ga4Id ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}',{send_page_view:true});`}
            </Script>
          </>
        ) : null}
        {metaPixelId ? (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
          </Script>
        ) : null}
        {linkedInInsightTagId ? (
          <Script id="linkedin-insight" strategy="afterInteractive">
            {`_linkedin_partner_id='${linkedInInsightTagId}';window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);`}
          </Script>
        ) : null}
        {children}
      </body>
    </html>
  );
}
