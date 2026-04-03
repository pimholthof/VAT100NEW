import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "@/styles/globals.css";
import { LazyCommandMenu } from "@/components/ui/LazyCommandMenu";
import CookieNotice from "@/components/CookieNotice";
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
};

export const metadata: Metadata = {
  title: "VAT100",
  description: "VAT100 Invoice System",
  manifest: "/manifest.json",
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
          <CookieNotice />
        </Providers>
      </body>
    </html>
  );
}
