import type { Metadata } from "next";
import { Montserrat, Allura } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const allura = Allura({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-allura",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Struggle — End the Struggle, Build the Future Together",
  description:
    "A nonprofit helping people overcome homelessness, addiction, and incarceration through peer mentorship, outreach centers, and QR Code Giving. EST. 2021 · Laveen, Arizona.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${montserrat.variable} ${allura.variable}`}>
      <body>{children}</body>
    </html>
  );
}
