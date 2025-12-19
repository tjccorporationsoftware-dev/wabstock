'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';

// ⏱️ ตั้งเวลาตัดระบบ (15 นาที = 15 * 60 * 1000)
const TIMEOUT_MS = 15 * 60 * 1000;

export default function AutoLogoutProvider({ children }) {
    const router = useRouter();
    const pathname = usePathname();

    // ใช้ useRef เก็บค่าเพื่อไม่ให้ Re-render บ่อยเกินจำเป็น
    const timerRef = useRef(null);
    const lastResetRef = useRef(Date.now());

    const handleLogout = useCallback(() => {
        // ล้าง Timer ก่อน
        if (timerRef.current) clearTimeout(timerRef.current);

        Cookies.remove('token');
        Cookies.remove('user_role');
        Cookies.remove('user_name'); // ลบให้ครบ

        Swal.fire({
            icon: 'warning',
            title: 'หมดเวลาการใช้งาน',
            text: 'ระบบออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานนานเกินไป',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#3085d6',
            allowOutsideClick: false
        }).then(() => {
            router.replace('/login'); // ใช้ replace แทน push
        });
    }, [router]);

    useEffect(() => {
        if (pathname === '/login') return;

        const startTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
        };

        // 🚀 ฟังก์ชันตัวช่วย: ทำงานเร็วขึ้นโดยไม่ Reset ถี่เกินไป
        const handleActivity = () => {
            const now = Date.now();
            // ถ้าเพิ่งขยับไปไม่ถึง 2 วินาที ไม่ต้อง Reset ใหม่ (ลดโหลด CPU)
            if (now - lastResetRef.current < 2000) return;

            lastResetRef.current = now;
            startTimer();
        };

        // เริ่มจับเวลาครั้งแรก
        startTimer();

        // Event ที่จะดักจับ
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // 🚀 ใช้ passive: true เพื่อให้ Scroll ลื่นไหล
        events.forEach(event =>
            window.addEventListener(event, handleActivity, { passive: true })
        );

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event =>
                window.removeEventListener(event, handleActivity)
            );
        };
    }, [pathname, handleLogout]);

    return <>{children}</>;
}