import bundleAnalyzer from '@next/bundle-analyzer';
import nextPwa from 'next-pwa';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withPwa = nextPwa({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
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
      urlPattern: /^\/signs\/.*\.svg$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'road-sign-assets',
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'export',
  trailingSlash: true,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withBundleAnalyzer(withPwa(nextConfig));
