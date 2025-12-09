import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL
        || 'https://stock-api-backend-iox1.onrender.com',   // 👉 ใช้ Render เป็นค่า default
    headers: {
        'Content-Type': 'application/json',
    },
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
