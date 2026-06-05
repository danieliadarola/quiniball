import type { Metadata, Viewport } from "next";
import { Saira_Condensed, Manrope } from "next/font/google";
import { APP_NAME } from "@/config/defaults";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";

// Titulares de impacto (condensada, itálica) + cuerpo legible.
const display = Saira_Condensed({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "Quinielas y porras del Mundial 2026 para jugar con amigos y compañeros de oficina. Solo puntos y ranking, sin dinero.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b11",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans text-fg antialiased">{children}</body>
    </html>
  );
}
