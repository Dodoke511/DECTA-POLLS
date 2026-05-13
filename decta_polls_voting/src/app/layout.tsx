import type { Metadata } from "next";
import { Montserrat, Source_Sans_3, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "D.E.C.T.A Polls",
  description: "A dynamic white-label voting engine designed for seamless branding and ironclad data isolation across every tenant.",
};

import { GlobalSessionProvider } from "@/components/providers/GlobalSessionProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body
        className={`${montserrat.variable} ${sourceSans.variable} antialiased`}
      >
        <GlobalSessionProvider>
          {children}
        </GlobalSessionProvider>
      </body>
    </html>
  );
}
