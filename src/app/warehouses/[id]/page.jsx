'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ImportHistory from '@/components/ImportHistory';
import api from '@/lib/axios';
import {
    ArrowLeft, Box, Filter, Search, ZoomIn, X, Download,
    Loader2, UploadCloud, Trash2, CheckSquare, Square,
    AlertCircle, CheckCircle, XCircle, AlertTriangle,
    History, Package
} from 'lucide-react';
import Barcode from 'react-barcode';
import Cookies from 'js-cookie';


const MASTER_CATEGORIES = [
    "เกษตร", "ก่อสร้าง", "สื่อการสอน", "งานไฟฟ้า",
    "เฟอร์นิเจอร์", "ครัวเรือน", "เทคโนโลยี", "เครื่องจักร",
    "อุปกรณ์การแพทย์", "เวชภัณฑ์", "ดนตรี", "อุปกรณ์ที่ใช้ในสำนักงาน",
    "วัสดุสำนักงาน", "สุขภัณฑ์", "โซล่าเซลล์", "วิทยาศาสตร์",
    "กีฬา", "เครื่องมือช่าง", "อื่นๆ"
];

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://stock-api-backend-iox1.onrender.com';

export default function WarehouseDetail() {
    const { id } = useParams();
    const router = useRouter();

    const [warehouse, setWarehouse] = useState(null);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedSku, setSelectedSku] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });

    // ✅ Progress States
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importProgress, setImportProgress] = useState(0);
    const [importStatus, setImportStatus] = useState('idle');

    const viewerRef = useRef(null);
    const fileInputRef = useRef(null);
    const eventSourceRef = useRef(null);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${BASE_API_URL}${url}`;
    };

    const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));
    const showModal = (type, title, message, onConfirm = null) => {
        setModal({ isOpen: true, type, title, message, onConfirm });
    };

    const fetchInventory = () => {
        setLoading(true);
        api.get(`/warehouses/${id}/inventory`)
            .then(res => {
                setWarehouse(res.data.warehouse);
                const sortedProducts = (res.data.products || []).sort((a, b) => b.id - a.id);
                setProducts(sortedProducts);
                setFilteredProducts(sortedProducts);
                setSelectedIds([]);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchInventory(); }, [id]);

    useEffect(() => {
        let result = [...products];
        if (selectedCategory !== 'ทั้งหมด') {
            result = result.filter(p => p.category === selectedCategory);
        }
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerSearch) ||
                p.sku.toLowerCase().includes(lowerSearch)
            );
        }
        setFilteredProducts(result);
    }, [selectedCategory, search, products]);

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
                console.log('🧹 SSE cleaned up');
            }
        };
    }, []);


    const currentCounts = products.reduce((acc, item) => {
        const cat = item.category || 'อื่นๆ';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.match(/\.(xlsx|xls|pdf)$/)) {
            showModal('error', 'ไฟล์ไม่ถูกต้อง', 'รองรับเฉพาะไฟล์ Excel (.xlsx, .xls) และ PDF (.pdf) เท่านั้น');
            e.target.value = null;
            return;
        }
        showModal('confirm', 'ยืนยันการนำเข้าไฟล์', `คุณต้องการนำเข้าข้อมูลจากไฟล์: ${file.name} ใช่หรือไม่?`, () => processUpload(file));
        e.target.value = null;
    };

    const processUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const token = Cookies.get('token');
        if (!token) {
            showModal('error', 'ไม่ได้เข้าสู่ระบบ', 'กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        try {
            setIsUploading(true);
            setImportStatus('uploading');
            setUploadProgress(0);
            setImportProgress(0);

            // 🔌 SSE URL (ใช้ API_BASE เดียวกัน)
            const sseUrl =
                `${API_BASE}/api/warehouses/${id}/import-progress?token=${token}`;

            console.log('🔌 SSE URL:', sseUrl);

            // ❗ ปิดของเก่าก่อน
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const es = new EventSource(sseUrl);
            eventSourceRef.current = es;

            es.onopen = () => {
                console.log('✅ SSE Connected');
            };

            es.onmessage = (event) => {
                if (!event.data) return;

                const data = JSON.parse(event.data);
                console.log('📊 SSE DATA:', data);

                if (typeof data.progress === 'number') {
                    setImportProgress(data.progress);
                }

                if (data.status) {
                    setImportStatus(data.status);
                }

                if (data.status === 'done') {
                    setImportProgress(100);
                    setImportStatus('done');

                    es.close();
                    eventSourceRef.current = null;

                    fetchInventory();
                    setHistoryRefreshKey(prev => prev + 1);
                }

                if (data.status === 'error') {
                    setImportStatus('error');
                    es.close();
                    eventSourceRef.current = null;
                }
            };

            es.onerror = () => {
                console.warn('⚠ SSE disconnected');
                es.close();
                eventSourceRef.current = null;
            };

            // 📤 Upload file
            const res = await api.post(
                `/warehouses/${id}/import-file`,
                formData,
                {
                    onUploadProgress: (e) => {
                        if (!e.total) return;
                        const percent = Math.round((e.loaded * 100) / e.total);
                        setUploadProgress(percent);
                        if (percent === 100) setImportStatus('importing');
                    }
                }
            );

            showModal(
                'success',
                'นำเข้าสำเร็จ',
                `นำเข้าข้อมูล ${res.data.count || 0} รายการ`
            );

        } catch (err) {
            console.error('❌ IMPORT ERROR:', err);
            setImportStatus('error');
            showModal(
                'error',
                'เกิดข้อผิดพลาด',
                err.response?.data?.error || err.message
            );
        } finally {
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                setImportProgress(0);
                setImportStatus('idle');
            }, 1500);
        }
    };


    const handleDeleteOne = (productId) => {
        showModal('confirm', 'ยืนยันการลบ', 'คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?', async () => {
            try {
                setIsDeleting(true);
                await api.delete(`/products/${productId}`);
                setProducts(prev => prev.filter(p => p.id !== productId));
                setSelectedIds(prev => prev.filter(id => id !== productId));
            } catch (error) {
                showModal('error', 'ลบไม่สำเร็จ', 'เกิดข้อผิดพลาดในการลบสินค้า');
            } finally {
                setIsDeleting(false);
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        showModal('confirm', 'ยืนยันการลบหมู่', `ต้องการลบ ${selectedIds.length} รายการ?`, async () => {
            try {
                setIsDeleting(true);
                await Promise.all(selectedIds.map(pid => api.delete(`/products/${pid}`)));
                setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
                setSelectedIds([]);
                showModal('success', 'เรียบร้อย', 'ลบข้อมูลเรียบร้อย');
            } catch (error) {
                showModal('error', 'ผิดพลาด', 'เกิดข้อผิดพลาดในการลบหมู่');
                fetchInventory();
            } finally {
                setIsDeleting(false);
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) setSelectedIds([]);
        else setSelectedIds(filteredProducts.map(p => p.id));
    };

    const toggleSelectOne = (pid) => {
        if (selectedIds.includes(pid)) setSelectedIds(prev => prev.filter(id => id !== pid));
        else setSelectedIds(prev => [...prev, pid]);
    };

    const downloadFromViewer = () => {
        const svg = viewerRef.current.querySelector("svg");
        if (!svg) return;
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
            link.download = `${selectedSku}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    if (loading && !products.length) return <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500"><Loader2 className="animate-spin mr-2" /> กำลังโหลดข้อมูล...</div>;
    if (!warehouse && !loading) return <div className="p-10 text-center text-red-500">ไม่พบข้อมูลคลังสินค้า</div>;

    return (
        <div className="flex bg-slate-50 min-h-screen font-sans text-slate-800">
            <Sidebar />
            <div className="flex-1 p-6 lg:p-10 relative">

                <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-6 transition-colors group font-medium">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> ย้อนกลับ
                </button>

                {/* Header Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
                    <div className="flex items-center gap-5 z-10">
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                            {warehouse?.image_url ? (
                                <img src={getImageUrl(warehouse.image_url)} alt={warehouse.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
                            ) : null}
                            <div className={`${warehouse?.image_url ? 'hidden' : 'block'} text-slate-300`}><Package size={32} /></div>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">{warehouse?.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-sm text-slate-500 font-medium">สถานะ: เปิดใช้งาน</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-4 z-10 w-full md:w-auto">
                        <div className="text-right hidden md:block">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">รายการทั้งหมด</p>
                            <p className="text-3xl font-extrabold text-indigo-600">{products.length.toLocaleString()}</p>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setShowHistory(true)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                            >
                                <History size={18} /> <span className="hidden sm:inline">ประวัติ</span>
                            </button>

                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .pdf" />
                            <button
                                onClick={() => fileInputRef.current.click()}
                                disabled={isUploading}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium shadow-md shadow-indigo-200 transition-all active:scale-95 ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isUploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                                <span className="hidden sm:inline">{isUploading ? 'กำลังนำเข้า...' : 'นำเข้าไฟล์'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ✅ Progress Card - แยกออกมาแสดงชัดเจน */}
                {isUploading && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 animate-in fade-in duration-300">
                        <div className="space-y-4">
                            {/* Upload Progress */}
                            <div>
                                <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        📤 อัปโหลดไฟล์
                                    </span>
                                    <span className="text-indigo-600">{uploadProgress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Import Progress */}
                            <div>
                                <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                                    <span className="flex items-center gap-2">
                                        📊 ประมวลผลข้อมูล
                                    </span>
                                    <span className="text-emerald-600">{importProgress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                                        style={{ width: `${importProgress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Status Text */}
                            <div className="text-sm text-slate-600 text-center pt-2">
                                {importStatus === 'uploading' && '⏳ กำลังอัปโหลดไฟล์...'}
                                {importStatus === 'importing' && '⚙️ กำลังประมวลผลและนำเข้าข้อมูล...'}
                                {importStatus === 'done' && '✅ นำเข้าเสร็จสมบูรณ์!'}
                                {importStatus === 'error' && '❌ เกิดข้อผิดพลาด'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Category Filter */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Filter size={16} className="text-indigo-500" /> หมวดหมู่สินค้า
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                        <button
                            onClick={() => setSelectedCategory('ทั้งหมด')}
                            className={`px-3 py-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-full min-h-[70px] group ${selectedCategory === 'ทั้งหมด'
                                ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-2 ring-slate-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:shadow-sm'
                                }`}
                        >
                            <span className="text-[10px] opacity-70">ทั้งหมด</span>
                            <span className="text-lg font-bold leading-tight">{products.length}</span>
                        </button>
                        {MASTER_CATEGORIES.map((cat) => {
                            const count = currentCounts[cat] || 0;
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-full min-h-[70px] relative overflow-hidden ${isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-100'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                        }`}
                                >
                                    <span className="text-[10px] opacity-80 truncate w-full z-10 relative" title={cat}>{cat}</span>
                                    <span className={`text-lg font-bold leading-tight z-10 relative ${count === 0 && !isSelected ? 'text-slate-300' : ''}`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search & Table */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-800">รายการสินค้า</h2>
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold border border-slate-200">
                            {filteredProducts.length}
                        </span>
                        {selectedCategory !== 'ทั้งหมด' && (
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                                ในหมวด: {selectedCategory}
                            </span>
                        )}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อสินค้า, รหัส SKU..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-slate-700 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-20">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-4 px-6 text-center w-12">
                                        <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                            {selectedIds.length > 0 && selectedIds.length === filteredProducts.length ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                                        </button>
                                    </th>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">สินค้า</th>
                                    <th className="py-4 px-6 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">บาร์โค้ด</th>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">รายละเอียด</th>
                                    <th className="py-4 px-6 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">หมวดหมู่</th>
                                    <th className="py-4 px-6 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">คงเหลือ</th>
                                    <th className="py-4 px-6 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">หน่วย</th>
                                    <th className="py-4 px-6 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((p) => {
                                        const isSelected = selectedIds.includes(p.id);
                                        return (
                                            <tr key={p.id} className={`group transition-colors duration-150 ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                                                <td className="py-4 px-6 text-center">
                                                    <button onClick={() => toggleSelectOne(p.id)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                                        {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                                                    </button>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 shrink-0 overflow-hidden mx-auto md:mx-0">
                                                        {p.image_url ? <img src={getImageUrl(p.image_url)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Package size={20} /></div>}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <div
                                                        onClick={() => setSelectedSku(p.sku)}
                                                        className="cursor-pointer hover:scale-105 transition-transform inline-block p-1 rounded hover:bg-white hover:shadow-sm"
                                                    >
                                                        {p.barcode_url ? <img src={getImageUrl(p.barcode_url)} className="h-8 max-w-[100px] object-contain opacity-80 hover:opacity-100" alt="barcode" /> : <span className="text-xs text-slate-400">-</span>}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col max-w-[200px] whitespace-normal">
                                                        <span className="font-semibold text-slate-800 text-sm line-clamp-2">{p.name}</span>
                                                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">{p.sku}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                        ${p.category === 'เครื่องมือแพทย์' ? 'bg-rose-100 text-rose-800' :
                                                            p.category === 'อุปกรณ์ไฟฟ้า' ? 'bg-amber-100 text-amber-800' :
                                                                'bg-slate-100 text-slate-600'}`}>
                                                        {p.category || 'ทั่วไป'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <span className={`font-bold text-lg ${p.quantity <= 20 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                        {p.quantity.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center text-sm text-slate-500">{p.unit}</td>
                                                <td className="py-4 px-6 text-center">
                                                    <button
                                                        onClick={() => handleDeleteOne(p.id)}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors tooltip"
                                                        title="ลบรายการ"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <Box size={48} className="text-slate-200" />
                                                <p>ไม่พบสินค้าในเงื่อนไขนี้</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bulk Action Bar */}
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 transition-all duration-300 z-40 ${selectedIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                    <div className="flex items-center gap-3">
                        <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">{selectedIds.length}</span>
                        <span className="text-sm font-medium">รายการที่เลือก</span>
                    </div>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <button
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 text-rose-300 hover:text-rose-200 font-medium text-sm transition-colors"
                    >
                        {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} ลบที่เลือก
                    </button>
                    <button onClick={() => setSelectedIds([])} className="ml-2 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                </div>

            </div>

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <History size={20} className="text-indigo-500" /> ประวัติการนำเข้าไฟล์
                            </h3>
                            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar bg-white">
                            <ImportHistory warehouseId={id} refreshKey={historyRefreshKey} />
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${modal.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                modal.type === 'error' ? 'bg-rose-100 text-rose-600' :
                                    modal.type === 'confirm' ? 'bg-amber-100 text-amber-600' :
                                        'bg-indigo-100 text-indigo-600'
                                }`}>
                                {modal.type === 'success' && <CheckCircle size={28} />}
                                {modal.type === 'error' && <XCircle size={28} />}
                                {modal.type === 'confirm' && <AlertTriangle size={28} />}
                                {modal.type === 'info' && <AlertCircle size={28} />}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{modal.title}</h3>
                            <p className="text-slate-500 text-sm mb-6 whitespace-pre-line leading-relaxed">{modal.message}</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={closeModal} className={`flex-1 py-2.5 rounded-xl font-medium transition-colors text-sm ${modal.type === 'confirm' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'hidden'}`}>{modal.type === 'confirm' ? 'ยกเลิก' : 'ปิด'}</button>
                                <button onClick={() => { if (modal.onConfirm) modal.onConfirm(); closeModal(); }} className={`flex-1 py-2.5 rounded-xl font-medium text-white shadow-lg transition-all hover:shadow-xl active:scale-95 text-sm ${modal.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' :
                                    modal.type === 'error' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' :
                                        modal.type === 'confirm' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
                                            'bg-indigo-600'
                                    }`}>{modal.type === 'confirm' ? 'ยืนยัน' : 'ตกลง'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Barcode Viewer */}
            {selectedSku && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedSku(null)}>
                    <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between w-full items-center">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ZoomIn size={20} className="text-indigo-500" /> Barcode</h3>
                            <button onClick={() => setSelectedSku(null)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div ref={viewerRef} className="p-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl w-full flex justify-center min-h-[120px] items-center">
                            <Barcode value={selectedSku} format="CODE128" width={2} height={80} fontSize={16} displayValue={true} />
                        </div>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setSelectedSku(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-medium transition-colors text-sm">ปิด</button>
                            <button onClick={downloadFromViewer} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:-translate-y-0.5 text-sm"><Download size={18} /> บันทึกรูป</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}