@echo off
setlocal
cd /d "%~dp0"
git rev-parse --show-toplevel >nul 2>&1
if errorlevel 1 goto :fail
git remote get-url origin >nul 2>&1
if errorlevel 1 goto :fail
git diff --quiet
if errorlevel 1 goto :dirty
git diff --cached --quiet
if errorlevel 1 goto :dirty
git pull --ff-only
if errorlevel 1 goto :fail
echo.
echo Kode sudah sinkron. Jika dependensi berubah, jalankan npm ci.
echo Jalankan ulang server untuk memuat versi terbaru.
pause
exit /b 0
:dirty
echo Ada perubahan lokal pada kode. Simpan perubahan itu sebelum update.
pause
exit /b 1
:fail
echo Update belum selesai. Periksa Git, remote origin, atau pesan di atas.
pause
exit /b 1
