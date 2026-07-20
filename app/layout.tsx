import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";

import "./globals.css";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeSync } from "@/components/providers/theme-sync";
import { ServiceWorkerRegister } from "@/components/providers/service-worker";
import { GlobalErrorHandler } from "@/components/providers/global-error-handler";

const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "BrainBloom",
  description: "Train your brain every day.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BrainBloom",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
    ],
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f0f9" },
    { media: "(prefers-color-scheme: dark)", color: "#07070a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="en"
        suppressHydrationWarning
      >
        <head>
          {adsenseId && (
            <Script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
          )}
        </head>
        <body
        className={`${inter.variable} ${jakarta.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <ThemeSync />
          <ServiceWorkerRegister />
          <GlobalErrorHandler />
        </ThemeProvider>
      </body>
    </html>
  );
}