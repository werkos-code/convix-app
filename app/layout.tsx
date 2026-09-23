import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://convix.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Convix",
    template: "%s · Convix",
  },
  description:
    "Jouw persoonlijke financiële cockpit — vrij besteedbaar tot je volgende salaris.",
  applicationName: "Convix",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Convix",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/brand/convix-logo.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: siteUrl,
    siteName: "Convix",
    title: "Convix",
    description:
      "Hoeveel kun je veilig uitgeven tot je volgende salaris?",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "Convix",
    description:
      "Hoeveel kun je veilig uitgeven tot je volgende salaris?",
    images: ["/icons/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6d5efc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
