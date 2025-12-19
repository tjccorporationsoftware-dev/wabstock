'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import { Warehouse, MapPin, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

// 🛠️ Helper: จัดการ URL รูปภาพให้ถูกต้อง (เหมือนในแอป)
const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    // ปรับให้ตรงกับ Backend URL ของคุณ (เช่น http://localhost:3000 หรือ URL ของ Render)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const cleanBase = baseUrl.replace(/\/api\/?$/, ''); // ตัด /api ท้ายออก
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
};

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState([]);
    const router = useRouter();

    const fetchWarehouses = () => {
        api.get('/warehouses')
            .then(res => setWarehouses(res.data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    // ✅ ฟังก์ชันเพิ่ม/แก้ไข คลังสินค้า (รวมกันเพื่อลด codeซ้ำ)
    const handleSaveWarehouse = async (warehouse = null) => {
        const isEdit = !!warehouse;

        const { value: formValues } = await Swal.fire({
            title: isEdit ? 'แก้ไขข้อมูลคลังสินค้า' : 'เพิ่มคลังสินค้าใหม่',
            html: `
                <div class="flex flex-col gap-4 text-left">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อคลังสินค้า</label>
                        <input id="swal-input-name" class="swal2-input m-0! w-full!" placeholder="ระบุชื่อคลัง" value="${warehouse?.name || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">สถานที่ตั้ง</label>
                        <input id="swal-input-loc" class="swal2-input m-0! w-full!" placeholder="ระบุสถานที่" value="${warehouse?.location || ''}">
                    </div>
                    <div class="w-full">
                        <label class="block text-sm font-semibold text-gray-700 mb-2 text-left">รูปภาพประกอบ</label>
                        <div class="flex items-center justify-center w-full">
                            <label for="swal-input-file" class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-blue-500 transition-all duration-200 group">
                                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg class="w-8 h-8 mb-3 text-gray-400 group-hover:text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                    </svg>
                                    <p class="mb-2 text-sm text-gray-500"><span class="font-semibold">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวาง</p>
                                    <p class="text-xs text-gray-500">PNG, JPG (ไม่เกิน 5MB)</p>
                                </div>
                                <input id="swal-input-file" type="file" class="hidden" onchange="document.getElementById('preview-text').innerText = this.files[0] ? this.files[0].name : 'เลือกรูปภาพ'" />
                            </label>
                        </div>
                        <div id="preview-text" class="text-sm text-blue-600 mt-2 text-center h-5"></div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                return {
                    name: document.getElementById('swal-input-name').value,
                    location: document.getElementById('swal-input-loc').value,
                    file: document.getElementById('swal-input-file').files[0]
                }
            }
        });

        if (formValues && formValues.name) {
            try {
                // 📦 เตรียม FormData สำหรับส่งไฟล์
                const formData = new FormData();
                formData.append('name', formValues.name);
                formData.append('location', formValues.location);
                if (formValues.file) {
                    formData.append('image', formValues.file);
                }

                if (isEdit) {
                    await api.put(`/warehouses/${warehouse.id}`, formData);
                } else {
                    await api.post('/warehouses', formData);
                }

                Swal.fire('สำเร็จ', isEdit ? 'แก้ไขข้อมูลเรียบร้อย' : 'เพิ่มคลังสินค้าเรียบร้อย', 'success');
                fetchWarehouses();
            } catch (err) {
                console.error(err);
                Swal.fire('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        }
    };

    const handleDeleteWarehouse = async (e, id) => {
        e.stopPropagation();
        Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "หากลบแล้ว ข้อมูลสินค้าในคลังนี้อาจได้รับผลกระทบ!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบเลย',
            cancelButtonText: 'ยกเลิก'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/warehouses/${id}`);
                    Swal.fire('ลบสำเร็จ!', 'คลังสินค้าถูกลบแล้ว', 'success');
                    fetchWarehouses();
                } catch (err) {
                    const errorMsg = err.response?.data?.error || 'ไม่สามารถลบคลังสินค้าได้';
                    Swal.fire('ผิดพลาด', errorMsg, 'error');
                }
            }
        })
    };

    return (
        <div className="flex bg-gray-50 min-h-screen font-sans overflow-x-hidden">
            <Sidebar />

            {/* flex-1 และ min-w-0 ช่วยป้องกัน content ดันทะลุจอในบาง browser */}
            <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-10 lg:p-12 mt-16 md:mt-0 transition-all duration-300">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 tracking-tight">
                            คลังสินค้า
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm md:text-lg">
                            จัดการและตรวจสอบสต็อกแยกตามคลัง
                        </p>
                    </div>

                    {/* ปุ่มเพิ่ม: มือถือเต็มจอ (w-full), จอคอมขนาดพอดีคำ (md:w-auto) */}
                    <button
                        onClick={() => handleSaveWarehouse()}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 md:px-6 md:py-3 md:text-lg rounded-xl hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
                    >
                        <Plus size={20} className="md:w-6 md:h-6" />
                        <span>เพิ่มคลังสินค้า</span>
                    </button>
                </div>

                {/* Grid Area: เพิ่ม xl:grid-cols-4 สำหรับจอใหญ่พิเศษ */}
                <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                    {warehouses.map((wh) => {
                        const imageUrl = getImageUrl(wh.image_url);

                        return (
                            <div
                                key={wh.id}
                                onClick={() => router.push(`/warehouses/${wh.id}`)}
                                className="bg-white p-5 md:p-6 lg:p-8 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all group relative overflow-hidden flex flex-col h-full"
                            >
                                <div className="flex justify-between items-start mb-4 md:mb-6">
                                    {/* กรอบรูป */}
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 shadow-inner shrink-0">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={wh.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                                            />
                                        ) : null}

                                        <div className={`p-3 text-blue-600 ${imageUrl ? 'hidden' : 'block'}`}>
                                            <Warehouse size={32} className="md:w-10 md:h-10" />
                                        </div>
                                    </div>

                                    {/* ปุ่ม Action (Edit/Delete) */}
                                    <div className="flex gap-1 md:gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSaveWarehouse(wh); }}
                                            className="p-2 md:p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                            title="แก้ไข"
                                        >
                                            <Edit size={18} className="md:w-6 md:h-6" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteWarehouse(e, wh.id)}
                                            className="p-2 md:p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="ลบ"
                                        >
                                            <Trash2 size={18} className="md:w-6 md:h-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col">
                                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 mb-2 md:mb-3 pr-2 leading-tight line-clamp-2">
                                        {wh.name}
                                    </h3>

                                    <div className="mt-auto pt-2 flex items-center text-blue-600 text-sm md:text-base lg:text-lg font-bold group-hover:translate-x-2 transition-transform duration-300">
                                        ดูรายการสินค้า
                                        <ChevronRight size={16} className="ml-1 md:w-5 md:h-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}