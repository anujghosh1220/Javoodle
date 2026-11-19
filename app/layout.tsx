import type { Metadata } from "next";
import { Quicksand, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AtmosphereProvider } from "@/components/atmosphere/AtmosphereProvider";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Javoodle",
    template: "%s · Javoodle",
  },
  description:
    "Little steps. Big breakthroughs. A playful ICSE Class 10 Java learning companion.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AtmosphereProvider>
          <div className="relative z-10 flex min-h-full flex-1 flex-col">{children}</div>
        </AtmosphereProvider>
      </body>
    </html>
  );
}
