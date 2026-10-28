import type { Metadata } from "next";
import { siteConfig, socialLinks } from "@/config/site";

export type ShareImage = { url: string; width: number; height: number; alt: string };

export const PROFILE_IMAGE: ShareImage = { url: "/assets/profile-photo.jpg", width: 1254, height: 1254, alt: siteConfig.name };
export const TTC_IMAGE: ShareImage = { url: "/assets/og/ttc-pulse.jpg", width: 1200, height: 630, alt: "TTC Pulse dashboard: worst routes, peak hours and causes of TTC delays" };

// Pages about TTC Pulse share the dashboard image. Other pages share the profile photo.
const TTC_PATHS = ["/demos/ttc-pulse", "/blog/how-ttc-pulse-works", "/projects/ttc-interactive-dashboard"];
export const shareImageFor = (path: string): ShareImage => (TTC_PATHS.includes(path) ? TTC_IMAGE : PROFILE_IMAGE);

export const absoluteUrl = (path: string) => new URL(path, siteConfig.siteUrl).toString();

// Next.js replaces the whole openGraph object of the layout when a page sets one.
// So each page sets its own title, URL and image here, or it shares the home page preview.
export function pageMetadata(opts: { title: string; description: string; path: string; type?: "website" | "article"; publishedTime?: string; image?: ShareImage }): Metadata {
  const image = opts.image ?? shareImageFor(opts.path);
  const fullTitle = `${opts.title} | ${siteConfig.shortName}`;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      title: fullTitle,
      description: opts.description,
      url: opts.path,
      siteName: siteConfig.name,
      type: opts.type ?? "website",
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime, authors: [siteConfig.name] } : {}),
      images: [image]
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: opts.description,
      images: [image.url]
    }
  };
}

export const personId = `${siteConfig.siteUrl}/#person`;

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    image: absoluteUrl(siteConfig.profileImage),
    jobTitle: siteConfig.role,
    description: siteConfig.description,
    address: { "@type": "PostalAddress", addressLocality: "Toronto", addressRegion: "ON", addressCountry: "CA" },
    sameAs: socialLinks.filter((l) => l.href.startsWith("https://")).map((l) => l.href)
  };
}

export function articleJsonLd(post: { title: string; excerpt: string; date: string; slug: string; tags: string[] }) {
  const path = `/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    image: absoluteUrl(shareImageFor(path).url),
    keywords: post.tags.join(", "),
    author: { "@type": "Person", "@id": personId, name: siteConfig.name, url: siteConfig.siteUrl }
  };
}

const TTC_DESCRIPTION =
  "Reliability analysis of 1,111,831 TTC bus, subway and streetcar delay events from January 2014 to January 2026, joined to the TTC GTFS schedule. It gives delay counts by route, station, hour and cause, and a reliability score with a sample-size adjustment.";

export function ttcPulseJsonLd() {
  const url = absoluteUrl("/demos/ttc-pulse");
  const author = { "@type": "Person", "@id": personId, name: siteConfig.name, url: siteConfig.siteUrl };
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "TTC Pulse",
      url,
      description: "A free dashboard and AI chat about TTC delays: worst routes and stations, peak hours, causes, live alerts and vehicles, and a reliability score.",
      applicationCategory: "Data visualization",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
      image: absoluteUrl(TTC_IMAGE.url),
      author
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "TTC Pulse: TTC delay events and route reliability scores",
      description: TTC_DESCRIPTION,
      url,
      sameAs: "https://github.com/PATELOM925/TTC-PULSE",
      keywords: ["TTC", "Toronto Transit Commission", "transit delays", "bus delays", "subway delays", "streetcar delays", "reliability", "GTFS", "Toronto"],
      creator: author,
      isAccessibleForFree: true,
      temporalCoverage: "2014-01-01/2026-01-31",
      spatialCoverage: { "@type": "Place", name: "Toronto, Ontario, Canada" },
      isBasedOn: [
        "https://open.toronto.ca/dataset/ttc-bus-delay-data/",
        "https://open.toronto.ca/dataset/ttc-subway-delay-data/",
        "https://open.toronto.ca/dataset/ttc-streetcar-delay-data/"
      ],
      license: "https://open.toronto.ca/open-data-licence/"
    }
  ];
}

// Escape "<" so that text in the data cannot close the script tag.
export const jsonLdHtml = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
