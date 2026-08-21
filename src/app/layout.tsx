import type { Metadata, Viewport } from "next";
import { auth } from "@/auth";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoveControl — Rastreio de Equipamentos",
  description:
    "Gestão e rastreio da movimentação de equipamentos entre datacenters via QR Code.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="pt-PT">
      <body>
        <Providers session={session}>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
