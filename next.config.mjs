/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// Content Security Policy crafted to allow Firebase Auth Google Sign-in & Web SDK while maintaining strict posture
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://apis.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.googleusercontent.com https://lh3.googleusercontent.com;
  font-src 'self' data:;
  connect-src 'self' https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://accounts.google.com https://*.google.com;
  frame-src 'self' https://*.firebaseapp.com https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`
  .replace(/\s{2,}/g, ' ')
  .trim();

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
