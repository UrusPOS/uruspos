import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "UrusPOS",
    template: "%s | UrusPOS",
  },
  description:
    "Sistem POS F&B Malaysia — urus jualan, dapur, dan kedai anda dengan mudah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" className="h-full">
      <body
        className={`${geistSans.variable} min-h-full font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
