'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/axios';
import Swal from 'sweetalert2';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
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
                    text: 'ระบบจัดการหลังบ้านอนุญาตเฉพาะ Admin เท่านั้น พนักงานทั่วไปกรุณาใช้งานผ่านแอปพลิเคชัน',
                    confirmButtonText: 'ตกลง'
                });
                return; // ❌ หยุดการทำงานตรงนี้ ไม่บันทึก Cookie ใดๆ
            }

            // 2. ถ้าเป็น ADMIN ถึงจะยอมให้บันทึก Cookie
            Cookies.set('token', res.data.token, { expires: 1 });
            Cookies.set('user_role', res.data.role, { expires: 1 });

            // ⭐ [เพิ่มใหม่] บันทึกชื่อผู้ใช้ลง Cookie เพื่อเอาไปแสดงที่ Sidebar
            // (เช็คว่า API ส่งมาเป็น name หรือ username หรือถ้าไม่มีให้ใช้คำว่า Admin)
            Cookies.set('user_name', res.data.name || res.data.username || 'Admin', { expires: 1 });

            Swal.fire({ icon: 'success', title: 'ยินดีต้อนรับ', text: 'เข้าสู่ระบบสำเร็จ', timer: 1500, showConfirmButton: false });
            router.push('/dashboard');

        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.response?.data?.error || 'เข้าสู่ระบบไม่สำเร็จ' });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center text-blue-600">Admin Login</h1>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="text" placeholder="Username"
                        className="w-full p-2 border rounded"
                        value={username} onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="password" placeholder="Password"
                        className="w-full p-2 border rounded"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                        เข้าสู่ระบบ (เฉพาะ Admin)
                    </button>
                </form>
            </div>
        </div>
    );
}