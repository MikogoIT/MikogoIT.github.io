// UI管理器 - 处理用户界面交互和提示
class UIManager {
    constructor() {
        this.statusSpan = document.getElementById('status');
        this.lastUpdateSpan = document.getElementById('last-update');
        this.isMobile = this.detectMobile();
        this.initTimestamp();
        this.initNotesInput();
    }

    // 检测移动设备
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }

    // 初始化时间戳更新
    initTimestamp() {
        this.updateTimestamp();
        setInterval(() => this.updateTimestamp(), 1000);
    }

    // 更新最后更新时间
    updateTimestamp() {
        if (this.lastUpdateSpan) {
            const now = new Date();
            this.lastUpdateSpan.textContent = now.toLocaleTimeString();
        }
    }

    // 更新状态显示
    updateStatus(message, color = '', duration = 3000) {
        if (this.statusSpan) {
            this.statusSpan.textContent = message;
            this.statusSpan.style.color = color;
            
            if (duration > 0) {
                setTimeout(() => {
                    this.statusSpan.textContent = '运行中';
                    this.statusSpan.style.color = '';
                }, duration);
            }
        }
    }

    // 显示击杀成功状态
    showKillStatus(lineNumber) {
        this.updateStatus(`线路 ${lineNumber} 已标记击杀 🐷`, '#e74c3c');
    }

    // 显示未知时间击杀状态
    showUnknownKillStatus(lineNumber) {
        this.updateStatus(`线路 ${lineNumber} 已标记击杀（时间未知）🐷`, '#e67e22');
    }

    // 显示取消击杀状态
    showCancelStatus(lineNumber) {
        this.updateStatus(`已取消线路 ${lineNumber} 的击杀标记`, '#3498db');
    }

    // 显示刷新状态
    showRefreshStatus(lineNumber) {
        this.updateStatus(`线路 ${lineNumber} 金猪已刷新 🎉`, '#2ecc71', 5000);
    }

    // 显示测试模式状态
    showTestModeStatus(enabled) {
        if (enabled) {
            this.updateStatus('测试模式已开启 - 倒计时仅10秒', '#e67e22');
        } else {
            this.updateStatus('测试模式已关闭 - 恢复24小时倒计时', '#3498db');
        }
    }

    // 显示重置状态
    showResetStatus(type = 'all') {
        if (type === 'all') {
            this.updateStatus('所有状态已重置', '#3498db');
        } else if (type === 'timers') {
            this.updateStatus('倒计时状态已重置，统计数据已保留', '#f39c12', 4000);
        }
    }

    // 显示恢复状态
    showRestoreStatus() {
        this.updateStatus('已恢复所有倒计时', '#2ecc71');
    }

    // 初始化备注输入框
    initNotesInput() {
        const notesInput = document.getElementById('notes-input');
        if (!notesInput) return;
        
        // 恢复保存的备注内容
        const savedNotes = localStorage.getItem('user-notes');
        if (savedNotes) {
            notesInput.value = savedNotes;
        }
        
        // 自动保存备注内容
        notesInput.addEventListener('input', function() {
            localStorage.setItem('user-notes', this.value);
        });
        
        // 失去焦点时也保存一次
        notesInput.addEventListener('blur', function() {
            localStorage.setItem('user-notes', this.value);
        });
    }

    // 显示手机端操作提示
    showMobileHint(message, duration = 2000) {
        // 移除已有的提示
        const existingHint = document.querySelector('.mobile-hint-popup');
        if (existingHint) {
            existingHint.remove();
        }
        
        // 创建新的提示
        const hint = document.createElement('div');
        hint.className = 'mobile-hint-popup';
        hint.textContent = message;
        hint.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInOut 2s ease-in-out forwards;
        `;
        
        document.body.appendChild(hint);
        
        // 自动移除
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, duration);
    }

    // 显示初始化手机提示
    showInitialMobileHint() {
        if (this.isMobile) {
            setTimeout(() => {
                this.showMobileHint('💡 点击格子标记击杀，三连击标记不知时间');
            }, 1000);
        }
    }

    // 更新测试模式按钮
    updateTestModeButton(testMode) {
        const btn = document.getElementById('test-mode-btn');
        if (!btn) return;
        
        if (testMode) {
            btn.innerHTML = '🔬 关闭测试模式（恢复24小时）';
            btn.style.background = 'linear-gradient(to right, #e67e22, #d35400)';
        } else {
            btn.innerHTML = '🔬 开启测试模式（10秒倒计时）';
            btn.style.background = 'linear-gradient(to right, #3498db, #2980b9)';
        }
    }

    // 显示确认对话框
    showConfirm(message) {
        return confirm(message);
    }

    // 显示警告消息
    showAlert(message) {
        alert(message);
    }

    // 显示成功消息
    showSuccess(message, duration = 3000) {
        this.updateStatus(message, '#2ecc71', duration);
    }

    // 显示错误消息
    showError(message, duration = 5000) {
        this.updateStatus(message, '#e74c3c', duration);
    }

    // 显示警告消息
    showWarning(message, duration = 4000) {
        this.updateStatus(message, '#f39c12', duration);
    }

    // 显示信息消息
    showInfo(message, duration = 3000) {
        this.updateStatus(message, '#3498db', duration);
    }

    // 创建加载指示器
    showLoading(message = '加载中...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            ">
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                    color: #333;
                ">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border: 3px solid #f3f3f3;
                        border-top: 3px solid #3498db;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 10px;
                    "></div>
                    <div>${message}</div>
                </div>
            </div>
        `;
        
        // 添加旋转动画样式
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }

    // 隐藏加载指示器
    hideLoading() {
        const loadingDiv = document.getElementById('loading-indicator');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    // 更新格子的提示文本
    updateCellTooltip(cell, text) {
        const tooltip = cell.querySelector('.tooltip');
        if (tooltip) {
            tooltip.textContent = text;
        }
    }

    // 获取格子的坐标（用于动画）
    getCellCoordinates(cell) {
        const rect = cell.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    // 显示导出成功消息
    showExportSuccess() {
        this.showSuccess('数据导出成功 📁');
    }

    // 显示导入成功消息
    showImportSuccess() {
        this.showSuccess('数据导入成功 📂');
    }

    // 显示导入失败消息
    showImportError() {
        this.showError('数据导入失败，请检查文件格式');
    }

    // 设置页面主题
    setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
    }

    // 获取当前主题
    getCurrentTheme() {
        return document.body.getAttribute('data-theme') || 'default';
    }

    // 切换全屏模式
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('无法进入全屏模式:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // 检查是否支持全屏
    isFullscreenSupported() {
        return !!(document.documentElement.requestFullscreen || 
                 document.documentElement.mozRequestFullScreen || 
                 document.documentElement.webkitRequestFullscreen || 
                 document.documentElement.msRequestFullscreen);
    }

    // 更新页面标题
    updatePageTitle(title) {
        document.title = title;
    }

    // 显示快捷键帮助
    showKeyboardShortcuts() {
        const shortcuts = `
            快捷键说明：
            
            桌面端：
            • 左键点击 - 标记击杀并开始倒计时
            • 右键点击 - 标记击杀但不知时间
            • 双击 - 取消击杀标记
            
            手机端：
            • 单击 - 标记击杀并开始倒计时
            • 三连击 - 标记击杀但不知时间
            • 双击 - 取消击杀标记
            
            功能按钮：
            • 测试模式 - 切换10秒/24小时倒计时
            • 重置 - 清空所有数据
            • 重置倒计时 - 只清空状态，保留统计
        `;
        
        this.showAlert(shortcuts);
    }
}

// 导出UI管理器
export { UIManager };
