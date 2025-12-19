'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Cookies from 'js-cookie';
import {
    LayoutDashboard, Box, ArrowRightLeft, LogOut, History,
    Warehouse, UserCircle, Users, Menu, X
} from 'lucide-react';

const MENU_ITEMS = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'สินค้าทั้งหมด', href: '/products', icon: <Box size={20} /> },
    { name: 'คลังสินค้า', href: '/warehouses', icon: <Warehouse size={20} /> },
    { name: 'รับเข้า/เบิกออก', href: '/stock', icon: <ArrowRightLeft size={20} /> },
    { name: 'ประวัติ', href: '/history', icon: <History size={20} /> },
];

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    // State สำหรับเปิด/ปิดเมนูในมือถือ
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [userData, setUserData] = useState({ name: '...', role: '', isLoaded: false });

    // ปิดเมนูทุกครั้งที่เปลี่ยนหน้า (สำหรับมือถือ)
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        const name = Cookies.get('user_name') || 'ผู้ใช้งาน';
        const role = Cookies.get('user_role') || 'STAFF';
        setUserData({ name, role, isLoaded: true });
    }, []);

    const handleLogout = () => {
        ['token', 'user_role', 'user_name'].forEach(c => Cookies.remove(c));
        router.replace('/login');
    };

    const displayedMenu = useMemo(() => {
        const items = [...MENU_ITEMS];
        if (userData.role === 'ADMIN') {
            items.push({ name: 'จัดการผู้ใช้งาน', href: '/users', icon: <Users size={20} /> });
        }
        return items;
    }, [userData.role]);

    return (
        <>
            {/* 📱 1. ปุ่มเปิดเมนู (แสดงเฉพาะมือถือ) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-50 flex items-center px-4 shadow-md justify-between">
                <div className="font-bold text-blue-400 text-lg">Stock Manager</div>
                <button onClick={() => setIsMobileOpen(true)} className="text-white p-2">
                    <Menu size={28} />
                </button>
            </div>

            {/* 🌑 2. ฉากหลัง Overlay (แสดงเฉพาะตอนเปิดเมนูในมือถือ) */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* 🖥️ 3. ตัว Sidebar หลัก */}
            <aside className={`
                fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white p-4 flex flex-col transition-transform duration-300 ease-in-out
                ${/* มือถือ: ถ้าเปิดให้เลื่อนมา, ถ้าปิดให้ซ่อนไปซ้ายสุด */ ''}
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                ${/* Desktop: ให้แสดงตลอดเวลา และเลื่อนกลับมาที่เดิม */ ''}
                md:translate-x-0 md:static md:h-screen md:shrink-0
            `}>

                {/* ปุ่มปิด x (เฉพาะมือถือ) */}
                <div className="flex justify-between items-center mb-6 md:justify-center">
                    <h1 className="text-xl font-bold text-blue-400">Stock Manager</h1>
                    <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* ส่วนข้อมูลผู้ใช้ */}
                <div className="mb-6 p-3 bg-slate-800 rounded-lg flex items-center gap-3 border border-slate-700 min-h-[70px]">
                    <div className="text-gray-300 shrink-0">
                        <UserCircle size={40} strokeWidth={1.5} />
                    </div>
                    <div className="overflow-hidden flex-1">
                        {!userData.isLoaded ? (
                            <div className="animate-pulse space-y-2">
                                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                            </div>
                        ) : (
                            <>
                                <p className="font-bold text-sm truncate text-white">{userData.name}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold inline-block mt-1 ${userData.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'
                                    }`}>
                                    {userData.role}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* เมนู */}
                <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                    {displayedMenu.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 p-3 rounded transition-colors ${isActive ? 'bg-blue-600 shadow-md' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                                    }`}
                            >
                                {item.icon} <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-3 rounded hover:bg-red-600/90 text-red-200 hover:text-white mt-auto shrink-0"
                >
                    <LogOut size={20} /> <span className="font-medium">ออกจากระบบ</span>
                </button>
            </aside>
        </>
    );
}