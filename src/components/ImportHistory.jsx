'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    FileText, Clock, User, CheckCircle, XCircle,
    RefreshCw, FileSpreadsheet, RotateCcw, Loader2, AlertTriangle
} from 'lucide-react';

export default function ImportHistory({ warehouseId, refreshKey, onRevertSuccess }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revertingId, setRevertingId] = useState(null);

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

    const handleRevert = async (importId) => {
        const confirmRevert = window.confirm(
            "⚠️ ยืนยันการยกเลิกรายการนี้?\n\nสต็อกสินค้าที่นำเข้าจากไฟล์นี้จะถูกหักลบออกทั้งหมด!"
        );

        if (!confirmRevert) return;

        try {
            setRevertingId(importId);
            // ✅ เรียก API Revert (ต้องมั่นใจว่า Backend มี Route นี้แล้ว)
            await api.post(`/imports/${importId}/revert`);

            // อัปเดตข้อมูลในตาราง
            await fetchHistory();

            // แจ้ง Component แม่ให้โหลดสินค้าใหม่ (ถ้ามี function ส่งมา)
            if (onRevertSuccess) {
                onRevertSuccess();
            }

            alert("ยกเลิกรายการนำเข้าเรียบร้อยแล้ว");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "เกิดข้อผิดพลาดในการยกเลิกรายการ");
        } finally {
            setRevertingId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
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
                    <FileText className="text-indigo-500" size={20} />
                    ประวัติการนำเข้าไฟล์ล่าสุด
                </h3>
                <button
                    onClick={fetchHistory}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
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
                            <th className="p-3 font-semibold text-center">สถานะ</th>
                            <th className="p-3 rounded-r-lg font-semibold text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && history.length === 0 ? (
                            <tr><td colSpan="6" className="p-4 text-center text-gray-400"><Loader2 className="animate-spin inline mr-2" />กำลังโหลด...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan="6" className="p-6 text-center text-gray-400 text-sm">ยังไม่มีประวัติการนำเข้า</td></tr>
                        ) : (
                            history.map((item) => {
                                const isReverted = item.status === 'reverted';
                                return (
                                    <tr key={item.id} className={`transition-colors text-sm ${isReverted ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50/80'}`}>
                                        <td className="p-3 text-gray-600 whitespace-nowrap">
                                            <div className="flex items-center gap-2 font-medium">
                                                <Clock size={14} className="text-gray-400" />
                                                {formatDate(item.upload_time)}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                ${item.file_type === 'PDF' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                {item.file_type === 'PDF' ? <FileText size={12} className="mr-1" /> : <FileSpreadsheet size={12} className="mr-1" />}
                                                {item.file_type}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center text-gray-600">
                                            <div className="flex items-center justify-center gap-1">
                                                <User size={14} className="text-gray-400" />
                                                {item.uploaded_by || '-'}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center font-bold text-gray-800">
                                            {item.total_records}
                                        </td>
                                        <td className="p-3 text-center">
                                            {item.status === 'success' ? (
                                                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold border border-emerald-100">
                                                    <CheckCircle size={12} /> สำเร็จ
                                                </span>
                                            ) : item.status === 'reverted' ? (
                                                <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-md text-xs font-bold border border-gray-200">
                                                    <AlertTriangle size={12} /> ยกเลิกแล้ว
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-bold border border-red-100">
                                                    <XCircle size={12} /> ล้มเหลว
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {item.status === 'success' && (
                                                <button
                                                    onClick={() => handleRevert(item.id)}
                                                    disabled={revertingId === item.id}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-amber-200"
                                                    title="ยกเลิกการนำเข้า (Revert)"
                                                >
                                                    {revertingId === item.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <RotateCcw size={14} />
                                                    )}
                                                    ยกเลิก
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}