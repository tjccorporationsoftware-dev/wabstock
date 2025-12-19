'use client';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/Sidebar"; // ดึง Sidebar ตัวล่าสุดมาใช้

export default function MainLayout({ children }) {
    const pathname = usePathname();

    // 🔒 รายชื่อหน้าที่ *ไม่ต้องการ* ให้แสดง Sidebar
    const noSidebarRoutes = ['/login', '/register', '/forgot-password'];
    const showSidebar = !noSidebarRoutes.includes(pathname);

    // กรณีหน้า Login: ให้แสดงเนื้อหาเต็มจอเลย
    if (!showSidebar) {
        return <main className="w-full min-h-screen">{children}</main>;
    }

    // กรณีหน้า Dashboard ทั่วไป: จัด Layout แบบ Responsive
    return (
        <div className="flex flex-col md:flex-row min-h-screen">
            {/* Sidebar (จะแสดงผลแบบ Responsive ตามโค้ด Sidebar ล่าสุด) */}
            <Sidebar />

            {/* พื้นที่เนื้อหาหลัก */}
            <main className="flex-1 w-full p-4 md:p-8 pt-20 md:pt-8 overflow-x-hidden transition-all duration-300">
                {/* pt-20: เว้นขอบบนสำหรับมือถือ (หลบ Header ของ Sidebar)
                   md:pt-8: เว้นขอบปกติสำหรับจอใหญ่
                */}
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}