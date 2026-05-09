import '@fontsource-variable/inter';
import '@/styles/tokens.css';
import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import { AppChrome } from '@/components/layout/AppChrome';
import { ThemeScript } from '@/components/layout/ThemeScript';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'NS Learner Test Practice — Free Nova Scotia Class 7 Practice Exam',
  description:
    "Practice for your Nova Scotia Class 7 learner's licence with free mock exams based on the official driver's handbook.",
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'NS Learner Test Practice — Free Nova Scotia Class 7 Practice Exam',
    description:
      "Practice for your Nova Scotia Class 7 learner's licence with free mock exams based on the official driver's handbook.",
    url: SITE_URL,
    siteName: 'NS Learner Test Practice',
    locale: 'en_CA',
    type: 'website',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: '#E8601C',
  colorScheme: 'light dark',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'NS Learner Test Practice',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any',
  url: SITE_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'CAD',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en-CA" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ThemeScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
