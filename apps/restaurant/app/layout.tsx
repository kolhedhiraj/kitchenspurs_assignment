import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/CartProvider";
import PageTracker from "@/components/PageTracker";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = { title: "Olive & Ember | Restaurant Demo", description: "A neighborhood restaurant demo powered by real analytics." };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Browser extensions can inject attributes on <html>; this only suppresses that known root-element warning.
  return <html lang="en" suppressHydrationWarning><body><CartProvider><PageTracker /><SiteHeader />{children}</CartProvider></body></html>;
}
