// UI管理器 - 处理用户界面交互和提示
export class UIManager {
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

    // 显示导出导入界面
    showDataManagementDialog() {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'data-management-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📁 数据管理</h3>
                    <button class="modal-close" onclick="this.closest('.data-management-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="data-section">
                        <h4>📤 导出数据</h4>
                        <p>备份您的击杀记录和线路状态</p>
                        <div class="button-group">
                            <button id="export-json-btn" class="export-btn">
                                💾 导出完整数据 (JSON)
                            </button>
                            <button id="export-csv-btn" class="export-btn">
                                📊 导出击杀记录 (CSV)
                            </button>
                            <button id="export-ascii-csv-btn" class="export-btn">
                                📝 导出纯英文CSV (无乱码)
                            </button>
                            <button id="export-tsv-btn" class="export-btn">
                                📋 导出制表符格式 (TSV)
                            </button>
                        </div>
                        <div class="export-tips">
                            💡 提示：如果CSV有乱码，请尝试"纯英文CSV"或"制表符格式"
                        </div>
                    </div>
                    
                    <div class="data-section">
                        <h4>📥 导入数据</h4>
                        <p>从备份文件恢复数据（会覆盖当前数据）</p>
                        <div class="import-area">
                            <input type="file" id="import-file" accept=".json" style="display: none;">
                            <button id="import-btn" class="import-btn">
                                📂 选择备份文件
                            </button>
                            <div id="import-status" class="import-status"></div>
                        </div>
                    </div>
                    
                    <div class="data-section">
                        <h4>🗑️ 清除数据</h4>
                        <p>⚠️ 危险操作：将清除所有数据</p>
                        <button id="clear-all-btn" class="danger-btn">
                            🗑️ 清除所有数据
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        this.bindDataManagementEvents(modal);
        
        // 显示动画
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    // 绑定数据管理事件
    bindDataManagementEvents(modal) {
        const exportJsonBtn = modal.querySelector('#export-json-btn');
        const exportCsvBtn = modal.querySelector('#export-csv-btn');
        const exportAsciiCsvBtn = modal.querySelector('#export-ascii-csv-btn');
        const exportTsvBtn = modal.querySelector('#export-tsv-btn');
        const importBtn = modal.querySelector('#import-btn');
        const importFile = modal.querySelector('#import-file');
        const clearAllBtn = modal.querySelector('#clear-all-btn');
        const importStatus = modal.querySelector('#import-status');
        
        // 导出JSON
        exportJsonBtn.addEventListener('click', () => {
            console.log('导出JSON按钮被点击');
            console.log('window.app:', window.app);
            console.log('window.app.statsManager:', window.app ? window.app.statsManager : 'app不存在');
            
            if (window.app && window.app.statsManager) {
                console.log('开始导出JSON数据...');
                const success = window.app.statsManager.exportToJSON();
                console.log('导出结果:', success);
                if (success) {
                    this.showTemporaryMessage('数据导出成功！', 'success');
                }
            } else {
                console.error('应用实例或统计管理器不可用');
                this.showTemporaryMessage('导出失败：应用未正确初始化', 'error');
            }
        });
        
        // 导出CSV
        exportCsvBtn.addEventListener('click', () => {
            console.log('导出CSV按钮被点击');
            console.log('window.app:', window.app);
            
            if (window.app && window.app.statsManager) {
                console.log('开始导出CSV数据...');
                const success = window.app.statsManager.exportToCSV();
                console.log('导出结果:', success);
                if (success) {
                    this.showTemporaryMessage('击杀记录导出成功！', 'success');
                }
            } else {
                console.error('应用实例或统计管理器不可用');
                this.showTemporaryMessage('导出失败：应用未正确初始化', 'error');
            }
        });
        
        // 导出纯英文CSV（无乱码）
        exportAsciiCsvBtn.addEventListener('click', () => {
            console.log('导出ASCII CSV按钮被点击');
            
            if (window.app && window.app.statsManager) {
                console.log('开始导出ASCII CSV数据...');
                const success = window.app.statsManager.exportToASCIICSV();
                console.log('导出结果:', success);
                if (success) {
                    this.showTemporaryMessage('纯英文CSV导出成功！', 'success');
                }
            } else {
                console.error('应用实例或统计管理器不可用');
                this.showTemporaryMessage('导出失败：应用未正确初始化', 'error');
            }
        });
        
        // 导出TSV（制表符分隔）
        exportTsvBtn.addEventListener('click', () => {
            console.log('导出TSV按钮被点击');
            
            if (window.app && window.app.statsManager) {
                console.log('开始导出TSV数据...');
                const success = window.app.statsManager.exportToTSV();
                console.log('导出结果:', success);
                if (success) {
                    this.showTemporaryMessage('TSV文件导出成功！', 'success');
                }
            } else {
                console.error('应用实例或统计管理器不可用');
                this.showTemporaryMessage('导出失败：应用未正确初始化', 'error');
            }
        });
        
        // 选择导入文件
        importBtn.addEventListener('click', () => {
            importFile.click();
        });
        
        // 文件选择处理
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importStatus.textContent = `已选择: ${file.name}`;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const jsonData = event.target.result;
                        if (window.app && window.app.statsManager) {
                            const success = window.app.statsManager.importData(jsonData);
                            if (success) {
                                importStatus.innerHTML = '<span style="color: #27ae60;">✅ 导入成功！数据已恢复，格子状态和倒计时已更新。</span>';
                                // 不再需要刷新页面，因为状态已经恢复
                                console.log('导入完成，无需刷新页面');
                            } else {
                                importStatus.innerHTML = '<span style="color: #e74c3c;">❌ 导入失败</span>';
                            }
                        }
                    } catch (error) {
                        importStatus.innerHTML = '<span style="color: #e74c3c;">❌ 文件格式错误</span>';
                    }
                };
                reader.readAsText(file);
            }
        });
        
        // 清除所有数据
        clearAllBtn.addEventListener('click', () => {
            const confirmed = confirm('⚠️ 确定要清除所有数据吗？\n\n这将删除：\n• 所有击杀记录\n• 所有线路状态\n• 所有备注\n\n此操作不可恢复！');
            if (confirmed) {
                const doubleConfirmed = confirm('🔥 最后确认：真的要删除所有数据吗？');
                if (doubleConfirmed) {
                    this.clearAllData();
                    modal.remove();
                    this.showTemporaryMessage('所有数据已清除，页面将刷新', 'warning');
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            }
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // 添加手动恢复状态按钮（用于调试导入问题）
        const debugRestoreBtn = document.createElement('button');
        debugRestoreBtn.textContent = '🔄 手动恢复状态';
        debugRestoreBtn.style.cssText = `
            margin: 5px;
            padding: 8px 15px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        debugRestoreBtn.title = '如果导入后格子状态没有恢复，点击此按钮手动恢复';
        debugRestoreBtn.addEventListener('click', () => {
            console.log('手动触发状态恢复...');
            this.showTemporaryMessage('正在重新初始化表格和恢复状态...', 'info');
            
            if (window.app) {
                try {
                    // 先确保所有必要元素存在
                    console.log('确保所有元素就绪...');
                    window.app.ensureAllElementsReady();
                    
                    // 重新绑定事件
                    if (window.app.statsManager && window.app.statsManager.ensureEventBindings) {
                        console.log('重新绑定事件...');
                        window.app.statsManager.ensureEventBindings();
                    }
                    
                    // 恢复状态
                    console.log('恢复表格状态...');
                    window.app.restoreTableState();
                    
                    // 更新统计
                    if (window.app.statsManager) {
                        window.app.statsManager.updateStats();
                    }
                    
                    setTimeout(() => {
                        this.showTemporaryMessage('✅ 状态恢复完成！如果问题仍然存在，请刷新页面。', 'success');
                    }, 2000);
                    
                } catch (error) {
                    console.error('手动恢复失败:', error);
                    this.showTemporaryMessage('❌ 恢复失败，请刷新页面重试', 'error');
                }
            } else {
                this.showTemporaryMessage('❌ 应用未初始化，请刷新页面', 'error');
            }
        });
        
        // 添加调试事件绑定按钮
        const debugEventsBtn = document.createElement('button');
        debugEventsBtn.textContent = '🔍 调试事件';
        debugEventsBtn.style.cssText = `
            margin: 5px;
            padding: 8px 15px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        debugEventsBtn.title = '调试事件绑定状态（检查控制台）';
        debugEventsBtn.addEventListener('click', () => {
            console.log('开始调试事件绑定...');
            if (window.app && window.app.debugEventBindings) {
                window.app.debugEventBindings();
                this.showTemporaryMessage('调试信息已输出到控制台', 'info');
            } else {
                console.error('调试方法不可用');
                this.showTemporaryMessage('调试方法不可用', 'error');
            }
        });
        
        // 将调试按钮添加到控制面板
        const controlPanel = document.querySelector('.controls') || document.querySelector('.buttons-container');
        if (controlPanel) {
            controlPanel.appendChild(debugRestoreBtn);
            controlPanel.appendChild(debugEventsBtn);
        }
    }
    
    // 清除所有数据
    clearAllData() {
        // 清除击杀事件
        localStorage.removeItem('killEvents');
        
        // 清除所有线路状态
        for (let i = 1; i <= 400; i++) {
            localStorage.removeItem(`pigTimer_line_${i}_state`);
            localStorage.removeItem(`pigTimer_line_${i}_killTime`);
        }
        
        // 清除备注
        localStorage.removeItem('pigTimer_notes');
        
        // 清除其他可能的数据
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('pigTimer_')) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('所有数据已清除');
    }

    // 显示临时消息
    showTemporaryMessage(message, type = 'success', duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `temporary-message ${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // 自动移除
        setTimeout(() => {
            messageDiv.style.animation = 'messageSlideIn 0.3s ease reverse';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, duration);
    }
}
