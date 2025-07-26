@echo off
echo 正在启动金猪监控协作服务器...
echo.

cd /d "%~dp0"

REM 检查是否安装了Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查是否安装了依赖
if not exist node_modules (
    echo 正在安装依赖包...
    npm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 服务器正在启动...
echo 访问地址: ws://localhost:8080
echo 按 Ctrl+C 停止服务器
echo.

node collaboration-server.js

pause
