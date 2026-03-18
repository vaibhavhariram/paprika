import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { sans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paprika",
  description:
    "The execution layer for reliable AI agents. Trace every run, enforce runtime policies, and replay safely. Production-ready agent control.",
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/favicon.png",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${sans.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
