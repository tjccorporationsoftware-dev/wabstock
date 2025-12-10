'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios'; // ✅ ใช้ axios instance
import Swal from 'sweetalert2';
import { Trash2, Plus, X, User, Shield, ShieldCheck } from 'lucide-react';
import Cookies from 'js-cookie';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        role: 'STAFF'
    });

    // ดึงข้อมูลผู้ใช้
    const fetchUsers = () => {
        api.get('/users').then(res => {
            setUsers(res.data);
        }).catch(err => {
            console.error(err);
            // ถ้าไม่ใช่ Admin อาจจะโดนดีดออก
            if (err.response?.status === 403) {
                Swal.fire("ไม่มีสิทธิ์", "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น", "error");
            }
        });
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = () => {
        setFormData({ username: '', password: '', name: '', role: 'STAFF' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.username || !formData.password || !formData.name) {
            Swal.fire("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบ", "warning");
            return;
        }

        Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });

        try {
            await api.post('/users', formData);
            Swal.fire("สำเร็จ", "เพิ่มผู้ใช้งานเรียบร้อย", "success");
            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            const msg = err.response?.data?.error || "เกิดข้อผิดพลาด";
            Swal.fire("ล้มเหลว", msg, "error");
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "ยืนยันการลบ?",
            text: "ผู้ใช้นี้จะไม่สามารถเข้าสู่ระบบได้อีก",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "ลบเลย",
            cancelButtonText: "ยกเลิก"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/users/${id}`);
                    Swal.fire("ลบสำเร็จ", "", "success");
                    fetchUsers();
                } catch (err) {
                    Swal.fire("ลบไม่ได้", err.response?.data?.error || "เกิดข้อผิดพลาด", "error");
                }
            }
        });
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">จัดการผู้ใช้งาน</h1>
                    <button onClick={handleOpenModal} className="bg-blue-600 text-white px-5 py-2 rounded-xl flex gap-2 items-center hover:bg-blue-700 shadow-sm transition">
                        <Plus size={20} /> เพิ่มผู้ใช้
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="p-4 text-left text-gray-600 font-semibold">ชื่อพนักงาน</th>
                                <th className="p-4 text-left text-gray-600 font-semibold">Username</th>
                                <th className="p-4 text-left text-gray-600 font-semibold">ตำแหน่ง</th>
                                <th className="p-4 text-center text-gray-600 font-semibold">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-gray-800">{u.name}</span>
                                    </td>
                                    <td className="p-4 text-gray-600">{u.username}</td>
                                    <td className="p-4">
                                        {u.role === 'ADMIN' ? (
                                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1">
                                                <ShieldCheck size={12} /> ADMIN
                                            </span>
                                        ) : (
                                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1">
                                                <User size={12} /> STAFF
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="ลบผู้ใช้">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400">ไม่พบข้อมูลผู้ใช้งาน</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal เพิ่มผู้ใช้ */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-5 border-b bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">เพิ่มผู้ใช้งานใหม่</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล (ที่แสดง)</label>
                                <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="เช่น สมชาย ใจดี" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username (สำหรับล็อกอิน)</label>
                                <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="เช่น somchai" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input type="password" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="กำหนดรหัสผ่าน" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">สิทธิ์การใช้งาน</label>
                                <select className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="STAFF">พนักงานทั่วไป (STAFF)</option>
                                    <option value="ADMIN">ผู้ดูแลระบบ (ADMIN)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium">
                                    ยกเลิก
                                </button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-lg shadow-blue-200">
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}