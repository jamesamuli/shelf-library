import type { Metadata } from "next";
import { Geist_Mono, Inter, Rajdhani } from "next/font/google";
import { getLocale, getTheme } from "@/lib/preferences";
import "./globals.css";

// Headings are Rajdhani, the CDI's choice over the guideline's Playfair
// Display; body is Inter (Brand guideline.png §04). Playfair is gone with the
// horizontal lockup, whose "Shelf" it drew — the logo is now the monogram.
// Geist Mono is kept for identifiers — call numbers, barcodes, ISBNs — which
// need to line up when scanned in a column.
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Not preloaded: only record pages and Gestion set identifiers in it, so the
// rest — the home included — should not fetch it up front. It still loads
// wherever it is used.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Shelf Library",
    template: "%s — Shelf Library",
  },
  description: "Portail documentaire du CDI.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read on the server so the first paint already has the right theme and
  // language — no flash, no client-side i18n runtime.
  const [theme, locale] = await Promise.all([getTheme(), getLocale()]);

  return (
    <html
      lang={locale}
      // Absent while a phone follows its own light/dark mode (colors.css).
      data-theme={theme === "system" ? undefined : theme}
      className={`${rajdhani.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
