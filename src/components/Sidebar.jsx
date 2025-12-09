'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react'; // ✅ 1. เพิ่ม useEffect และ useState
import Cookies from 'js-cookie';
import { LayoutDashboard, Box, ArrowRightLeft, LogOut, History, Warehouse, UserCircle } from 'lucide-react'; // ✅ เพิ่ม UserCircle

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    // ✅ 2. สร้าง State สำหรับเก็บข้อมูลผู้ใช้
    const [user, setUser] = useState({ name: '', role: '' });

    // ✅ 3. ดึงข้อมูลจาก Cookie เมื่อโหลดหน้าเว็บ
    useEffect(() => {
        // ดึงค่าจาก Cookies (ต้องมั่นใจว่าตอน Login ได้ set 'user_name' ไว้แล้ว)
        const name = Cookies.get('user_name') || 'ผู้ใช้งาน';
        const role = Cookies.get('user_role') || 'STAFF';

        setUser({ name, role });
    }, []);

    const handleLogout = () => {
        // ลบ Cookies ทั้งหมดตอนออก
        Cookies.remove('token');
        Cookies.remove('user_role');
        Cookies.remove('user_name'); // ลบชื่อด้วย
        router.push('/login');
    };

    const menuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'สินค้าทั้งหมด', href: '/products', icon: <Box size={20} /> },
        { name: 'คลังสินค้า', href: '/warehouses', icon: <Warehouse size={20} /> },
        { name: 'รับเข้า/เบิกออก', href: '/stock', icon: <ArrowRightLeft size={20} /> },
        { name: 'ประวัติการทำรายการ', href: '/history', icon: <History size={20} /> },
    ];

    return (
        <div className="w-64 bg-slate-900 text-white h-screen p-4 flex flex-col sticky top-0">

            <h1 className="text-xl font-bold mb-6 text-center text-blue-400">Stock Manager</h1>

            {/* ✅ 4. ส่วนแสดงข้อมูลผู้ใช้ (User Profile) */}
            <div className="mb-6 p-3 bg-slate-800 rounded-lg flex items-center gap-3 border border-slate-700">
                <div className="text-gray-300">
                    <UserCircle size={40} strokeWidth={1.5} />
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-sm truncate text-white">{user.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'
                        }`}>
                        {user.role}
                    </span>
                </div>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 p-3 rounded transition-colors ${pathname === item.href ? 'bg-blue-600' : 'hover:bg-slate-800'
                            }`}
                    >
                        {item.icon} {item.name}
                    </Link>
                ))}
            </nav>

            <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 rounded hover:bg-red-600 text-red-200 hover:text-white mt-auto shrink-0 transition-colors"
            >
                <LogOut size={20} /> ออกจากระบบ
            </button>
        </div>
    );
}