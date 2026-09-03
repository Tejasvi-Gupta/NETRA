import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Anton } from "next/font/google";
import ChatbotWidget from "@/components/ChatbotWidget";

export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Netra",
  description: "AI-Criminal Intelligence platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${anton.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ChatbotWidget />
      </body>
    </html>
  );
}
