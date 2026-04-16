import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "@/styles/globals.css";
import { LazyCommandMenu } from "@/components/ui/LazyCommandMenu";
import { getLocaleFromCookie, type Locale } from "@/lib/i18n";

const geistSans = localFont({
  src: "../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

export const viewport: Viewport = {
  themeColor: "#f4f4f4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VAT100 | Boekhouding met realtime belastinginzicht",
    template: "%s | VAT100",
  },
  description: "Verstuur facturen, zie realtime wat je moet reserveren en houd grip op je cashflow. VAT100 combineert gemak, inzicht en stijl in één rustig systeem.",
  manifest: "/manifest.json",
  keywords: [
    "boekhouding zzp",
    "realtime belastinginzicht",
    "facturen versturen",
    "btw overzicht",
    "boekhoudsoftware nederland",
  ],
  openGraph: {
    title: "VAT100 | Gemak, inzicht en stijl voor je administratie",
    description: "Een doordacht financieel systeem voor zelfstandigen en kleine ondernemers met realtime belastinginzicht.",
    url: siteUrl,
    siteName: "VAT100",
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VAT100 | Boekhouding met realtime belastinginzicht",
    description: "Gemak, inzicht en stijl voor zelfstandigen en kleine ondernemers.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VAT100",
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale: Locale = getLocaleFromCookie(cookieStore.get("locale")?.value ? `locale=${cookieStore.get("locale")?.value}` : null);

  return (
    <html lang={locale} className={`light ${geistSans.variable} ${geistMono.variable}`} style={{ colorScheme: "light" }}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-black focus:text-white focus:px-4 focus:py-2"
        >
          {locale === "en" ? "Skip to content" : "Ga naar inhoud"}
        </a>
        <Providers locale={locale}>
          {children}
          <LazyCommandMenu />
        </Providers>
      </body>
    </html>
  );
}
