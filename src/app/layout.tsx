import type { Metadata } from "next";
import { EB_Garamond, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { siteConfig } from "@/config/site";

const headingFont = EB_Garamond({ subsets: ["latin"], variable: "--font-heading" });
const bodyFont = Manrope({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.shortName}`
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    type: "website",
    url: siteConfig.siteUrl,
    images: [{ url: "/assets/profile-photo.png", width: 1400, height: 1400 }]
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/assets/profile-photo.png"]
  },
  icons: {
    icon: "/assets/om-monogram.svg",
    shortcut: "/assets/om-monogram.svg",
    apple: "/assets/om-monogram.svg"
  },
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${headingFont.variable} ${bodyFont.variable}`}
    >
      <body>
        {children}
        {siteConfig.analyticsToken ? (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: siteConfig.analyticsToken })}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
