import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UserProvider } from "@/components/UserProvider";
import { UserGate } from "@/components/UserGate";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Witter Inventory Movement",
  description: "Chain-of-custody tracking for live-stream coin inventory",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        <UserProvider>
          <UserGate>
            <NavBar />
            <main className="mx-auto max-w-3xl px-4 py-5 pb-24">{children}</main>
          </UserGate>
        </UserProvider>
      </body>
    </html>
  );
}
