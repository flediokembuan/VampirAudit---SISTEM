@echo off
title VampirAudit - Sistem Audit Listrik Vampir UNKLAB
echo ========================================================
echo    Sistem Audit Listrik Vampir (VampirAudit UNKLAB)
echo ========================================================
echo.

set PHP_PATH=C:\laragon\bin\php\php-8.3.36-Win32-vs16-x64\php.exe

echo [1/3] Menjalankan Backend Laravel di port 8000...
start "VampirAudit Backend (Port 8000)" cmd /k "cd backend && \"%PHP_PATH%\" artisan serve --host=127.0.0.1 --port=8000"

echo [2/3] Menjalankan Frontend React Vite di port 5173...
start "VampirAudit Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo [3/3] Membuka browser ke aplikasi...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo Sistem berhasil dijalankan!
echo - Frontend: http://localhost:5173
echo - Backend API: http://127.0.0.1:8000/api
echo.
echo Kredensial Pengguna Demo (Password: Vampir#2026):
echo 1. Dosen Admin: dosen.admin@unklab.ac.id
echo 2. Auditor Lapangan: auditor@unklab.ac.id
echo 3. Facility Maintenance: maintenance@unklab.ac.id
echo 4. Pimpinan Kampus: pimpinan@unklab.ac.id
echo.
pause
