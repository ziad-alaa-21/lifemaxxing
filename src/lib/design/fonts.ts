import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";

export const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: true,
});

export const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});
