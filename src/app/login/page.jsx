'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
// เรียกใช้ Icon จาก lucide-react (ถ้ายังไม่ได้ลงให้ npm install lucide-react ก่อนครับ)
import { User, Lock, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false); // เพิ่มสถานะ Loading
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'ต้องระบุทั้งชื่อผู้ใช้และรหัสผ่าน', confirmButtonColor: '#3B82F6' });
            return;
        }

        setIsLoading(true); // เริ่มโหลด

        try {
            // 1. ส่งข้อมูลไปเช็คที่ Server
            const res = await api.post('/login', { username, password });

            // -----------------------------------------------------------
            // ✅ เช็ค Role: ดักจับว่าถ้าไม่ใช่ ADMIN ให้ดีดออกทันที
            // -----------------------------------------------------------
            if (res.data.role !== 'ADMIN') {
                Swal.fire({
                    icon: 'warning',
                    title: 'ไม่มีสิทธิ์เข้าถึง',
                    text: 'ระบบจัดการหลังบ้านอนุญาตเฉพาะ Admin เท่านั้น',
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#EF4444'
                });
                setIsLoading(false);
                return;
            }

            // 2. ถ้าเป็น ADMIN ถึงจะยอมให้บันทึก Cookie
            Cookies.set('token', res.data.token, { expires: 1 });
            Cookies.set('user_role', res.data.role, { expires: 1 });
            Cookies.set('user_name', res.data.name || res.data.username || 'Admin', { expires: 1 });

            // แจ้งเตือนสำเร็จ
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
            });
            Toast.fire({ icon: 'success', title: 'เข้าสู่ระบบสำเร็จ' });

            router.push('/dashboard');

        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                text: err.response?.data?.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
                confirmButtonColor: '#EF4444'
            });
            setIsLoading(false); // หยุดโหลดเมื่อ error
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white/80 backdrop-blur-lg p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md border border-white/50">

                {/* Header Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-blue-600 p-3 rounded-full shadow-lg mb-4">
                        <ShieldCheck size={40} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Stock Manager</h1>
                    <p className="text-gray-500 text-sm mt-2">ระบบจัดการสต็อกสินค้าหลังบ้าน</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">

                    {/* Username Input */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 ml-1">Username</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User size={20} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Enter your username"
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 ml-1">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock size={20} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                กำลังตรวจสอบ...
                            </>
                        ) : (
                            <>
                                เข้าสู่ระบบ
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Text */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400">
                        © 2025 Stock Management System. <br /> Secure Access for Administrators Only.
                    </p>
                </div>
            </div>
        </div>
    );
}