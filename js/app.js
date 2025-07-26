// 主应用文件
import { GAME_CONFIG } from './config.js';
import { TimerManager } from './modules/timerManager.js';
import { TableManager } from './modules/tableManager.js';
import { ChartManager } from './modules/chartManager.js';
import { EventManager } from './modules/eventManager.js';
import { StatsManager } from './modules/statsManager.js';
import { StorageManager } from './modules/storageManager.js';
import { AnimationManager } from './modules/animationManager.js';
import { UIManager } from './modules/uiManager.js';
import { CollaborationManager } from './modules/collaborationManager.js';
import { FirebaseCollaborationManager } from './modules/firebaseCollaborationManager.js';

class GoldPigMonitorApp {
    constructor() {
        // 初始化各个管理器
        this.storageManager = new StorageManager();
        this.statsManager = new StatsManager();
        this.animationManager = new AnimationManager();
        this.uiManager = new UIManager();
        this.timerManager = new TimerManager(this.storageManager);
        this.tableManager = new TableManager();
        this.chartManager = new ChartManager(this.statsManager);
        
        // 初始化协作管理器
        try {
            console.log('开始初始化本地协作管理器...');
            this.collaborationManager = new CollaborationManager(
                this.storageManager,
                this.uiManager,
                this.statsManager
            );
            console.log('本地协作管理器初始化成功');
        } catch (error) {
            console.error('本地协作管理器初始化失败:', error);
            // 创建一个完整的后备协作管理器
            this.collaborationManager = {
                showCollaborationDialog: () => {
                    alert('协作功能暂时不可用，请刷新页面重试');
                },
                syncLineStateChange: () => {
                    // 空实现，不做任何操作
                    console.log('协作功能不可用，跳过状态同步');
                },
                roomId: null,
                isHost: false,
                connectedPeers: new Map()
            };
        }

        // 初始化Firebase协作管理器
        try {
            console.log('开始初始化Firebase协作管理器...');
            this.firebaseCollaborationManager = new FirebaseCollaborationManager(
                this.storageManager,
                this.uiManager,
                this.statsManager
            );
            console.log('Firebase协作管理器初始化成功');
        } catch (error) {
            console.error('Firebase协作管理器初始化失败:', error);
            this.firebaseCollaborationManager = null;
        }
        
        this.eventManager = new EventManager(
            this.timerManager, 
            this.statsManager, 
            this.animationManager,
            this.uiManager,
            this.storageManager,
            this.chartManager,
            this.collaborationManager  // 传递协作管理器
        );
        
        // 将Firebase协作管理器传递给事件管理器
        if (this.firebaseCollaborationManager) {
            this.eventManager.firebaseCollaborationManager = this.firebaseCollaborationManager;
        }
        
        // 测试模式标志
        this.testMode = this.storageManager.getTestMode();
        
        // DOM 元素
        this.elements = {
            table: document.getElementById('line-table'),
            statusSpan: document.getElementById('status'),
            lastUpdateSpan: document.getElementById('last-update'),
            killedCountSpan: document.getElementById('killed-count'),
            killedUnknownCountSpan: document.getElementById('killed-unknown-count'),
            refreshedCountSpan: document.getElementById('refreshed-count'),
            availableCountSpan: document.getElementById('available-count'),
            todayCountSpan: document.getElementById('today-count'),
            testModeBtn: document.getElementById('test-mode-btn')
        };
    }

