'use client';
import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import Swal from 'sweetalert2';

// ⏱️ ตั้งเวลาตัดระบบ (15 นาที)
const TIMEOUT_MS = 60 * 60 * 1000;

export default function AutoLogoutProvider({ children }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = useCallback(() => {
        Cookies.remove('token');
        Cookies.remove('user_role');

        Swal.fire({
            icon: 'warning',
            title: 'หมดเวลาการใช้งาน',
            text: 'ระบบออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งานนานเกินไป',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#3085d6',
            allowOutsideClick: false
        }).then(() => {
            router.push('/login');
        });
    }, [router]);

    useEffect(() => {
        if (pathname === '/login') return;

        let timer;
        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(handleLogout, TIMEOUT_MS);
        };

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        events.forEach(event => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            if (timer) clearTimeout(timer);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [pathname, handleLogout]);

    return <>{children}</>;
}