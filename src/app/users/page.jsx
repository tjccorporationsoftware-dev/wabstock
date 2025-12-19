'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
import { Trash2, Plus, X, User, Shield, ShieldCheck, Search, Users } from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        role: 'STAFF'
    });

    const fetchUsers = () => {
        api.get('/users').then(res => {
            setUsers(res.data);
        }).catch(err => {
            if (err.response?.status === 403) {
                Swal.fire({
                    icon: 'error',
                    title: 'สิทธิ์ไม่เพียงพอ',
                    text: 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น',
                    confirmButtonColor: '#4f46e5'
                });
            }
        });
    };

    useEffect(() => { fetchUsers(); }, []);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenModal = () => {
        setFormData({ username: '', password: '', name: '', role: 'STAFF' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
        try {
            await api.post('/users', formData);
            Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'เพิ่มผู้ใช้งานเรียบร้อย', timer: 1500, showConfirmButton: false });
            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            Swal.fire("ล้มเหลว", err.response?.data?.error || "เกิดข้อผิดพลาด", "error");
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "ยืนยันการลบ?",
            text: "ข้อมูลนี้ไม่สามารถกู้คืนได้",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "ลบผู้ใช้",
            cancelButtonText: "ยกเลิก",
            borderRadius: '1rem'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/users/${id}`);
                    Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1000, showConfirmButton: false });
                    fetchUsers();
                } catch (err) {
                    Swal.fire("ลบไม่ได้", "เกิดข้อผิดพลาดในการลบข้อมูล", "error");
                }
            }
        });
    };

    return (
        <div className="flex bg-[#F8FAFC] min-h-screen font-sans">
            <Sidebar />

            <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto mt-16 md:mt-6  lg:mt-1 ">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Users size={24} className="md:w-8 md:h-8" />
                            </div>
                            {/* ปรับขนาดหัวข้อใหญ่ขึ้นในจอคอม */}
                            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">จัดการผู้ใช้งาน</h1>
                        </div>
                        {/* ปรับคำอธิบายใหญ่ขึ้น */}
                        <p className="text-slate-500 font-medium md:text-lg">จัดการสิทธิ์และบัญชีผู้ใช้งานในระบบ</p>
                    </div>

                    <button
                        onClick={handleOpenModal}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex gap-2 items-center justify-center hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95"
                    >
                        <Plus size={20} strokeWidth={3} className="md:w-6 md:h-6" />
                        {/* ปรับตัวหนังสือปุ่มให้ใหญ่ขึ้น */}
                        <span className="font-bold md:text-lg">เพิ่มผู้ใช้งานใหม่</span>
                    </button>
                </div>

                {/* Search & Statistics Table Card */}
                <div className="bg-white rounded-4xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ หรือ Username..."
                                className="w-full pl-12 pr-4 py-2.5 md:py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-slate-600 md:text-base"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-sm md:text-base text-slate-400 font-medium">
                            พบทั้งหมด <span className="text-indigo-600 font-bold">{filteredUsers.length}</span> รายการ
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    {/* ปรับหัวตารางให้ใหญ่ขึ้นในจอคอม (md:text-base) */}
                                    <th className="px-6 py-4 text-[13px] md:text-base uppercase tracking-wider text-slate-500 font-bold">ชื่อพนักงาน</th>
                                    <th className="px-6 py-4 text-[13px] md:text-base uppercase tracking-wider text-slate-500 font-bold">Username</th>
                                    <th className="px-6 py-4 text-[13px] md:text-base uppercase tracking-wider text-slate-500 font-bold">ตำแหน่ง</th>
                                    <th className="px-6 py-4 text-center text-[13px] md:text-base uppercase tracking-wider text-slate-500 font-bold">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 md:w-14 md:h-14 bg-linear-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-md shadow-indigo-100 group-hover:scale-110 transition-transform md:text-xl">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    {/* ชื่อคนใหญ่ขึ้น */}
                                                    <div className="font-bold text-slate-700 md:text-lg">{u.name}</div>
                                                    <div className="text-xs md:text-sm text-slate-400">ID: #{u.id.toString().slice(-4)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm md:text-base text-slate-600 bg-slate-50/50 group-hover:bg-transparent">
                                            @{u.username}
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.role === 'ADMIN' ? (
                                                <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-xl text-[11px] md:text-sm font-black flex w-fit items-center gap-2 border border-amber-200">
                                                    <ShieldCheck size={14} className="md:w-4 md:h-4" /> ADMIN
                                                </span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-xl text-[11px] md:text-sm font-black flex w-fit items-center gap-2 border border-slate-200">
                                                    <User size={14} className="md:w-4 md:h-4" /> STAFF
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2.5 rounded-xl transition-all active:scale-90"
                                            >
                                                <Trash2 size={20} className="md:w-6 md:h-6" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredUsers.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <Search size={48} strokeWidth={1} className="mb-4 opacity-20" />
                                <p className="font-medium md:text-lg">ไม่พบข้อมูลผู้ใช้งานที่กำลังค้นหา</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal - เพิ่มผู้ใช้งาน (Modern Overlay) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-100 backdrop-blur-md transition-all">
                    <div className="bg-white w-full max-w-md md:max-w-lg rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-50">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-800">เพิ่มสมาชิกใหม่</h2>
                                <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">สร้างบัญชีผู้ใช้งานสำหรับพนักงาน</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs md:text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">ชื่อ-นามสกุล</label>
                                <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium md:text-lg"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="กรอกชื่อจริง" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs md:text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Username</label>
                                    <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium md:text-lg"
                                        value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="เช่น somchai" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs md:text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Password</label>
                                    <input type="password" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium md:text-lg"
                                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••" required />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs md:text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">ระดับสิทธิ์</label>
                                <div className="relative">
                                    <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none transition-all font-bold text-slate-700 md:text-lg"
                                        value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="STAFF">พนักงานทั่วไป (STAFF)</option>
                                        <option value="ADMIN">ผู้ดูแลระบบ (ADMIN)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <Shield size={18} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-[1.25rem] hover:bg-indigo-700 font-bold shadow-xl shadow-indigo-200 transition-all active:scale-95 md:text-xl">
                                    ยืนยันการเพิ่มผู้ใช้
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}