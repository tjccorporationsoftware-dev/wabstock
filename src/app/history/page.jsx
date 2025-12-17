'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import { History, Calendar, User, XCircle, Package, Clock, MessageSquare } from 'lucide-react';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HistoryPage() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState('');

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${BASE_API_URL}${url}`;
    };

    const fetchHistory = async () => {
        try {
            const res = await api.get('/history');
            setLogs(res.data);
            setFilteredLogs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    useEffect(() => {
        if (selectedDate) {
            const filtered = logs.filter((item) => {
                const itemDate = new Date(item.created_at).toISOString().split('T')[0];
                return itemDate === selectedDate;
            });
            setFilteredLogs(filtered);
        } else {
            setFilteredLogs(logs);
        }
    }, [selectedDate, logs]);

    return (
        <div className="flex bg-[#FBFBFB] min-h-screen text-slate-700 font-sans">
            <Sidebar />

            <div className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
                {/* --- Header --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">ประวัติกิจกรรม</h1>
                        {/* ปรับสีจาก slate-400 เป็น slate-600 ให้ชัดขึ้น */}
                        <p className="text-slate-600 text-sm italic font-medium">ตรวจสอบรายละเอียดเหตุผลและการเคลื่อนไหวสินค้า</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-xl shadow-sm hover:border-indigo-300 transition-colors">
                        <Calendar size={16} className="text-slate-600" />
                        <input
                            type="date"
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-800 outline-none cursor-pointer"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        {selectedDate && (
                            <button onClick={() => setSelectedDate('')} className="text-slate-500 hover:text-rose-600">
                                <XCircle size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* --- Table --- */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-20 text-center text-slate-700 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    {/* ปรับสีหัวตารางจาก slate-400 เป็น slate-600 และเพิ่ม font-bold */}
                                    <tr className="border-b border-slate-100 text-[13px] text-slate-600 font-bold bg-slate-50">
                                        <th className="px-8 py-4">วันเวลา</th>
                                        <th className="px-6 py-4">กิจกรรม</th>
                                        <th className="px-6 py-4">รายการสินค้า</th>
                                        <th className="px-6 py-4 text-right">จำนวน</th>
                                        <th className="px-6 py-4">ผู้ดำเนินการ</th>
                                        <th className="px-8 py-4">หมายเหตุ / เหตุผล</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                {/* วันเวลา: ปรับจาก slate-700 เป็น slate-900 และ slate-400 เป็น slate-600 */}
                                                <td className="px-8 py-5">
                                                    <div className="text-sm font-bold text-slate-900">
                                                        {new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                    </div>
                                                    <div className="text-[12px] text-slate-600 font-medium flex items-center gap-1">
                                                        <Clock size={11} className="text-slate-500" /> {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                    </div>
                                                </td>

                                                {/* ประเภทกิจกรรม: เพิ่ม border ให้เข้มขึ้น */}
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className={`text-[12px] font-bold px-2.5 py-1 rounded-md border-2 ${item.type === 'IN' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            item.type === 'OUT' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                'bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}>
                                                        {item.type === 'IN' ? 'นำเข้า' : item.type === 'OUT' ? 'เบิกออก' : 'ลบข้อมูล'}
                                                    </span>
                                                </td>

                                                {/* สินค้า: ปรับ slate-700 เป็น slate-900 (เข้มสุด) */}
                                                <td className="px-6 py-5 min-w-[200px]">
                                                    <div className="flex items-center gap-3">
                                                        {item.image_url ? (
                                                            <img src={getImageUrl(item.image_url)} className="w-10 h-10 rounded-lg object-cover bg-slate-50 border border-slate-200" />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 border border-slate-200">
                                                                <Package size={16} />
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            <span className={`text-sm font-bold ${item.type === 'DELETE' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                                                {item.product_name || 'ไม่ทราบชื่อ'}
                                                            </span>
                                                            <span className="text-[11px] text-slate-600 font-medium">{item.warehouse_name || 'คลังทั่วไป'}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* จำนวน: ปรับให้หนาขึ้น */}
                                                <td className="px-6 py-5 text-right font-bold text-sm">
                                                    <span className={item.type === 'IN' ? 'text-green-600' : 'text-slate-900'}>
                                                        {item.type === 'IN' ? '+' : '-'}{item.quantity}
                                                    </span>
                                                </td>

                                                {/* ผู้ดำเนินการ: ปรับ slate-500 เป็น slate-700 */}
                                                <td className="px-6 py-5 text-sm text-slate-700 font-medium whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 border border-slate-200">
                                                            <User size={12} />
                                                        </div>
                                                        <span className="text-[13px]">{item.user_name}</span>
                                                    </div>
                                                </td>

                                                {/* หมายเหตุ: ปรับ slate-500 เป็น slate-700 (เข้มขึ้นชัดเจน) */}
                                                <td className="px-8 py-5">
                                                    <div className="flex items-start gap-2 max-w-[220px]">
                                                        {item.reason && <MessageSquare size={13} className="text-slate-700 mt-0.5 shrink-0" />}
                                                        <span className={`text-[12px] leading-relaxed font-medium ${item.reason ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                                            {item.reason || 'ไม่มีบันทึก'}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="py-24 text-center">
                                                <div className="text-slate-600 flex flex-col items-center gap-2">
                                                    <Package size={40} strokeWidth={2} />
                                                    <p className="text-sm font-bold">ไม่พบประวัติรายการที่ค้นหา</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="mt-8 text-center text-slate-600 text-[11px] font-bold tracking-wide uppercase">
                    — บันทึกข้อมูลแบบเรียลไทม์ —
                </p>
            </div>
        </div>
    );
}