    // 初始化应用
    async init() {
        try {
            console.log('开始初始化应用...');
            
            // 检查必要的元素
            if (!this.elements.table) {
                throw new Error('未找到表格元素');
            }
            
            // 初始化表格
            console.log('初始化表格...');
            this.tableManager.initializeTable(this.elements.table, this.eventManager);
            
            // 验证表格生成
            const cells = this.elements.table.querySelectorAll('td[data-line]');
            console.log(`表格生成完成，共 ${cells.length} 个单元格`);
            
            // 调试表格布局
            this.tableManager.debugTableLayout();
            
            if (cells.length === 0) {
                throw new Error('表格生成失败，没有生成任何单元格');
            }
            
            // 确保所有必要元素就绪
            this.ensureAllElementsReady();
            
            // 恢复表格状态
            console.log('恢复表格状态...');
            this.restoreTableState();
            
            // 初始化其他组件（如果表格成功）
            try {
                console.log('初始化图表...');
                this.chartManager.initChart();
                
                // 测试图表绘制
                setTimeout(() => {
                    console.log('开始测试图表...');
                    const testResult = this.chartManager.testChart();
                    console.log('图表测试结果:', testResult);
                }, 300);
                
            } catch (chartError) {
                console.warn('图表初始化失败:', chartError);
            }
            
            try {
                console.log('绑定统计管理器元素...');
                this.statsManager.bindElements();
            } catch (statsError) {
                console.warn('统计管理器初始化失败:', statsError);
            }
            
            try {
                console.log('初始化UI...');
                this.uiManager.showRestoreStatus();
            } catch (uiError) {
                console.warn('UI初始化失败:', uiError);
            }
            
            // 绑定全局函数
            console.log('绑定全局函数...');
            this.bindGlobalFunctions();
            
            // 更新统计
            console.log('更新统计...');
            this.updateStats();
            
            // 初始化备注
            console.log('初始化备注...');
            this.initNotesInput();
            
            // 显示手机端提示
            console.log('显示手机端提示...');
            this.uiManager.showInitialMobileHint();
            
            // 更新测试模式按钮
            console.log('更新测试模式按钮...');
            this.uiManager.updateTestModeButton(this.testMode);
            this.timerManager.setTestMode(this.testMode);
            
            // 设置初始化完成标志
            this.initialized = true;
            
            // 添加响应式监听
            this.setupResponsiveHandlers();
            
            console.log('应用初始化完成！');
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            // 显示基本错误信息
            if (this.elements.statusSpan) {
                this.elements.statusSpan.textContent = '初始化失败';
                this.elements.statusSpan.style.color = 'red';
            }
            
            // 尝试显示用户友好的错误信息
            try {
                this.uiManager.showError(`应用初始化失败: ${error.message}`);
            } catch (uiError) {
                // 如果UI管理器也失败了，直接在页面上显示
                const container = document.querySelector('.container');
                if (container) {
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = 'background: red; color: white; padding: 20px; margin: 20px; border-radius: 10px; font-size: 18px; text-align: center;';
                    errorDiv.textContent = `应用初始化失败: ${error.message}`;
                    container.insertBefore(errorDiv, container.firstChild);
                }
            }
        }
    }

    // 恢复表格状态
    restoreTableState() {
        console.log('开始恢复表格状态...');
        let restoredCount = 0;
        let timerCount = 0;
        
        for (let i = 1; i <= 400; i++) {
            const cell = document.querySelector(`td[data-line="${i}"]`);
            if (!cell) {
                console.warn(`线路${i}的单元格未找到`);
                continue;
            }
            
            const savedState = this.storageManager.getLineState(i);
            const killTime = this.storageManager.getKillTime(i);
            
            console.log(`恢复线路${i}: 状态=${savedState}, 击杀时间=${killTime ? new Date(killTime).toLocaleString() : '无'}`);
            
            // 清除现有状态
            cell.classList.remove('killed', 'killed-unknown', 'refreshed');
            
            if (savedState) {
                // 恢复状态类
                cell.classList.add(savedState);
                restoredCount++;
                
                // 使用tableManager的方法恢复单元格状态
                this.tableManager.restoreCellState(cell, i, savedState, killTime, this.testMode);
                
                // 如果有倒计时需要恢复，启动计时器
                if (savedState === 'killed' && killTime) {
                    const currentTime = new Date().getTime();
                    const elapsed = currentTime - killTime;
                    const timerDuration = this.testMode ? GAME_CONFIG.TEST_TIMER : GAME_CONFIG.NORMAL_TIMER;
                    
                    console.log(`检查线路${i}倒计时: 已过时间=${elapsed}ms, 总时长=${timerDuration}ms`);
                    
                    if (elapsed < timerDuration) {
                        const remaining = timerDuration - elapsed;
                        console.log(`启动线路${i}倒计时，剩余时间=${remaining}ms`);
                        
                        // 确保定时器元素存在
                        let timerElement = document.getElementById(`timer-${i}`);
                        if (!timerElement) {
                            timerElement = document.createElement('div');
                            timerElement.id = `timer-${i}`;
                            timerElement.className = 'timer-display';
                            cell.appendChild(timerElement);
                            console.log(`为线路${i}创建定时器元素`);
                        }
                        
                        this.timerManager.startTimer(i, killTime, remaining, cell, this.onTimerComplete.bind(this));
                        timerCount++;
                    } else {
                        // 时间已到，设置为刷新状态
                        console.log(`线路${i}倒计时已过期，设置为刷新状态`);
                        cell.classList.remove('killed');
                        cell.classList.add('refreshed');
                        this.tableManager.setCellRefreshed(cell, i);
                        this.storageManager.setLineState(i, 'refreshed');
                    }
                }
            }
        }
        
        console.log(`✅ 表格状态恢复完成: 恢复${restoredCount}个状态，启动${timerCount}个倒计时`);
        
        // 确保所有元素正确初始化
        setTimeout(() => {
            this.ensureAllElementsReady();
        }, 100);
    }
    
