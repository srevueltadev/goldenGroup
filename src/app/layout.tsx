import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Info Price",
    template: "%s | Precio del Oro",
  },
  description:
    "Consulta el precio del oro en tiempo real en Colombia: onzas, gramos y kilogramos. Conversión a COP y USD, datos actualizados.",
  keywords: [
    "precio del oro",
    "oro hoy",
    "precio oro Colombia",
    "COP",
    "USD",
    "gramo de oro",
    "onza de oro",
  ],
  authors: [{ name: "Precio Oro" }],
  creator: "Precio Oro",
  publisher: "Precio Oro",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName: "Precio del Oro",
    title: "Precio del Oro en Colombia",
    description:
      "Precio del oro en tiempo real en Colombia. Conversión a COP y USD.",
    images: [
      {
        url: "/icon.ico",
        width: 1200,
        height: 630,
        alt: "Precio del oro en Colombia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Precio del Oro en Colombia",
    description:
      "Consulta el precio del oro en tiempo real en Colombia: onzas, gramos y kilogramos.",
    images: ["/icon.ico"],
  },
  icons: {
    icon: "/icon.ico",
    shortcut: "/icon.ico",
    apple: "/icon.ico",
  },
  applicationName: "Precio del Oro",
  category: "finance",
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
