'use client';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { Filter, Search, Trash2, Plus, X, Upload, Wand2, Save, Download, ZoomIn, FileSpreadsheet, Edit, MapPin, Box, Package } from 'lucide-react';
import Barcode from 'react-barcode';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const CATEGORIES = ["ทั้งหมด", "เครื่องมือแพทย์", "อุปกรณ์ไฟฟ้า", "อุปกรณ์คอมพิวเตอร์", "ครุภัณฑ์", "เกษตร", "ก่อสร้าง", "สื่อการสอน", "งานไฟฟ้า",
    "เฟอร์นิเจอร์", "ครัวเรือน", "เทคโนโลยี", "เครื่องจักร",
    "อุปกรณ์การแพทย์", "เวชภัณฑ์", "ดนตรี", "อุปกรณ์ที่ใช้ในสำนักงาน",
    "วัสดุสำนักงาน", "สุขภัณฑ์", "โซล่าเซลล์", "วิทยาศาสตร์",
    "กีฬา", "เครื่องมือช่าง",];
const UNITS = ["ชิ้น", "กล่อง", "แพ็ค", "โหล", "เครื่อง", "ชุด", "อัน", "ตัว"];

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [role, setRole] = useState('');
    const [warehouses, setWarehouses] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedSku, setSelectedSku] = useState(null);
    const viewerRef = useRef(null);

    const [formData, setFormData] = useState({
        sku: '', name: '', category: CATEGORIES[1], unit: UNITS[0],
        cost_price: '', sale_price: '', reorder_point: 10,
        initial_stock: '', warehouse_id: ''
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const barcodeRef = useRef(null);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('http') || url.startsWith('data:')) {
            return url;
        }
        return `${BASE_API_URL}${url}`;
    };

    const fetchProducts = () => {
        api.get(`/products`).then(res => {
            setProducts(res.data);
            setFilteredProducts(res.data);
        });
    };

    const fetchWarehouses = () => {
        api.get('/warehouses').then(res => setWarehouses(res.data));
    };

    useEffect(() => {
        const role = Cookies.get("user_role");
        setRole(role);
        fetchProducts();
        fetchWarehouses();
    }, []);

    useEffect(() => {
        let result = products;
        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                p.sku.toLowerCase().includes(lower)
            );
        }
        if (selectedCategory !== 'ทั้งหมด') {
            result = result.filter(p => p.category === selectedCategory);
        }
        setFilteredProducts(result);
    }, [search, selectedCategory, products]);

    const handleExportExcel = async () => {
        Swal.fire({ title: 'กำลังสร้างไฟล์ Excel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Products');

            worksheet.columns = [
                { header: 'วันที่ข้อมูล', key: 'date', width: 20 },
                { header: 'รูปบาร์โค้ด', key: 'barcode_img', width: 25 },
                { header: 'รหัสสินค้า (SKU)', key: 'sku', width: 20 },
                { header: 'ชื่อสินค้า', key: 'name', width: 30 },
                { header: 'หมวดหมู่', key: 'category', width: 15 },
                { header: 'หน่วยนับ', key: 'unit', width: 10 },
                { header: 'คงเหลือรวม', key: 'total_stock', width: 15 },
                { header: 'รายละเอียดตามคลัง', key: 'stock_details', width: 40 },
            ];

            const now = new Date();
            const dateStr = `${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH')}`;

            for (let i = 0; i < filteredProducts.length; i++) {
                const p = filteredProducts[i];
                const stockDetails = p.stocks && p.stocks.length > 0
                    ? p.stocks.map(s => `${s.warehouse_name || 'คลังหลัก'}: ${s.quantity}`).join(', ')
                    : '-';

                const row = worksheet.addRow({
                    date: dateStr,
                    sku: p.sku,
                    name: p.name,
                    category: p.category,
                    unit: p.unit,
                    total_stock: p.total_stock,
                    stock_details: stockDetails,
                    barcode_img: ''
                });

                row.height = 60;

                if (p.barcode_url) {
                    try {
                        const imgUrl = getImageUrl(p.barcode_url);
                        const response = await fetch(imgUrl);
                        const buffer = await response.arrayBuffer();
                        const imageId = workbook.addImage({ buffer: buffer, extension: 'png' });
                        worksheet.addImage(imageId, {
                            tl: { col: 1, row: row.number - 1 },
                            ext: { width: 150, height: 75 }
                        });
                    } catch (err) {
                        row.getCell('barcode_img').value = 'No Image';
                    }
                } else {
                    row.getCell('barcode_img').value = '-';
                }
            }

            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Stock_Products_${now.toISOString().split('T')[0]}.xlsx`);
            Swal.close();
        } catch (error) {
            console.error(error);
            Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถสร้างไฟล์ Excel ได้", "error");
        }
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingId(product.id);
            setFormData({
                sku: product.sku,
                name: product.name,
                category: product.category,
                unit: product.unit,
                cost_price: product.cost_price || 0,
                sale_price: product.sale_price || 0,
                reorder_point: product.reorder_point || 0,
                initial_stock: '',
                warehouse_id: ''
            });
            setImagePreview(getImageUrl(product.image_url));
        } else {
            setEditingId(null);
            setFormData({
                sku: '', name: '', category: CATEGORIES[1], unit: UNITS[0],
                cost_price: '', sale_price: '', reorder_point: 10,
                initial_stock: '',
                warehouse_id: warehouses[0]?.id || ''
            });
            setImagePreview(null);
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const handleGenerateSKU = () => {
        const randomSku = Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
        setFormData(prev => ({ ...prev, sku: randomSku }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const downloadBarcode = () => {
        const svg = barcodeRef.current.querySelector("svg");
        if (!svg) return;
        saveSvgAsPng(svg, formData.sku);
    };

    const downloadFromViewer = () => {
        const svg = viewerRef.current.querySelector("svg");
        if (!svg) return;
        saveSvgAsPng(svg, selectedSku);
    };

    const saveSvgAsPng = (svg, filename) => {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const link = document.createElement("a");
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }

    const getBarcodeFile = () => {
        return new Promise((resolve) => {
            if (!barcodeRef.current) { resolve(null); return; }
            const svg = barcodeRef.current.querySelector("svg");
            if (!svg) { resolve(null); return; }

            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    const file = new File([blob], `barcode_${formData.sku}.png`, { type: "image/png" });
                    resolve(file);
                }, "image/png");
            };
            img.src = "data:image/svg+xml;base64," + btoa(svgData);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const data = new FormData();
        data.append("sku", formData.sku);
        data.append("name", formData.name);
        data.append("category", formData.category);
        data.append("unit", formData.unit);
        data.append("cost_price", formData.cost_price || 0);
        data.append("sale_price", formData.sale_price || 0);
        data.append("reorder_point", formData.reorder_point || 0);

        if (!editingId && formData.initial_stock && formData.warehouse_id) {
            data.append("initial_stock", formData.initial_stock);
            data.append("warehouse_id", formData.warehouse_id);
        }

        if (imageFile) data.append("image", imageFile);

        if (formData.sku) {
            try {
                const barcodeFile = await getBarcodeFile();
                if (barcodeFile) data.append("barcode_image", barcodeFile);
            } catch (err) { console.error("Barcode Error", err); }
        }

        try {
            if (editingId) {
                await api.put(`/products/${editingId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/products', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกเรียบร้อย", timer: 1500, showConfirmButton: false });
            setIsModalOpen(false);
            fetchProducts();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || "บันทึกไม่สำเร็จ";
            Swal.fire("ผิดพลาด", errorMsg, "error");
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: "ยืนยันการลบ?", text: "ข้อมูลจะไม่สามารถกู้คืนได้", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "ลบข้อมูล", cancelButtonText: "ยกเลิก"
        }).then((result) => {
            if (result.isConfirmed) {
                api.delete(`/products/${id}`).then(() => {
                    Swal.fire("ลบสำเร็จ", "", "success");
                    fetchProducts();
                });
            }
        });
    };

    return (
        <div className="flex bg-slate-50 min-h-screen font-sans">
            <Sidebar />
            <div className="flex-1 p-6 lg:p-10 transition-all">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">จัดการสินค้า</h1>
                        <p className="text-slate-500 mt-1 text-sm">ตรวจสอบและจัดการรายการสินค้าในคลังของคุณ</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={handleExportExcel}
                            className="flex-1 md:flex-none justify-center bg-white text-emerald-600 border border-emerald-200 px-5 py-2.5 rounded-xl flex gap-2 items-center hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm font-medium text-sm"
                        >
                            <FileSpreadsheet size={18} /> Export Excel
                        </button>

                        {role === "ADMIN" && (
                            <button
                                className="flex-1 md:flex-none justify-center bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex gap-2 items-center hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 font-medium text-sm"
                                onClick={() => handleOpenModal(null)}
                            >
                                <Plus size={18} /> เพิ่มสินค้าใหม่
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center mb-6">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อสินค้า, รหัส SKU..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-slate-200 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 placeholder:text-slate-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full md:w-64">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-10 pr-8 py-3 bg-slate-50 border-slate-200 border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 cursor-pointer"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">สินค้า</th>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">รหัส SKU</th>
                                    <th className="py-4 px-6 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">บาร์โค้ด</th>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">หมวดหมู่</th>
                                    <th className="py-4 px-6 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">คงเหลือ</th>
                                    <th className="py-4 px-6 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">หน่วยนับ</th>
                                    <th className="py-4 px-6 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 transition-colors duration-150 group">
                                            {/* Product Image & Name */}
                                            <td className="py-4 px-6 align-top">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden">
                                                        {p.image_url ? (
                                                            <img src={getImageUrl(p.image_url)} className="w-full h-full object-cover" alt={p.name} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <Package size={20} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="max-w-[200px] whitespace-normal">
                                                        <div className="font-semibold text-slate-800 line-clamp-2">{p.name}</div>
                                                       
                                                    </div>
                                                </div>
                                            </td>

                                            {/* SKU */}
                                            <td className="py-4 px-6 align-top">
                                                <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{p.sku}</span>
                                            </td>

                                            {/* Barcode (Clickable) */}
                                            <td className="py-4 px-6 align-top text-center">
                                                <div
                                                    className="cursor-pointer hover:scale-105 transition-transform inline-block p-1 rounded hover:bg-white hover:shadow-sm"
                                                    onClick={() => setSelectedSku(p.sku)}
                                                >
                                                    {p.barcode_url ? (
                                                        <img src={getImageUrl(p.barcode_url)} className="h-8 max-w-[100px] object-contain opacity-80 hover:opacity-100" alt="barcode" />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="py-4 px-6 align-top">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${p.category === 'เครื่องมือแพทย์' ? 'bg-rose-100 text-rose-800' :
                                                        p.category === 'อุปกรณ์ไฟฟ้า' ? 'bg-amber-100 text-amber-800' :
                                                            p.category === 'อุปกรณ์คอมพิวเตอร์' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {p.category}
                                                </span>
                                            </td>

                                            {/* Stock Details */}
                                            <td className="py-4 px-6 align-top text-right">
                                                <div className="flex flex-col gap-2 items-end">
                                                    {p.stocks && p.stocks.length > 0 ? (
                                                        p.stocks.map((stock, index) => (
                                                            stock.quantity > 0 && (
                                                                <div key={index} className="flex items-center gap-2 text-xs bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                                                                    <div className="flex items-center gap-1 text-slate-500">
                                                                        <MapPin size={10} />
                                                                        {stock.warehouse_name || 'คลังหลัก'}
                                                                    </div>
                                                                    <div className="font-bold text-indigo-600">
                                                                        {stock.quantity.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            )
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">ไม่มีสินค้า</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 align-top text-right">
                                                <div className="flex flex-col gap-2 items-end">
                                                     <div className="text-xs text-slate-500 mt-0.5">{p.unit}</div>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 align-top text-center">
                                                {role === "ADMIN" && (
                                                    <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleOpenModal(p)}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors tooltip"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(p.id)}
                                                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors tooltip"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <Box size={48} className="text-slate-200" />
                                                <p>ไม่พบข้อมูลสินค้า</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL เพิ่ม/แก้ไข สินค้า */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2>
                                <p className="text-xs text-slate-500 mt-1">กรอกข้อมูลสินค้าให้ครบถ้วน</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form className="space-y-6">
                                {/* Image Upload */}
                                <div className="flex justify-center">
                                    <div
                                        className="group relative w-40 h-40 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-indigo-50/30 overflow-hidden"
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                                                    เปลี่ยนรูปภาพ
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                                    <Upload size={24} className="text-indigo-500" />
                                                </div>
                                                <span className="text-xs text-slate-500 font-medium">อัปโหลดรูปภาพ</span>
                                            </>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleImageChange} accept="image/*" />
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">รหัสสินค้า (SKU)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.sku}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="ระบุรหัส หรือกดปุ่มสุ่ม"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGenerateSKU}
                                                className="px-4 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100 font-medium text-sm flex items-center gap-2 transition"
                                            >
                                                <Wand2 size={16} /> สุ่ม
                                            </button>
                                        </div>

                                        {/* Barcode Preview inside Form */}
                                        {formData.sku && (
                                            <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center">
                                                <div ref={barcodeRef} className="bg-white p-2 rounded shadow-sm mb-3">
                                                    <Barcode value={formData.sku} format="CODE128" width={1.5} height={40} fontSize={12} />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={downloadBarcode}
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-3 py-1.5 rounded-full"
                                                >
                                                    <Download size={12} /> ดาวน์โหลดบาร์โค้ด
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อสินค้า</label>
                                        <input
                                            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="ชื่อสินค้าฉบับเต็ม"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">หมวดหมู่</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all appearance-none"
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                >
                                                    {CATEGORIES.filter(c => c !== "ทั้งหมด").map(c => <option key={c}>{c}</option>)}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">หน่วยนับ</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none transition-all appearance-none"
                                                    value={formData.unit}
                                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                >
                                                    {UNITS.map(u => <option key={u}>{u}</option>)}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Initial Stock Section */}
                                    {!editingId && (
                                        <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Package className="text-indigo-500" size={18} />
                                                <label className="text-sm font-bold text-indigo-900">ตั้งค่าสต็อกเริ่มต้น</label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">คลังสินค้า</label>
                                                    <select
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                                                        value={formData.warehouse_id}
                                                        onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                                                    >
                                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">จำนวนเริ่มต้น</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                                        value={formData.initial_stock}
                                                        onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 font-medium transition text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 flex items-center gap-2 transition text-sm"
                                onClick={handleSubmit}
                            >
                                <Save size={18} /> {editingId ? "บันทึกการแก้ไข" : "ยืนยันการเพิ่มสินค้า"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL Barcode Viewer */}
            {selectedSku && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-60"
                    onClick={() => setSelectedSku(null)}
                >
                    <div
                        className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200 max-w-sm w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between w-full items-center">
                            <h3 className="text-lg font-bold text-slate-800">Barcode Viewer</h3>
                            <button onClick={() => setSelectedSku(null)} className="p-1 hover:bg-slate-100 rounded-full transition"><X size={20} className="text-slate-400" /></button>
                        </div>

                        <div ref={viewerRef} className="p-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl w-full flex justify-center">
                            <Barcode
                                value={selectedSku}
                                format="CODE128"
                                width={2}
                                height={80}
                                fontSize={16}
                                displayValue={true}
                            />
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={downloadFromViewer} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                                <Download size={20} /> บันทึกรูปภาพ
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}