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
        <div className="flex bg-[#FBFBFB] h-screen text-slate-700 font-sans overflow-hidden">

            {/* Sidebar: ซ่อนในมือถือ (หรือคุณอาจจะทำปุ่ม Toggle ก็ได้) แสดงในจอใหญ่ */}
            <div className="">
                <Sidebar />
            </div>

            {/* Content Area: กินพื้นที่ที่เหลือ */}
            <div className="flex-1 flex flex-col min-w-0 h-full mt-16 md:mt-6  lg:mt-1 ">

                {/* --- Header Part (Fixed) --- */}
                {/* ส่วนหัวจะติดอยู่ด้านบน ไม่เลื่อนตามเนื้อหา */}
                <div className="flex-none p-4 md:p-8 border-b border-slate-200 bg-[#FBFBFB] z-10">
                    <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900">ประวัติกิจกรรม</h1>
                            <p className="text-slate-500 text-xs md:text-sm">ตรวจสอบการเคลื่อนไหวสินค้า</p>
                        </div>

                        {/* Date Filter */}
                        <div className="w-full md:w-auto flex items-center gap-2 bg-white border border-slate-300 px-3 py-2 rounded-xl shadow-sm">
                            <Calendar size={16} className="text-slate-500" />
                            <input
                                type="date"
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-800 outline-none w-full md:w-auto"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                            {selectedDate && (
                                <button onClick={() => setSelectedDate('')} className="text-slate-400 hover:text-red-500">
                                    <XCircle size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Scrollable Content Part --- */}
                {/* ส่วนนี้จะ Scroll ได้ (overflow-y-auto) และเนื้อหาจะ "พอดี" ไม่ล้นขอบ */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto w-full">

                        {loading ? (
                            <div className="text-center py-20 animate-pulse text-slate-500">กำลังโหลด...</div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-70">
                                <Package size={48} strokeWidth={1.5} />
                                <p className="mt-2 text-sm">ไม่พบข้อมูล</p>
                            </div>
                        ) : (
                            <>
                                {/* --- 1. MOBILE VIEW (แสดงเป็น Card) --- */}
                                {/* จะแสดงเฉพาะหน้าจอมือถือ (md:hidden) เพื่อแก้ปัญหาตารางล้นจอ */}
                                <div className="md:hidden space-y-3">
                                    {filteredLogs.map((item) => (
                                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                                            {/* Top Row: Date & Type */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Clock size={12} />
                                                    <span>
                                                        {new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                                        {' '}{new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.type === 'IN' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        item.type === 'OUT' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                            'bg-slate-50 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {item.type === 'IN' ? 'นำเข้า' : item.type === 'OUT' ? 'เบิกออก' : 'ลบ'}
                                                </span>
                                            </div>

                                            {/* Middle Row: Product */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center border border-slate-200">
                                                    {item.image_url ? (
                                                        <img src={getImageUrl(item.image_url)} className="w-full h-full object-cover rounded-lg" />
                                                    ) : (
                                                        <Package size={18} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{item.product_name}</p>
                                                    <p className="text-xs text-slate-500">{item.warehouse_name}</p>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Stats & Reason */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                    <User size={12} />
                                                    <span className="truncate max-w-20">{item.user_name}</span>
                                                </div>
                                                <div className="font-bold text-sm">
                                                    <span className="text-xs text-slate-400 font-normal mr-2">จำนวน</span>
                                                    <span className={item.type === 'IN' ? 'text-green-600' : 'text-slate-800'}>
                                                        {item.type === 'IN' ? '+' : '-'}{item.quantity}
                                                    </span>
                                                </div>
                                            </div>
                                            {item.reason && (
                                                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded flex gap-1.5 items-start">
                                                    <MessageSquare size={12} className="mt-0.5 shrink-0" />
                                                    <span>{item.reason}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* --- 2. DESKTOP VIEW (แสดงเป็น Table) --- */}
                                {/* จะแสดงเฉพาะหน้าจอ Tablet ขึ้นไป (hidden md:block) */}
                                <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[13px] text-slate-600 font-bold bg-slate-50">
                                                <th className="px-6 py-4">วันเวลา</th>
                                                <th className="px-4 py-4">กิจกรรม</th>
                                                <th className="px-6 py-4">สินค้า</th>
                                                <th className="px-4 py-4 text-right">จำนวน</th>
                                                <th className="px-4 py-4">ผู้ทำรายการ</th>
                                                <th className="px-6 py-4">หมายเหตุ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm">
                                            {filteredLogs.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900">
                                                            {new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`text-xs font-bold px-2 py-1 rounded border ${item.type === 'IN' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                item.type === 'OUT' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}>
                                                            {item.type === 'IN' ? 'นำเข้า' : item.type === 'OUT' ? 'เบิกออก' : 'ลบ'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-slate-100 rounded border border-slate-200 shrink-0 overflow-hidden">
                                                                {item.image_url ? <img src={getImageUrl(item.image_url)} className="w-full h-full object-cover" /> : null}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900">{item.product_name}</div>
                                                                <div className="text-xs text-slate-500">{item.warehouse_name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-4 py-4 text-right font-bold ${item.type === 'IN' ? 'text-green-600' : 'text-slate-800'}`}>
                                                        {item.type === 'IN' ? '+' : '-'}{item.quantity}
                                                    </td>
                                                    <td className="px-4 py-4 text-slate-600">{item.user_name}</td>
                                                    <td className="px-6 py-4 text-slate-500 text-xs italic">{item.reason || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}