import type { Metadata, Viewport } from "next";
import { ibmPlexSans, ibmPlexSansArabic } from "@/lib/design/fonts";
import "./globals.css";
import { PWAProvider } from "@/components/pwa/PWAProvider";
import { I18nProvider } from "@/lib/i18n/I18nContext";

export const metadata: Metadata = {
  title: "Life",
  description:
    "Integrated personal telemetry across physical training, cognitive performance, and academic progress.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Life",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F3F4FB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-on-surface flex flex-col font-sans selection:bg-[#E6EEFF] selection:text-[#1E3A9E]">
        <I18nProvider>
          <PWAProvider>{children}</PWAProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
