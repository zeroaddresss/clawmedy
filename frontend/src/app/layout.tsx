import type { Metadata } from "next";
import { Figtree, Instrument_Serif } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlassFilter from "@/components/GlassFilter";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Clawmedy Arena",
  description:
    "Free-to-play on-chain comedy game. Make the AI judge laugh, win $CMDY. Powered by Monad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Clawmedy" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={`${figtree.variable} ${GeistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        <GlassFilter />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
