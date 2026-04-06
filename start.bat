@echo off
title FYP Project - Full Stack Server

echo ====================================
echo        Starting FYP Project...
echo ====================================
echo.

:: 🔴 إيقاف أي عمليات على البورتات
echo Stopping ports...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Killing backend PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    echo Killing frontend PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo.
echo Starting Backend (Node.js)...
start cmd /k "cd /d C:\Users\D\Desktop\fyp\fyp code\backend && npm start"

echo.
echo Starting Frontend (React + Vite)...
start cmd /k "cd /d C:\Users\D\Desktop\fyp\fyp code\frontend && npm run dev"

echo.
echo ====================================
echo    Servers are starting...
echo ====================================
echo.

pause