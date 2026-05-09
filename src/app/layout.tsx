import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "B&B GOLDSILVER", template: "%s | B&B GOLDSILVER" },
  description: "Consulta el precio del oro en tiempo real en Colombia: onzas, gramos y kilogramos. Conversión a COP y USD, datos actualizados.",
  keywords: ["precio del oro", "oro hoy", "precio oro Colombia", "COP", "USD", "gramo de oro", "onza de oro"],
  authors: [{ name: "B&B GOLDSILVER" }],
  creator: "B&B GOLDSILVER",
  publisher: "B&B GOLDSILVER",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", locale: "es_CO", url: "/", siteName: "B&B GOLDSILVER",
    title: "B&B GOLDSILVER",
    description: "Precio del oro en tiempo real en Colombia. Conversión a COP y USD.",
    images: [{ url: "/icon.png", width: 1200, height: 630, alt: "B&B GOLDSILVER" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "B&B GOLDSILVER",
    description: "Consulta el precio del oro en tiempo real en Colombia.",
    images: ["/icon.png"],
  },
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
  applicationName: "B&B GOLDSILVER",
  category: "finance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} ${playfair.variable}`} style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
