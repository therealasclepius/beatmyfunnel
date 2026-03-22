import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Beat My Funnel — Don't Pitch for the Work. Win It.",
  description:
    "Beat My Funnel is a performance marketplace where brands post challenges and operators compete to prove they're better. Winners get paid — and often get the client.",
  openGraph: {
    type: "website",
    url: "https://beatmyfunnel.com/",
    title: "Beat My Funnel — Don't Pitch for the Work. Win It.",
    description:
      "A performance marketplace where brands post challenges and operators compete to prove they're better. Winners get paid — and often get the client.",
    images: ["https://beatmyfunnel.com/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beat My Funnel — Don't Pitch for the Work. Win It.",
    description:
      "A performance marketplace where brands post challenges and operators compete to prove they're better. Winners get paid — and often get the client.",
    images: ["https://beatmyfunnel.com/og-image.png"],
  },
  alternates: {
    canonical: "https://beatmyfunnel.com/",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔️</text></svg>",
  },
};

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Beat My Funnel",
  url: "https://beatmyfunnel.com",
  description:
    "A performance marketplace where brands post challenges and operators compete to prove they're better. Winners get paid — and often get the client.",
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Beat My Funnel",
  url: "https://beatmyfunnel.com",
  description: "The performance marketplace for the next wave of work.",
  foundingDate: "2026",
};

const jsonLdFAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Beat My Funnel?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A performance marketplace where brands post challenges with real money in escrow. Operators compete to beat the brand's current metrics. Winners get paid automatically — and the best brands hire the winner. No pitch decks. No retainers. Just results.",
      },
    },
    {
      "@type": "Question",
      name: "How do challenges work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Brand defines a metric and current baseline (e.g. 3.2% CVR). Sets a prize and deposits it into escrow. Operators apply and submit their version. The platform verifies results via Shopify or GA4. If someone beats the baseline at the minimum traffic threshold, the prize releases automatically.",
      },
    },
    {
      "@type": "Question",
      name: "How does escrow work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Funds are held by the platform from the moment a challenge goes live. The brand cannot withdraw them during the challenge window. If nobody beats the baseline, the full prize is refunded. If someone wins, the prize transfers automatically upon verification.",
      },
    },
    {
      "@type": "Question",
      name: "How are results verified?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We connect directly to your Shopify store or GA4 account via OAuth — read-only access, no changes ever made. The platform reads CVR, sessions, and conversion data directly. No screenshots. No self-reported numbers.",
      },
    },
    {
      "@type": "Question",
      name: "What types of challenges can I post?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Landing pages, ad creative, email flows, homepages, pricing pages — anything with a measurable metric.",
      },
    },
    {
      "@type": "Question",
      name: "What does it cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Free to post. Free to enter. We take 15% of the prize on top of the payout when a challenge is won — charged to the brand. Operators always receive the full advertised prize.",
      },
    },
    {
      "@type": "Question",
      name: "How do submissions work on Beat My Funnel?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Operators apply with a quick pitch covering their background and relevant wins. The brand selects 3-5 finalists. Only finalists build and submit their version. Every submission becomes a verified public portfolio entry. Finalists who don't win earn a Shortlisted badge and receive written feedback from the brand.",
      },
    },
    {
      "@type": "Question",
      name: "What do non-winners get on Beat My Funnel?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every finalist submission becomes a verified public entry on their operator profile. Non-winning finalists earn a Shortlisted badge and receive written feedback from the brand. Brands can also reach out to hire any finalist directly through the platform.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdWebSite),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdOrganization),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdFAQ),
          }}
        />
      </head>
      <body>
        {children}
        <Script
          src="//embed.typeform.com/next/embed.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
