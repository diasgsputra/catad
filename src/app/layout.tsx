import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Catad — Catatan Digital, kasir & pembukuan untuk UMKM",
    template: "%s · Catad",
  },
  description:
    "Aplikasi kasir untuk warung, toko, dan UMKM. Penjualan tercatat otomatis, laporan laba jadi sendiri, dan stok yang mau habis diingatkan lebih awal.",
  applicationName: "Catad",
  keywords: ["kasir", "POS", "UMKM", "warung", "pembukuan", "stok", "laporan penjualan"],
  authors: [{ name: "Catad" }],
  openGraph: {
    title: "Catad — Catatan Digital",
    description:
      "Kasir dan pembukuan otomatis untuk UMKM. Catat sekali, laporan dan pengingat stok jalan sendiri.",
    type: "website",
    locale: "id_ID",
  },
};

export const viewport: Viewport = {
  themeColor: "#22324a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