    // 确保所有必要的元素都已准备就绪
    ensureAllElementsReady() {
        console.log('确保所有必要元素已准备就绪...');
        
        const cells = document.querySelectorAll('td[data-line]');
        let fixedCount = 0;
        
        cells.forEach(cell => {
            const lineNumber = cell.dataset.line;
            
            // 确保定时器元素存在
            let timerElement = cell.querySelector('.timer-display');
            if (!timerElement) {
                timerElement = document.createElement('div');
                timerElement.id = `timer-${lineNumber}`;
                timerElement.className = 'timer-display';
                cell.appendChild(timerElement);
                fixedCount++;
            }
            
            // 确保tooltip存在
            let tooltip = cell.querySelector('.tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
                cell.appendChild(tooltip);
                fixedCount++;
            }
        });
        
        if (fixedCount > 0) {
            console.log(`修复了${fixedCount}个缺失的元素`);
        }
        
        console.log('元素检查完成');
    }

    // 定时器完成回调
    onTimerComplete(lineNumber, cell) {
        this.tableManager.setCellRefreshed(cell, lineNumber);
        this.storageManager.setLineState(lineNumber, 'refreshed');
        this.uiManager.showRefreshStatus(lineNumber);
        
        // 创建刷新动画
        const coords = this.uiManager.getCellCoordinates(cell);
        this.animationManager.createRefreshAnimation(coords.x, coords.y);
        
        this.updateStats();
    }

    // 更新统计
    updateStats() {
        this.statsManager.updateStats();
        this.chartManager.updateChart();
    }

    // 绑定全局函数
    bindGlobalFunctions() {
        // 测试模式切换
        window.toggleTestMode = () => {
            this.testMode = !this.testMode;
            this.storageManager.setTestMode(this.testMode);
            this.timerManager.setTestMode(this.testMode);
            this.uiManager.updateTestModeButton(this.testMode);
            this.uiManager.showTestModeStatus(this.testMode);
        };

        // 重置所有状态
        window.resetAll = () => {
            if (this.uiManager.showConfirm('确定要重置所有线路状态吗？这将清除所有倒计时和标记状态！')) {
                this.timerManager.clearAllTimers();
                this.storageManager.resetAllData();
                this.statsManager.resetAllKillEvents();
                this.tableManager.resetAllCells();
                this.uiManager.showResetStatus('all');
                this.updateStats();
            }
        };

        // 仅重置倒计时
        window.resetTimersOnly = () => {
            if (this.uiManager.showConfirm('确定要重置所有倒计时状态吗？这将清除所有线路的击杀标记，但保留历史统计数据！')) {
                this.timerManager.clearAllTimers();
                this.storageManager.resetAllLineStates();
                this.tableManager.resetAllCells();
                this.uiManager.showResetStatus('timers');
                this.updateStats();
            }
        };

        // 全局图表功能
        window.switchChart = (chartType) => {
            console.log('全局切换图表:', chartType);
            if (this.chartManager) {
                this.currentChartType = chartType;
                
                // 更新标签页状态
                document.querySelectorAll('.chart-tab').forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.dataset.chart === chartType) {
                        tab.classList.add('active');
                    }
                });
                
