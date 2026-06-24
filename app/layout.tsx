import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const heading = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "NextHome | Hostel Management",
  description: "Next-generation hostel management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
