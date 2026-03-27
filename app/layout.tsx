import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { Providers } from "./providers";
import "@/styles/globals.css";
import { LazyCommandMenu } from "@/components/ui/LazyCommandMenu";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`light ${cormorant.variable}`} style={{ colorScheme: "light" }}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-black focus:text-white focus:px-4 focus:py-2"
        >
          Ga naar inhoud
        </a>
        <Providers>
          {children}
          <LazyCommandMenu />
        </Providers>
      </body>
    </html>
  );
}
