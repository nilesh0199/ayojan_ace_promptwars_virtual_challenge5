import type { Metadata, Viewport } from 'next';
import { Fraunces, DM_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-context';
import { PlanProvider } from '@/components/plan-context';
import { APP_NAME, APP_TAGLINE, APP_ONE_LINER } from '@/lib/constants';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: APP_ONE_LINER,
  applicationName: APP_NAME,
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_ONE_LINER,
    type: 'website',
    siteName: APP_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_ONE_LINER,
  },
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF9F5' },
    { media: '(prefers-color-scheme: dark)', color: '#121417' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${dmSans.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('aayojan_ace_theme');
                  var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-paper text-ink antialiased min-h-screen w-full flex flex-col selection:bg-accent-subtle selection:text-accent">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-text focus:shadow-lg focus:ring-2 focus:ring-accent-hover"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthProvider>
            <PlanProvider>
              {children}
            </PlanProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
