@echo off
echo ========================================
echo 文件对对碰 - Electron Windows 打包程序
echo ========================================
echo.

echo [1/3] 清理旧的构建文件...
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
echo 清理完成！
echo.

echo [2/3] 构建前端项目...
call npm run build
if %errorlevel% neq 0 (
    echo 前端构建失败！
    pause
    exit /b 1
)
echo 前端构建完成！
echo.

echo [3/3] 打包 Electron Windows 应用...
call npm run electron:build:win
if %errorlevel% neq 0 (
    echo Electron 打包失败！
    pause
    exit /b 1
)
echo Electron 打包完成！
echo.

echo ========================================
echo 打包成功！输出目录：release/
echo ========================================
echo.
pause
