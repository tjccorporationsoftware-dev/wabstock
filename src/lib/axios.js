import axios from 'axios';
import Cookies from 'js-cookie';

// ⚠️ แก้ Port ให้ตรงกับ Backend ของคุณ (เช่น 3000 หรือ 4000)
const API_URL = 'http://localhost:3000/api';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',

    headers: {
        'Content-Type': 'application/json',
    },
});

// ก่อนยิง API ทุกครั้ง ให้ดึง Token จาก Cookie ใส่ Header ไปด้วย
api.interceptors.request.use((config) => {
    const token = Cookies.get('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;