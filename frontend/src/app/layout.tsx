import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { HyperionSDKProvider } from "@/components/HyperionSDKProvider";
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fleeditto DeFi Dashboard",
  description: "Professional DeFi liquidity management dashboard for batched pool operations",
  icons: {
    icon: [
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <HyperionSDKProvider>
          <Providers>
            {children}
          </Providers>
        </HyperionSDKProvider>
      </body>
    </html>
  );
}
