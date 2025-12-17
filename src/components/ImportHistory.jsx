'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { FileText, Clock, User, CheckCircle, XCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function ImportHistory({ warehouseId, refreshKey }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/warehouses/${warehouseId}/import-history`);
            setHistory(res.data);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setLoading(false);
        }
    };

    // ✅ ฟังก์ชันจัดรูปแบบเวลา (รองรับค่ามาตรฐานจาก Backend แล้ว)
    const formatDate = (dateString) => {
        if (!dateString) return '-';

        const date = new Date(dateString);

        // เช็คว่าแปลงเป็นเวลาได้จริงไหม
        if (isNaN(date.getTime())) return '-';

        return date.toLocaleString('th-TH', {
            year: 'numeric', // พ.ศ.
            month: 'short',  // ม.ค.
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    useEffect(() => {
        if (warehouseId) {
            fetchHistory();
        }
    }, [warehouseId, refreshKey]);

    if (!warehouseId) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-blue-500" size={20} />
                    ประวัติการนำเข้าไฟล์ล่าสุด
                </h3>
                <button
                    onClick={fetchHistory}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                    title="รีเฟรชประวัติ"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="p-3 rounded-l-lg font-semibold w-1/4">เวลาที่นำเข้า</th>
                            <th className="p-3 font-semibold text-center">ประเภท</th>
                            <th className="p-3 font-semibold text-center">ผู้นำเข้า</th>
                            <th className="p-3 font-semibold text-center">จำนวน (รายการ)</th>
                            <th className="p-3 rounded-r-lg font-semibold text-right">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && history.length === 0 ? (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-400">กำลังโหลด...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan="5" className="p-6 text-center text-gray-400 text-sm">ยังไม่มีประวัติการนำเข้า</td></tr>
                        ) : (
                            history.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors text-sm">
                                    <td className="p-3 text-gray-600 whitespace-nowrap">
                                        <div className="flex items-center gap-2 font-medium">
                                            <Clock size={14} className="text-gray-400" />
                                            {/* เวลาจะแสดงถูกต้องแล้วครับ */}
                                            {formatDate(item.upload_time)}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                            ${item.file_type === 'PDF' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                            {item.file_type === 'PDF' ? <FileText size={12} className="mr-1" /> : <FileSpreadsheet size={12} className="mr-1" />}
                                            {item.file_type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center text-gray-600">
                                        <div className="flex items-center justify-center gap-1">
                                            <User size={14} className="text-gray-400" />
                                            {/* แสดงชื่อจริง (ถ้าไม่มีจะขีด - ไว้) */}
                                            {item.uploaded_by || '-'}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center font-bold text-gray-800">
                                        {item.total_records}
                                    </td>
                                    <td className="p-3 text-right">
                                        {item.status === 'success' ? (
                                            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-bold border border-green-100">
                                                <CheckCircle size={12} /> สำเร็จ
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-bold border border-red-100">
                                                <XCircle size={12} /> ล้มเหลว
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}