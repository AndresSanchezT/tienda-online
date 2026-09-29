import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(appUrl()),
    title: { default: `${settings.storeName} | ${settings.tagline}`, template: `%s | ${settings.storeName}` },
    description: settings.tagline,
    openGraph: { siteName: settings.storeName, locale: "es_PE", type: "website" },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-PE" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