                // 渲染图表
                this.chartManager.renderChart(chartType);
            }
        };
        
        window.testChart = () => {
            console.log('全局测试图表');
            if (this.chartManager) {
                return this.chartManager.testChart();
            }
            return false;
        };
        
        window.updateChart = () => {
            console.log('全局更新图表');
            if (this.chartManager) {
                this.chartManager.updateChart();
            }
        };
        
        // 数据管理功能
        window.showDataManagement = () => {
            console.log('显示数据管理界面');
            if (this.uiManager) {
                this.uiManager.showDataManagementDialog();
            }
        };
        
        // Firebase协作功能
        window.showFirebaseCollaboration = () => {
            console.log('显示Firebase协作对话框');
            if (this.firebaseCollaborationManager) {
                this.firebaseCollaborationManager.showCollaborationDialog();
            } else {
                alert('Firebase协作功能未初始化');
            }
        };
        
        window.createFirebaseRoom = async () => {
            console.log('创建Firebase房间');
            if (this.firebaseCollaborationManager) {
                const roomId = await this.firebaseCollaborationManager.createRoom();
                if (roomId) {
                    console.log('房间创建成功:', roomId);
                    return roomId;
                }
            }
            return null;
        };
        
        window.joinFirebaseRoom = async (roomId) => {
            console.log('加入Firebase房间:', roomId);
            if (this.firebaseCollaborationManager) {
                const success = await this.firebaseCollaborationManager.joinRoom(roomId);
                console.log('加入房间结果:', success);
                return success;
            }
            return false;
        };
        
        window.leaveFirebaseRoom = async () => {
            console.log('离开Firebase房间');
            if (this.firebaseCollaborationManager) {
                await this.firebaseCollaborationManager.leaveRoom();
            }
        };
        
        // 测试数据管理功能
        window.testDataExport = () => {
            console.log('测试数据导出功能');
            console.log('window.app:', window.app);
            if (window.app && window.app.statsManager) {
                console.log('statsManager存在，测试导出...');
                const result = window.app.statsManager.exportToJSON();
                console.log('导出测试结果:', result);
                return result;
            } else {
                console.error('应用或统计管理器不存在');
                return false;
            }
        };
        
        // 显示协作选择对话框
        window.showCollaborationChoice = () => {
            console.log('显示协作方式选择对话框');
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3>🤝 选择协作方式</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="collaboration-choice">
                            <div class="choice-card firebase-choice" onclick="showFirebaseCollaboration(); this.closest('.modal-overlay').remove();">
                                <div class="choice-icon">🔥</div>
                                <h4>Firebase云协作</h4>
                                <p>基于Google Firebase的实时同步，支持跨设备、跨浏览器多人协作</p>
                                <ul>
                                    <li>✅ 真正的实时同步</li>
                                    <li>✅ 支持无限用户</li>
                                    <li>✅ 断线重连</li>
                                    <li>✅ 永久房间存储</li>
                                </ul>
                                <div class="choice-recommended">推荐</div>
                            </div>
                            
                            <div class="choice-card p2p-choice" onclick="window.goldPigApp.collaborationManager.showCollaborationDialog(); this.closest('.modal-overlay').remove();">
                                <div class="choice-icon">👥</div>
                                <h4>本地P2P协作</h4>
                                <p>基于WebRTC的点对点连接，数据不经过服务器</p>
                                <ul>
                                    <li>✅ 完全私密</li>
                                    <li>✅ 低延迟</li>
                                    <li>⚠️ 需要手动连接</li>
                                    <li>⚠️ 房主离开后断开</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        };
        
        // 兼容性处理，添加到应用实例
        this.showCollaborationChoice = window.showCollaborationChoice;
    }

    // 初始化备注输入框
    initNotesInput() {
        const notesInput = document.getElementById('notes-input');
        if (!notesInput) return;
        
        // 恢复保存的备注内容
        const savedNotes = this.storageManager.getUserNotes();
        if (savedNotes) {
            notesInput.value = savedNotes;
        }
        
        // 自动保存备注内容
        notesInput.addEventListener('input', () => {
            this.storageManager.setUserNotes(notesInput.value);
        });
        
        // 失去焦点时也保存一次
        notesInput.addEventListener('blur', () => {
            this.storageManager.setUserNotes(notesInput.value);
        });
    }

    // 获取应用状态
    getAppState() {
        return {
            testMode: this.testMode,
            totalLines: 400,
            storage: this.storageManager.getStorageUsage(),
            stats: this.statsManager.getStatsSummary()
        };
    }

    // 导出数据
    exportData() {
        const data = this.storageManager.exportData();
        this.storageManager.downloadBackup();
        this.uiManager.showExportSuccess();
        return data;
    }

    // 导入数据
    async importData(file) {
        try {
            const success = await this.storageManager.uploadBackup(file);
            if (success) {
                this.uiManager.showImportSuccess();
                // 重新加载页面以应用导入的数据
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.uiManager.showImportError();
            }
        } catch (error) {
            console.error('数据导入失败:', error);
            this.uiManager.showImportError();
        }
    }

    // 设置响应式处理
    setupResponsiveHandlers() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            // 防抖处理，避免频繁重新生成表格
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const oldCols = this.tableManager.cols;
                this.tableManager.updateLayoutSettings();
                
                // 如果列数发生变化，重新生成表格
                if (oldCols !== this.tableManager.cols) {
                    console.log(`屏幕大小变化，从 ${oldCols} 列改为 ${this.tableManager.cols} 列`);
                    this.tableManager.regenerateTable(
                        this.elements.table, 
                        this.eventManager, 
                        this.storageManager
                    );
                    
                    // 重新恢复状态
                    this.restoreTableState();
                }
            }, 500); // 500ms 延迟
        });
        
        // 监听设备方向变化（手机端）
        if (window.orientation !== undefined) {
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    const oldCols = this.tableManager.cols;
                    this.tableManager.updateLayoutSettings();
                    
                    if (oldCols !== this.tableManager.cols) {
                        console.log('设备方向变化，重新生成表格布局');
                        this.tableManager.regenerateTable(
                            this.elements.table, 
                            this.eventManager, 
                            this.storageManager
                        );
                        this.restoreTableState();
                    }
                }, 200); // 等待方向变化完成
            });
        }
    }
    
    // 公共的状态恢复方法（用于导入后调用）
    restoreAllStates() {
        console.log('开始全面恢复状态...');
        
        // 恢复表格状态
        this.restoreTableState();
        
        // 更新统计
        this.statsManager.updateStats();
        
        // 如果有图表，更新图表
        if (this.chartManager) {
            this.chartManager.updateChart();
        }
        
        console.log('状态恢复完成');
    }

    // 显示协作选择对话框
    showCollaborationChoice() {
        const dialog = document.createElement('div');
        dialog.className = 'dialog-overlay';
        dialog.innerHTML = `
            <div class="dialog-content" style="max-width: 500px;">
                <div class="dialog-header">
                    <h3>🤝 选择协作方式</h3>
                    <button class="dialog-close" onclick="this.closest('.dialog-overlay').remove()">×</button>
                </div>
                
                <div class="dialog-body">
                    <div class="collaboration-options">
                        <div class="collaboration-option">
                            <h4>🔥 Firebase云协作（推荐）</h4>
                            <p>通过Firebase云服务实现真正的跨设备、跨浏览器多人协作</p>
                            <ul>
                                <li>✅ 支持任意数量用户</li>
                                <li>✅ 跨设备、跨网络协作</li>
                                <li>✅ 实时同步，断线重连</li>
                                <li>✅ 房间管理，用户身份</li>
                            </ul>
                            <button class="action-btn primary" onclick="window.goldPigApp.showFirebaseCollaboration(); this.closest('.dialog-overlay').remove();">
                                使用Firebase协作
                            </button>
                        </div>
                        
                        <div class="collaboration-option">
                            <h4>📡 P2P本地协作</h4>
                            <p>基于浏览器技术的本地协作（限制较多）</p>
                            <ul>
                                <li>⚠️ 仅限同一浏览器同一设备</li>
                                <li>⚠️ 用户数量有限</li>
                                <li>⚠️ 需要手动连接</li>
                                <li>✅ 无需外部服务</li>
                            </ul>
                            <button class="action-btn secondary" onclick="window.goldPigApp.showLocalCollaboration(); this.closest('.dialog-overlay').remove();">
                                使用本地协作
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    // 显示Firebase协作对话框
    showFirebaseCollaboration() {
        if (this.firebaseCollaborationManager) {
            this.firebaseCollaborationManager.showCollaborationDialog();
        } else {
            alert('Firebase协作功能初始化失败，请检查网络连接并刷新页面重试');
        }
    }

    // 显示本地P2P协作对话框
    showLocalCollaboration() {
        if (this.collaborationManager && this.collaborationManager.showCollaborationDialog) {
            this.collaborationManager.showCollaborationDialog();
        } else {
            alert('本地协作功能不可用，请刷新页面重试');
        }
    }
}

// 创建应用实例并初始化
const app = new GoldPigMonitorApp();

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始初始化应用');
    try {
        app.init().then(() => {
            console.log('应用初始化成功');
            
            // 先暴露应用实例到全局
            window.goldPigApp = app;
            window.app = app;
            
            // 然后定义协作相关全局函数
            window.showCollaboration = function() {
                console.log('showCollaboration函数被调用');
                try {
                    if (app && app.collaborationManager) {
                        console.log('调用协作管理器的showCollaborationDialog方法');
                        app.collaborationManager.showCollaborationDialog();
                    } else {
                        console.error('协作管理器未初始化');
                        alert('协作功能暂不可用，请刷新页面重试');
                    }
                } catch (error) {
                    console.error('显示协作对话框失败:', error);
                    alert('协作功能出错：' + error.message);
                }
            };
            
            window.createRoom = function() {
                try {
                    if (app && app.collaborationManager) {
                        app.collaborationManager.createRoom();
                    }
                } catch (error) {
                    console.error('创建房间失败:', error);
                }
            };
            
            window.joinRoom = function(roomId) {
                try {
                    if (app && app.collaborationManager) {
                        app.collaborationManager.joinRoom(roomId);
                    }
                } catch (error) {
                    console.error('加入房间失败:', error);
                }
            };
            
            window.leaveRoom = function() {
                try {
                    if (app && app.collaborationManager) {
                        app.collaborationManager.leaveRoom();
                    }
                } catch (error) {
                    console.error('离开房间失败:', error);
                }
            };
            
        }).catch(error => {
            console.error('应用初始化异步错误:', error);
        });
    } catch (error) {
        console.error('应用创建失败:', error);
        // 显示错误信息给用户
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = '初始化失败';
            statusElement.style.color = 'red';
        }
    }
});

// 调试函数：测试CSV导出
window.debugCSV = function() {
    if (window.app && window.app.statsManager) {
        return window.app.statsManager.debugCSVContent();
    } else {
        console.error('应用或统计管理器未初始化');
    }
};

// 调试函数：验证导出数据
window.validateData = function() {
    if (window.app && window.app.statsManager) {
        return window.app.statsManager.validateExportData();
    } else {
        console.error('应用或统计管理器未初始化');
    }
};

// 调试函数：查看所有击杀记录
window.showKillEvents = function() {
    if (window.app && window.app.statsManager) {
        console.log('所有击杀记录:', window.app.statsManager.killEvents);
        return window.app.statsManager.killEvents;
    } else {
        console.error('应用或统计管理器未初始化');
    }
};

// 调试函数：强制导出CSV（无论是否有数据）
window.forceExportCSV = function() {
    console.log('强制导出CSV...');
    if (window.app && window.app.statsManager) {
        // 临时添加测试数据（如果没有数据）
        if (window.app.statsManager.killEvents.length === 0) {
            console.log('没有数据，添加测试数据');
            const testEvent = {
                line: 1,
                timestamp: Date.now()
            };
            window.app.statsManager.killEvents.push(testEvent);
        }
        return window.app.statsManager.exportToCSV();
    } else {
        console.error('应用或统计管理器未初始化');
    }
};

// 调试函数：显示数据管理界面
window.showDataManagement = function() {
    if (window.app && window.app.uiManager) {
        window.app.uiManager.showDataManagement();
    } else {
        console.error('应用或UI管理器未初始化');
    }
};

// 调试函数：测试ASCII CSV导出
window.testASCIICSV = function() {
    if (window.app && window.app.statsManager) {
        return window.app.statsManager.exportToASCIICSV();
    } else {
        console.error('应用或统计管理器未初始化');
    }
};

// 调试函数：测试TSV导出
window.testTSV = function() {
    if (window.app && window.app.statsManager) {
        return window.app.statsManager.exportToTSV();
    } else {
        console.error('应用或统计管理器未初始化');
    }
};

// 调试函数：比较所有导出格式
window.compareExportFormats = function() {
    if (window.app && window.app.statsManager) {
        console.log('=== 导出格式比较 ===');
        
        try {
            const csvContent = window.app.statsManager.debugCSVContent();
            console.log('📊 标准CSV内容（前200字符）:', csvContent?.substring(0, 200));
        } catch (e) {
            console.error('CSV生成失败:', e.message);
        }
        
        try {
            const manager = window.app.statsManager;
            if (manager.killEvents.length > 0) {
                // 模拟ASCII CSV内容
                let asciiContent = 'Line,Time,Date,Timestamp\n';
                const event = manager.killEvents[0];
                const date = new Date(event.timestamp);
                asciiContent += `${event.line},${date.toTimeString().split(' ')[0]},${date.toDateString()},${date.toString()}\n`;
                console.log('📝 ASCII CSV内容示例:', asciiContent);
            }
        } catch (e) {
            console.error('ASCII CSV生成失败:', e.message);
        }
        
        console.log('请分别点击不同的导出按钮测试效果');
    } else {
        console.error('应用或统计管理器未初始化');
    }
};
