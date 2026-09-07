import bundleAnalyzer from '@next/bundle-analyzer';
import nextPwa from 'next-pwa';
import { randomUUID } from 'node:crypto';

const buildRevision = randomUUID();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withPwa = nextPwa({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: false,
  skipWaiting: false,
  clientsClaim: true,
  dynamicStartUrl: false,
  additionalManifestEntries: ['/', '/exam/', '/results/', '/handbooks/', '/flashcards/'].map(
    (url) => ({ url, revision: buildRevision }),
  ),
  ignoreURLParametersMatching: [
    /^utm_/,
    /^fbclid$/,
    /^mode$/,
    /^historyId$/,
    /^expired$/,
    /^savedExit$/,
    /^savedProgress$/,
    /^_rsc$/,
  ],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/novascotia\.ca\/sns\/rmv\/handbook\/.*\.pdf$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'official-handbook-pdfs',
        expiration: {
          maxEntries: 12,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /^\/signs\/.*\.(svg|png|webp|jpg|jpeg)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'road-sign-assets',
        expiration: {
          maxEntries: 96,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => buildRevision,
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withBundleAnalyzer(withPwa(nextConfig));
