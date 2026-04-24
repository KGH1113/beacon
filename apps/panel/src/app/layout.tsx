import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/utils";

import "./globals.css";
import "@xterm/xterm/css/xterm.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={cn(
        "font-mono antialiased",
        fontSans.variable,
        jetbrainsMono.variable,
      )}
      lang="ko"
      suppressHydrationWarning
    >
      <body className="min-h-svh bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
