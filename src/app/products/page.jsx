'use client';

import { useEffect, useState, useRef, Suspense } from 'react'; // ✅ เพิ่ม Suspense
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
import Cookies from 'js-cookie';
import { Filter, Search, Trash2, Plus, X, Upload, Wand2, Save, Download, Box, Edit, ChevronLeft, ChevronRight, ScanBarcode, AlertTriangle } from 'lucide-react';
import Barcode from 'react-barcode';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useSearchParams } from 'next/navigation';

const CATEGORIES = ["ทั้งหมด", "เครื่องมือแพทย์", "อุปกรณ์ไฟฟ้า", "อุปกรณ์คอมพิวเตอร์", "ครุภัณฑ์", "เกษตร", "ก่อสร้าง", "สื่อการสอน", "งานไฟฟ้า",
    "เฟอร์นิเจอร์", "ครัวเรือน", "เทคโนโลยี", "เครื่องจักร",
    "อุปกรณ์การแพทย์", "เวชภัณฑ์", "ดนตรี", "อุปกรณ์ที่ใช้ในสำนักงาน",
    "วัสดุสำนักงาน", "สุขภัณฑ์", "โซล่าเซลล์", "วิทยาศาสตร์",
    "กีฬา", "เครื่องมือช่าง",];
const UNITS = ["ชิ้น", "กล่อง", "แพ็ค", "โหล", "เครื่อง", "ชุด", "อัน", "ตัว"];

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ✅ 1. แยก Logic การทำงานหลักมาไว้ใน Component ชื่อ ProductsContent
function ProductsContent() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [showLowStock, setShowLowStock] = useState(false);
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

    // ✅ เรียกใช้ Hook เพื่ออ่าน URL (ทำงานได้ปกติเพราะถูกห่อด้วย Suspense แล้ว)
    const searchParams = useSearchParams();

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam === 'low_stock') {
            setShowLowStock(true);
        }
    }, [searchParams]);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
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
        // ✅ กรองสินค้าใกล้หมด (ต่ำกว่า 20)
        if (showLowStock) {
            result = result.filter(p => Number(p.total_stock) < 20);
        }
        setFilteredProducts(result);
        setCurrentPage(1);
    }, [search, selectedCategory, showLowStock, products]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

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

    // --- ส่วนของ JSX (UI) ทั้งหมด ---
    return (
        <div className="flex bg-slate-50 min-h-screen font-sans overflow-x-hidden">
            <Sidebar />
            <div className="flex-1 p-4 md:p-6 lg:p-10 transition-all w-full max-w-[100vw]  mt-16 md:mt-6  lg:mt-1   ">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight">จัดการสินค้า</h1>
                        <p className="text-slate-500 mt-1 text-sm md:text-base">ตรวจสอบและจัดการรายการสินค้าในคลังของคุณ ({filteredProducts.length} รายการ)</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <button
                            onClick={handleExportExcel}
                            className="flex-1 sm:flex-none justify-center bg-white text-emerald-600 border border-emerald-200 px-5 py-2.5 rounded-xl flex gap-2 items-center hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm font-medium text-sm md:text-base"
                        >
                            <Download size={20} /> Export Excel
                        </button>

                        {role === "ADMIN" && (
                            <button
                                className="flex-1 sm:flex-none justify-center bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex gap-2 items-center hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 font-medium text-sm md:text-base"
                                onClick={() => handleOpenModal(null)}
                            >
                                <Plus size={20} /> เพิ่มสินค้าใหม่
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
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-slate-200 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 placeholder:text-slate-400 text-sm md:text-base"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full md:w-64">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-10 pr-8 py-3 bg-slate-50 border-slate-200 border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 cursor-pointer text-sm md:text-base"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {/* ✅ ปุ่มแสดงสินค้าใกล้หมด */}
                    <button
                        onClick={() => setShowLowStock(!showLowStock)}
                        className={`w-full md:w-auto px-5 py-3 rounded-xl flex gap-2 items-center justify-center font-medium text-sm md:text-base transition-all ${showLowStock
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-200 hover:bg-rose-700'
                            : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                            }`}
                    >
                        <AlertTriangle size={20} />
                        <span>สินค้าใกล้หมด</span>

                    </button>
                </div>

                {/* Table Section */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <table className="w-full table-fixed border-collapse">
                        <thead className="bg-slate-50 border-b">
                            {/* ปรับขนาดตัวหนังสือหัวตารางสำหรับจอคอม (md, lg) ให้ใหญ่ขึ้น */}
                            <tr className="text-xs md:text-sm lg:text-base text-slate-600">
                                <th className="w-[26%] px-3 py-4 text-left font-semibold">สินค้า</th>
                                <th className="w-[16%] px-3 py-4 font-semibold">รหัสสินค้า</th>
                                <th className="w-[14%] px-3 py-4 font-semibold text-center">บาร์โค้ด</th>
                                <th className="w-[12%] px-3 py-4 font-semibold hidden md:table-cell">หมวด</th>
                                <th className="w-[10%] px-3 py-4 font-semibold text-center">คงเหลือ</th>
                                <th className="w-[8%] px-3 py-4 font-semibold text-center">หน่วย</th>
                                <th className="w-[14%] px-3 py-4 font-semibold text-center">จัดการ</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">
                            {currentItems.map((p) => (
                                <tr key={p.id} className="hover:bg-indigo-50/30">
                                    {/* ===== สินค้า ===== */}
                                    <td className="px-3 py-4 align-top">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                                                {p.image_url
                                                    ? <img src={getImageUrl(p.image_url)} className="w-full h-full object-cover" />
                                                    : <Box size={20} className="text-slate-400" />
                                                }
                                            </div>

                                            <div className="min-w-0 flex flex-col justify-center">
                                                {/* ชื่อสินค้าใหญ่ขึ้นบนจอคอม */}
                                                <p className="font-semibold text-slate-800 text-sm md:text-base lg:text-sm truncate">
                                                    {p.name}
                                                </p>
                                                <span className="md:hidden text-[11px] text-slate-500">
                                                    {p.category}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* ===== SKU ===== */}
                                    <td className="px-3 py-4 align-top">
                                        {/* SKU ใหญ่ขึ้นบนจอคอม */}
                                        <span className="block bg-slate-50 border border-slate-100 px-2 py-1 rounded text-slate-600 text-xs md:text-sm font-mono break-all">
                                            {p.sku || "-"}
                                        </span>
                                    </td>

                                    {/* ===== BARCODE ===== */}
                                    <td className="px-3 py-4 text-center align-middle">
                                        <div
                                            onClick={() => setSelectedSku(p.sku)}
                                            className="cursor-pointer border border-dashed border-slate-300 rounded p-1 h-8 md:h-10 mx-auto flex justify-center items-center hover:border-indigo-400 bg-white overflow-hidden"
                                        >
                                            {p.barcode_url ? (
                                                // กรณีมีรูปที่อัปโหลดไว้ -> โชว์รูป
                                                <img src={getImageUrl(p.barcode_url)} className="h-full object-contain" />
                                            ) : (
                                                // กรณีไม่มีรูป -> สร้างบาร์โค้ดจาก SKU (ตัดตัวหนังสือออกเพื่อให้ใส่ในช่องเล็กๆ ได้พอดี)
                                                <div className="flex items-center justify-center w-full h-full transform scale-75 origin-center">
                                                    <Barcode
                                                        value={p.sku}
                                                        format="CODE128"
                                                        width={1.5}
                                                        height={40}
                                                        displayValue={false} // ไม่โชว์ตัวเลข SKU (เพราะช่องมันเล็ก)
                                                        margin={0}
                                                        background="transparent"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* ===== CATEGORY ===== */}
                                    <td className="px-3 py-4 hidden md:table-cell align-middle">
                                        <span className="text-xs md:text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full whitespace-nowrap">
                                            {p.category}
                                        </span>
                                    </td>

                                    {/* ===== STOCK ===== */}
                                    <td className="px-3 py-4 text-center align-middle">
                                        {/* ตัวเลขสต็อกใหญ่ขึ้น */}
                                        {/* ✅ แก้ไขเงื่อนไขตรงนี้: แปลงเป็นตัวเลข และเช็คว่าถ้า >= 20 สีเขียว, ถ้าน้อยกว่านั้นสีแดง */}
                                        <span className={`font-bold text-sm md:text-base lg:text-lg ${Number(p.total_stock) >= 20 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {p.total_stock > 0 ? p.total_stock : 'หมด'}
                                        </span>
                                    </td>

                                    {/* ===== UNIT ===== */}
                                    <td className="px-3 py-4 text-center align-middle">
                                        <span className="text-xs md:text-sm text-slate-600">
                                            {p.unit || "ชิ้น"}
                                        </span>
                                    </td>

                                    {/* ===== ACTION ===== */}
                                    <td className="px-3 py-4 text-center align-middle">
                                        {role === "ADMIN" && (
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleOpenModal(p)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded transition">
                                                    <Edit size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-rose-50 text-rose-600 rounded transition">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}

                        </tbody>
                    </table>
                </div>
                {filteredProducts.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
                        <div className="text-xs text-slate-500">
                            แสดง {indexOfFirstItem + 1} ถึง {Math.min(indexOfLastItem, filteredProducts.length)} จาก {filteredProducts.length} รายการ
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-slate-600"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 3 + i;
                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                }
                                if (pageNum < 1) pageNum = i + 1;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${currentPage === pageNum
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-white'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-slate-600"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL เพิ่ม/แก้ไข สินค้า */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
                        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg md:text-2xl font-bold text-slate-800">{editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2>
                                <p className="text-xs md:text-sm text-slate-500 mt-1">กรอกข้อมูลสินค้าให้ครบถ้วน</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition"><X size={24} /></button>
                        </div>

                        <div className="p-4 md:p-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
                            <form className="space-y-6">
                                {/* Image Upload */}
                                <div className="flex justify-center">
                                    <div
                                        className="group relative w-32 h-32 md:w-48 md:h-48 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 hover:bg-indigo-50/30 overflow-hidden"
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium">
                                                    เปลี่ยนรูปภาพ
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={32} className="text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                                                <span className="text-slate-400 text-xs md:text-sm font-medium group-hover:text-indigo-600">อัปโหลดรูปภาพ</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อสินค้า <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="ระบุชื่อสินค้า"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสสินค้า (SKU) <span className="text-red-500">*</span></label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-mono text-sm"
                                                value={formData.sku}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                placeholder="หรือกดสร้างอัตโนมัติ"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGenerateSKU}
                                                className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-200 transition-colors"
                                                title="สร้างรหัสอัตโนมัติ"
                                            >
                                                <Wand2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">หมวดหมู่</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm appearance-none cursor-pointer"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">ราคาทุน (บาท)</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm"
                                            value={formData.cost_price}
                                            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">ราคาขาย (บาท)</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm"
                                            value={formData.sale_price}
                                            onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">หน่วยนับ</label>
                                        <select
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm appearance-none cursor-pointer"
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        >
                                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">จุดสั่งซื้อเพิ่ม (Reorder Point)</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm"
                                            value={formData.reorder_point}
                                            onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                                            min="0"
                                        />
                                    </div>

                                    {!editingId && (
                                        <>
                                            <div className="md:col-span-2 border-t border-slate-100 my-2"></div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">จำนวนเริ่มต้น</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm"
                                                    value={formData.initial_stock}
                                                    onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                                                    placeholder="จำนวนสต็อกตั้งต้น"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">เลือกคลังจัดเก็บ</label>
                                                <select
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm appearance-none cursor-pointer"
                                                    value={formData.warehouse_id}
                                                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                                                >
                                                    <option value="" disabled>-- เลือกคลัง --</option>
                                                    {warehouses.map(w => (
                                                        <option key={w.id} value={w.id}>{w.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {/* Barcode Preview (Hidden but used for generation) */}
                                    {formData.sku && (
                                        <div className="hidden">
                                            <div ref={barcodeRef}>
                                                <Barcode value={formData.sku} format="CODE128" width={2} height={50} displayValue={true} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="p-4 md:p-6 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 transition-all text-sm font-medium"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all text-sm font-medium flex gap-2 items-center"
                            >
                                <Save size={18} /> บันทึกข้อมูล
                            </button>
                            {/* ปุ่มโหลดบาร์โค้ด (เฉพาะตอนแก้ไขที่มี SKU แล้ว) */}
                            {formData.sku && (
                                <button
                                    type="button"
                                    onClick={downloadBarcode}
                                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-all text-sm font-medium flex gap-2 items-center"
                                >
                                    <ScanBarcode size={18} /> โหลดบาร์โค้ด
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ดู Barcode ขยายใหญ่ (ถ้ามี) */}
            {selectedSku && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedSku(null)}
                >
                    <div
                        className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 max-w-sm w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Barcode สินค้า</h3>
                        <div className="bg-white p-4 border border-slate-100 rounded-xl mb-6 w-full flex justify-center" ref={viewerRef}>
                            <Barcode value={selectedSku} format="CODE128" width={2} height={80} displayValue={true} fontSize={16} />
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setSelectedSku(null)}
                                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium"
                            >
                                ปิด
                            </button>
                            <button
                                onClick={downloadFromViewer}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition font-medium flex justify-center items-center gap-2"
                            >
                                <Download size={20} /> ดาวน์โหลด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ✅ 2. Export Default Component ที่ห่อด้วย Suspense เพื่อแก้ Prerender Error
export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">กำลังโหลดข้อมูล...</div>}>
            <ProductsContent />
        </Suspense>
    );
}