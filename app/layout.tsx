import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "@/lib/brand";
import { themeInitScript } from "@/lib/theme";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: {
    title: BRAND.name,
    description: BRAND.description,
    siteName: BRAND.name,
    locale: "fr_FR",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning : requis car le script anti-flash ci-dessous
    // modifie la classe de <html> avant l'hydratation React (voir
    // node_modules/next/dist/docs/.../preventing-flash-before-hydration.md).
    // Sans lui, React signalerait une divergence entre le HTML rendu par le
    // serveur (toujours clair) et le DOM déjà corrigé par le script.
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Dark Mode — appliqué en synchrone, avant le premier paint, pour
            éviter tout flash clair→sombre au chargement. Doit rester
            strictement synchronisé avec lib/theme.ts (readStoredTheme /
            resolveTheme), utilisés comme initialiseur paresseux côté
            client par ThemeProvider. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
