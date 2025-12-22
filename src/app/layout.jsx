import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AutoLogoutProvider from "@/components/AutoLogoutProvider";
import Sidebar from "@/components/Sidebar"; // ✅ 1. อย่าลืม import Sidebar เข้ามาด้วย

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata = {
  title: "Stock Manager System",
  description: "ระบบจัดการสต็อกสินค้า",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 min-h-screen`}
      >
        <AutoLogoutProvider>
          {/* ✅ 2. สร้าง Container หลักเป็น flex */}
          <div className="flex min-h-screen relative">

            {/* ✅ 3. ใส่ Sidebar ไว้ซ้ายสุด */}
            <Sidebar />

            {/* ✅ 4. ส่วนเนื้อหาหลัก: ต้องใส่ md:ml-64 เพื่อเว้นที่ให้ Sidebar */}
            <main className="flex-1 w-full p-4 md:p-6 md:ml-64 transition-all duration-300">
              {children}
            </main>

          </div>
        </AutoLogoutProvider>
      </body>
    </html>
  );
}