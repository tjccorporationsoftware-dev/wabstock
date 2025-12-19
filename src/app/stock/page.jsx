'use client';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/axios';
import Swal from 'sweetalert2';
// ✅ เพิ่ม Plus เข้าไปใน import แล้วครับ
import { Truck, Search, Plus, ShoppingCart, X, MapPin, Package, AlertTriangle, ScanBarcode, Warehouse, Check, Box } from 'lucide-react';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function StockOutModernPage() {
    // --- Data State ---
    const [allProducts, setAllProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [cart, setCart] = useState([]);
    const [reason, setReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // --- Filter State ---
    const [selectedFilterWarehouse, setSelectedFilterWarehouse] = useState('ALL');

    // --- Modal State ---
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [selectedProductForAdd, setSelectedProductForAdd] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const searchInputRef = useRef(null);

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('http') || url.startsWith('data:')) {
            return url;
        }
        return `${BASE_API_URL}${url}`;
    };

    // 1. โหลดข้อมูล (สินค้า + คลังสินค้า)
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            const [productsRes, warehousesRes] = await Promise.all([
                api.get('/products'),
                api.get('/warehouses')
            ]);
            setAllProducts(productsRes.data);
            setWarehouses(warehousesRes.data);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. ฟังก์ชันเมื่อกดที่สินค้า
    const handleProductClick = (product) => {
        if (!product.stocks || product.stocks.every(s => s.quantity <= 0)) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'warning', title: 'สินค้าหมดสต็อก' });
            return;
        }

        if (selectedFilterWarehouse !== 'ALL') {
            const targetStock = product.stocks.find(s => s.warehouse_id === selectedFilterWarehouse);
            if (targetStock && targetStock.quantity > 0) {
                addToCart(product, targetStock);
            } else {
                Swal.fire('สินค้าหมด', 'สินค้านี้ไม่มีในคลังที่คุณเลือก', 'warning');
            }
            return;
        }

        const availableWarehouses = product.stocks.filter(s => s.quantity > 0);
        if (availableWarehouses.length === 1) {
            addToCart(product, availableWarehouses[0]);
        } else {
            setSelectedProductForAdd(product);
            setIsWarehouseModalOpen(true);
        }
    };

    // 3. เพิ่มลงตะกร้า
    const addToCart = (product, stockInfo) => {
        const warehouseId = stockInfo.warehouse_id || stockInfo.warehouse?.id;
        const warehouseName = stockInfo.warehouse_name || stockInfo.warehouse?.name;
        const uniqueKey = `${product.id}-${warehouseId}`;
        const exists = cart.find(item => item.uniqueKey === uniqueKey);

        if (exists) {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
            Toast.fire({ icon: 'info', title: 'รายการนี้อยู่ในตะกร้าแล้ว' });
        } else {
            const newItem = {
                uniqueKey: uniqueKey,
                productId: product.id,
                name: product.name,
                sku: product.sku,
                unit: product.unit,
                image_url: product.image_url,
                warehouseId: warehouseId,
                warehouseName: warehouseName,
                maxQty: stockInfo.quantity,
                inputQty: ''
            };
            setCart([...cart, newItem]);
        }

        setIsWarehouseModalOpen(false);
        setSelectedProductForAdd(null);
    };

    const removeFromCart = (uniqueKey) => {
        setCart(cart.filter(item => item.uniqueKey !== uniqueKey));
    };

    const updateCartQty = (uniqueKey, value) => {
        setCart(cart.map(item => {
            if (item.uniqueKey === uniqueKey) {
                const val = parseInt(value);
                if (val > item.maxQty) return { ...item, inputQty: item.maxQty };
                return { ...item, inputQty: value };
            }
            return item;
        }));
    };

    const handleSubmit = async () => {
        if (cart.length === 0) return Swal.fire('ตะกร้าว่าง', 'กรุณาเลือกสินค้าก่อน', 'warning');
        if (!reason.trim()) return Swal.fire('ขาดเหตุผล', 'กรุณาระบุเหตุผลด้านล่างขวา', 'warning');

        const invalidItems = cart.filter(item => !item.inputQty || parseInt(item.inputQty) <= 0);
        if (invalidItems.length > 0) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุจำนวนสินค้าให้ถูกต้อง', 'warning');

        Swal.fire({
            title: 'ยืนยันการเบิก?',
            text: `ต้องการเบิกสินค้า ${cart.length} รายการ`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการเบิก',
            confirmButtonColor: '#d33'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
                try {
                    await Promise.all(cart.map(item =>
                        api.post('/stock-out', {
                            productId: item.productId,
                            warehouseId: item.warehouseId,
                            quantity: parseInt(item.inputQty),
                            reason: reason
                        })
                    ));
                    Swal.fire('สำเร็จ', 'ตัดสต๊อกเรียบร้อย', 'success');
                    setCart([]);
                    setReason('');
                    const res = await api.get('/products');
                    setAllProducts(res.data);
                } catch (err) {
                    Swal.fire('Error', 'เกิดข้อผิดพลาด', 'error');
                }
            }
        });
    };

    const filteredProducts = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase());

        if (selectedFilterWarehouse === 'ALL') return matchesSearch;

        const hasStockInWarehouse = p.stocks?.some(s => s.warehouse_id === selectedFilterWarehouse && s.quantity > 0);
        return matchesSearch && hasStockInWarehouse;
    });

    return (
        <div className="flex bg-[#F3F4F6] min-h-screen font-sans">
            <Sidebar />

            <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden mt-16 md:mt-6  lg:mt-1 ">

                {/* ================= LEFT: Catalog & Search ================= */}
                <div className="flex-1 flex flex-col relative">

                    {/* Header */}
                    <div
                        className="
            p-6 md:p-8
            bg-white/90
            backdrop-blur-md
            z-10
            flex flex-col gap-4 md:gap-6
            border-b border-gray-100
            shadow-[0_4px_20px_rgba(0,0,0,0.04)]
        "
                    >
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <Truck className="text-blue-500 w-8 h-8 md:w-10 md:h-10" />
                                เบิกสินค้า
                                <span className="text-gray-400 font-medium text-base md:text-xl">
                                    (Stock Out)
                                </span>
                            </h1>
                        </div>

                        {/* Search Bar */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 md:h-6 md:w-6 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                            </div>

                            <input
                                ref={searchInputRef}
                                type="text"
                                className="
                    block w-full
                    pl-11 pr-11 py-3 md:py-4 md:pl-14
                    bg-[#F1F3F7]
                    rounded-2xl
                    text-gray-700 placeholder-gray-400
                    focus:bg-white
                    focus:ring-2 focus:ring-blue-400
                    transition-all
                    text-base md:text-lg
                    shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]
                "
                                placeholder="พิมพ์ชื่อหรือรหัสสินค้า..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />

                            <div className="absolute inset-y-0 right-0 pr-4 md:pr-5 flex items-center pointer-events-none">
                                <ScanBarcode className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 custom-scrollbar">
                            <button
                                onClick={() => setSelectedFilterWarehouse('ALL')}
                                className={`
                    flex items-center gap-2
                    px-4 py-2 md:px-5 md:py-2.5
                    rounded-full
                    text-sm md:text-base font-semibold
                    whitespace-nowrap
                    transition-all
                    border
                    ${selectedFilterWarehouse === 'ALL'
                                        ? 'bg-gray-800/90 text-white border-gray-800 shadow-sm'
                                        : 'bg-white/80 text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }
                `}
                            >
                                <Warehouse size={16} className="md:w-5 md:h-5" />
                                ทั้งหมด
                                {selectedFilterWarehouse === 'ALL' && <Check size={14} className="md:w-4 md:h-4" />}
                            </button>

                            {warehouses.map(wh => (
                                <button
                                    key={wh.id}
                                    onClick={() => setSelectedFilterWarehouse(wh.id)}
                                    className={`
                        flex items-center gap-2
                        px-4 py-2 md:px-5 md:py-2.5
                        rounded-full
                        text-sm md:text-base font-semibold
                        whitespace-nowrap
                        transition-all
                        border
                        ${selectedFilterWarehouse === wh.id
                                            ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                            : 'bg-white/80 text-gray-500 border-gray-200 hover:bg-blue-50 hover:text-blue-600'
                                        }
                    `}
                                >
                                    {wh.name}
                                    {selectedFilterWarehouse === wh.id && <Check size={14} className="md:w-4 md:h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List View */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#F6F7FB]">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64 text-gray-400 text-lg">
                                กำลังโหลดข้อมูล...
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-60">
                                <Package size={64} className="mb-4 w-20 h-20" />
                                <p className="text-lg md:text-xl">
                                    ไม่พบสินค้า {selectedFilterWarehouse !== 'ALL' && 'ในคลังนี้'}
                                </p>
                            </div>
                        ) : (
                            <div
                                className="
                    bg-white
                    rounded-2xl
                    shadow-[0_10px_30px_rgba(0,0,0,0.05)]
                    border border-gray-100/70
                    overflow-hidden
                "
                            >
                                <table className="w-full text-left">
                                    <thead className="bg-[#F7F8FC] text-gray-500 font-semibold text-xs md:text-sm uppercase border-b border-gray-100">
                                        <tr>
                                            <th className="p-4 md:p-5 w-16 md:w-24 text-center">รูป</th>
                                            <th className="p-4 md:p-5">ชื่อสินค้า / รหัส</th>
                                            <th className="p-4 md:p-5 text-center">สถานะ</th>
                                            <th className="p-4 md:p-5 text-right whitespace-nowrap">คงเหลือ</th>
                                            <th className="p-4 md:p-5 w-10 md:w-16"></th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100">
                                        {filteredProducts.map(product => {
                                            const isOutOfStock =
                                                !product.stocks ||
                                                product.stocks.every(s => s.quantity <= 0);

                                            let displayStock = product.total_stock;
                                            let stockLabel = 'รวมทุกคลัง';

                                            if (selectedFilterWarehouse !== 'ALL') {
                                                const stock = product.stocks?.find(
                                                    s => s.warehouse_id === selectedFilterWarehouse
                                                );
                                                displayStock = stock ? stock.quantity : 0;
                                                stockLabel = 'ในคลังนี้';
                                            }

                                            return (
                                                <tr
                                                    key={product.id}
                                                    onClick={() => handleProductClick(product)}
                                                    className={`
                                    group cursor-pointer transition-all
                                    ${isOutOfStock || displayStock <= 0
                                                            ? 'bg-gray-50 opacity-60 cursor-not-allowed'
                                                            : 'hover:bg-blue-50/30'
                                                        }
                                `}
                                                >
                                                    {/* Image */}
                                                    <td className="p-3 md:p-4 text-center">
                                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-xl overflow-hidden mx-auto flex items-center justify-center">
                                                            {product.image_url ? (
                                                                <img
                                                                    src={getImageUrl(product.image_url)}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Box size={20} className="text-gray-300 md:w-8 md:h-8" />
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Name */}
                                                    <td className="p-3 md:p-4">
                                                        <div className="font-semibold text-gray-800 text-sm md:text-base lg:text-lg mb-1">
                                                            {product.name}
                                                        </div>
                                                        <div className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] md:text-xs font-mono bg-gray-100 text-gray-500">
                                                            {product.sku}
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="p-3 md:p-4 text-center">
                                                        {isOutOfStock ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-red-50 text-red-600 text-xs md:text-sm font-semibold border border-red-100">
                                                                <AlertTriangle size={10} className="md:w-4 md:h-4" /> หมด
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
                                                                {stockLabel}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Stock */}
                                                    <td className="p-3 md:p-4 text-right">
                                                        <div
                                                            className={`text-lg md:text-xl lg:text-2xl font-bold ${displayStock <= 0
                                                                ? 'text-gray-400'
                                                                : 'text-blue-600'
                                                                }`}
                                                        >
                                                            {displayStock}
                                                        </div>
                                                        <div className="text-[10px] md:text-xs text-gray-400">
                                                            {product.unit}
                                                        </div>
                                                    </td>

                                                    {/* Add Button */}
                                                    <td className="p-3 md:p-4 text-center">
                                                        {!isOutOfStock && displayStock > 0 && (
                                                            <button
                                                                className="
                                                    p-2 md:p-3 rounded-full
                                                    bg-blue-100 text-blue-600
                                                    opacity-0 group-hover:opacity-100
                                                    transition-all
                                                    hover:bg-blue-500 hover:text-white
                                                "
                                                            >
                                                                <Plus size={16} className="md:w-6 md:h-6" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>


                {/* ================= RIGHT: Cart ================= */}
                <div className="
                                w-full md:w-[450px] lg:w-[500px]
                                bg-white
                                border-l border-gray-100
                                shadow-[0_0_40px_rgba(0,0,0,0.08)]
                                z-20 flex flex-col h-full
                            ">
                    {/* Header */}
                    <div className="
                                    p-5 md:p-6
                                    bg-white/80
                                    backdrop-blur-md
                                    sticky top-0 z-10
                                    border-b border-gray-100
    ">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg md:text-xl">
                            <ShoppingCart className="text-blue-500 w-6 h-6 md:w-7 md:h-7" />
                            รายการที่เลือก ({cart.length})
                        </h2>
                    </div>

                    {/* Cart List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 bg-[#F7F8FC]">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-3">
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    <ShoppingCart size={40} className="opacity-30 md:w-12 md:h-12" />
                                </div>
                                <p className="text-sm md:text-base">ยังไม่มีรายการ</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div
                                    key={item.uniqueKey}
                                    className="
                        bg-white
                        p-4 md:p-5
                        rounded-3xl
                        border border-gray-100/70
                        shadow-[0_8px_20px_rgba(0,0,0,0.05)]
                        relative group
                        transition-all duration-200
                        hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]
                    "
                                >
                                    <button
                                        onClick={() => removeFromCart(item.uniqueKey)}
                                        className="
                            absolute top-2 right-2
                            p-1.5 md:p-2
                            text-gray-300
                            hover:text-red-500
                            hover:bg-red-50
                            rounded-full
                            transition
                        "
                                    >
                                        <X size={16} className="md:w-5 md:h-5" />
                                    </button>

                                    <div className="flex gap-3 md:gap-4 mb-3 md:mb-4 pr-6">
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                                            {item.image_url && (
                                                <img
                                                    src={getImageUrl(item.image_url)}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm md:text-base text-gray-800 line-clamp-1">
                                                {item.name}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs md:text-sm text-gray-500 mt-1">
                                                <MapPin size={10} className="md:w-3.5 md:h-3.5" /> {item.warehouseName}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between bg-[#F5F6FA] p-2.5 md:p-3 rounded-2xl">
                                        <span className="text-xs md:text-sm text-gray-500 ml-2">
                                            คงเหลือ: {item.maxQty}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="
                                    w-20 md:w-24 p-2 md:p-2.5
                                    bg-white
                                    border border-gray-200
                                    rounded-xl
                                    text-center
                                    font-bold text-blue-600 text-base md:text-lg
                                    focus:ring-2 focus:ring-blue-400
                                    outline-none
                                    transition
                                "
                                                value={item.inputQty}
                                                onChange={(e) =>
                                                    updateCartQty(item.uniqueKey, e.target.value)
                                                }
                                            />
                                            <span className="text-xs md:text-sm font-semibold text-gray-600 w-8 md:w-10">
                                                {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="
                                    p-5 md:p-6
                                    border-t border-gray-100
                                    bg-white
                                    shadow-[0_-10px_30px_rgba(0,0,0,0.04)]
                                ">
                        <div className="mb-4">
                            <label className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                เหตุผลในการเบิก
                            </label>
                            <input
                                type="text"
                                placeholder="เช่น นำไปใช้หน้างาน A..."
                                className="
                                                w-full p-3 md:p-4
                                                bg-[#F1F3F7]
                                                border border-gray-200
                                                rounded-2xl
                                                focus:bg-white
                                                focus:ring-2 focus:ring-blue-400
                                                outline-none
                                                transition
                                                text-sm md:text-base
                                            "
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={cart.length === 0}
                            className={`
                                            w-full py-4 md:py-5
                                            rounded-2xl
                                            font-bold text-lg md:text-xl
                                            flex justify-center items-center gap-2
                                            transition-all active:scale-[0.98]
                                            ${cart.length === 0
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-linear-to-r from-red-400 to-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.35)] hover:from-red-500 hover:to-red-600'}
                                    `}
                        >
                            <Truck size={20} className="md:w-6 md:h-6" /> ยืนยันการเบิก
                        </button>
                    </div>
                </div>

            </div>

            {/* ================= MODAL: เลือกคลังสินค้า (แสดงเฉพาะตอนเลือก Filter = All) ================= */}
            {isWarehouseModalOpen && selectedProductForAdd && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md md:max-w-lg lg:max-w-xl rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg md:text-2xl font-bold text-gray-800">เลือกคลังสินค้าต้นทาง</h3>
                                <p className="text-sm md:text-base text-gray-500">สินค้านี้มีอยู่ในหลายคลัง</p>
                            </div>
                            <button onClick={() => setIsWarehouseModalOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                                <X size={20} className="text-gray-500 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="space-y-3 md:space-y-4">
                            {selectedProductForAdd.stocks.map((stock, idx) => (
                                <button
                                    key={idx}
                                    disabled={stock.quantity <= 0}
                                    onClick={() => addToCart(selectedProductForAdd, stock)}
                                    className={`w-full p-4 md:p-5 rounded-2xl border-2 flex items-center justify-between transition-all group ${stock.quantity <= 0
                                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                        : 'border-gray-100 bg-white hover:border-blue-500 hover:bg-blue-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className={`p-2 md:p-3 rounded-lg ${stock.quantity > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                                            <MapPin size={20} className="md:w-6 md:h-6" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-base md:text-lg text-gray-800 group-hover:text-blue-700">{stock.warehouse_name || stock.warehouse?.name}</div>
                                            <div className="text-xs md:text-sm text-gray-500">คลังเก็บสินค้า</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xl md:text-2xl font-bold ${stock.quantity > 0 ? 'text-gray-800' : 'text-red-400'}`}>
                                            {stock.quantity}
                                        </div>
                                        <div className="text-xs md:text-sm text-gray-400">{selectedProductForAdd.unit}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}