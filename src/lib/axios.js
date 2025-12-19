import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    // ✅ 1. เพิ่ม /api ต่อท้าย (ถ้า Backend คุณ routes เริ่มต้นด้วย /api)
    baseURL: process.env.NEXT_PUBLIC_API_URL
        || 'https://p00gko4gc80ko44c4kcc84ww.103.230.120.42.sslip.io/api',

    // ❌ 2. ลบส่วน headers ทิ้งไปเลยครับ! 
    // เพื่อให้ Browser จัดการเรื่อง Content-Type เอง (โดยเฉพาะตอนส่งรูป)
});

// Attach Token จาก Cookie ก่อนยิง API ทุกครั้ง
api.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;