import type { Metadata } from "next";
import { Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import { getLocale, getTheme } from "@/lib/preferences";
import "./globals.css";

// Brand typography (Brand guideline.png §04): Playfair Display for headings,
// Inter for body. Geist Mono is kept for identifiers — call numbers, barcodes,
// ISBNs — which need to line up when scanned in a column.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      data-theme={theme}
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
