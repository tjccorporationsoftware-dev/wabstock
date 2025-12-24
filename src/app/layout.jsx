import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AutoLogoutProvider from "@/components/AutoLogoutProvider";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* ✅ metadata ใช้เฉพาะ title / description / icons */
export const metadata = {
  title: "Stock Manager System",
  description: "ระบบจัดการสต็อกสินค้า",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

/* ✅ viewport ต้องแยกแบบนี้ */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 min-h-screen`}
      >
        <AutoLogoutProvider>
          <div className="flex min-h-screen relative">
            <Sidebar />
            <main className="flex-1 w-full p-4 md:p-6 md:ml-64 transition-all duration-300">
              {children}
            </main>
          </div>
        </AutoLogoutProvider>
      </body>
    </html>
  );
}
