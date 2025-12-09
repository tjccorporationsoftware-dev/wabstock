import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ⭐ 1. Import Component ตัดระบบอัตโนมัติเข้ามา
import AutoLogoutProvider from "@/components/AutoLogoutProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Stock Manager System", // ปรับชื่อ Title ให้ตรงกับระบบของคุณ
  description: "ระบบจัดการสต็อกสินค้า",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ⭐ 2. ครอบ children ด้วย Provider เพื่อให้ทำงานทุกหน้า */}
        <AutoLogoutProvider>
          {children}
        </AutoLogoutProvider>
      </body>
    </html>
  );
}