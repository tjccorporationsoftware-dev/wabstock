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
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">คลังสินค้า</h1>
                        <p className="text-gray-500 mt-1">จัดการและตรวจสอบสต็อกแยกตามคลัง</p>
                    </div>
                    <button
                        onClick={() => handleSaveWarehouse()} // 👉 เพิ่มใหม่ (ไม่ต้องส่ง params)
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} /> เพิ่มคลังสินค้า
                    </button>
                </div>

                {/* Grid แสดงคลังสินค้า */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((wh) => {
                        const imageUrl = getImageUrl(wh.image_url);

                        return (
                            <div
                                key={wh.id}
                                onClick={() => router.push(`/warehouses/${wh.id}`)}
                                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    {/* ✅ แสดงรูปภาพ หรือ ไอคอน */}
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100">
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt={wh.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} // ถ้าโหลดรูปไม่ได้ให้ซ่อนแล้วโชว์ไอคอน
                                            />
                                        ) : null}
                                        {/* ไอคอนสำรอง (แสดงเมื่อไม่มีรูป หรือโหลดรูปไม่ได้) */}
                                        <div className={`p-3 text-blue-600 ${imageUrl ? 'hidden' : 'block'}`}>
                                            <Warehouse size={32} />
                                        </div>
                                    </div>

                                    {/* ปุ่มจัดการ */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSaveWarehouse(wh); }} // 👉 แก้ไข (ส่ง wh ไป)
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                            title="แก้ไข"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteWarehouse(e, wh.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="ลบ"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 mb-2 pr-8">{wh.name}</h3>

                                <div className="flex items-center text-blue-600 text-sm font-medium mt-auto">
                                    ดูรายการสินค้า <ChevronRight size={16} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}