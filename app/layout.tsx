import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";

const brandFont = Orbitron({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["600", "700", "800"]
});

export const metadata: Metadata = {
  title: "CallHot",
  description: "Dashboard e simulador de ligação por link"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`min-h-screen antialiased ${brandFont.variable}`}>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}


