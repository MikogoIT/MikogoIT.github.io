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
        this.eventManager = new EventManager(
            this.timerManager, 
            this.statsManager, 
            this.animationManager,
            this.uiManager,
            this.storageManager
        );
        
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
            // 初始化表格
            this.tableManager.initializeTable(this.elements.table, this.eventManager);
            
            // 恢复表格状态
            this.restoreTableState();
            
            // 初始化图表
            this.chartManager.initChart();
            
            // 初始化UI
            this.uiManager.showRestoreStatus();
            
            // 绑定全局函数
            this.bindGlobalFunctions();
            
            // 更新统计
            this.updateStats();
            
            // 初始化备注
            this.initNotesInput();
            
            // 显示手机端提示
            this.uiManager.showInitialMobileHint();
            
            // 更新测试模式按钮
            this.uiManager.updateTestModeButton(this.testMode);
            this.timerManager.setTestMode(this.testMode);
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.uiManager.showError('应用初始化失败，请刷新页面重试');
        }
    }

    // 恢复表格状态
    restoreTableState() {
        for (let i = 1; i <= 400; i++) {
            const cell = document.querySelector(`td[data-line="${i}"]`);
            if (!cell) continue;
            
            const savedState = this.storageManager.getLineState(i);
            const killTime = this.storageManager.getKillTime(i);
            
            this.tableManager.restoreCellState(cell, i, savedState, killTime, this.testMode);
            
            // 如果有倒计时需要恢复，启动计时器
            if (savedState === 'killed' && killTime) {
                const currentTime = new Date().getTime();
                const elapsed = currentTime - killTime;
                const timerDuration = this.testMode ? GAME_CONFIG.TEST_TIMER : GAME_CONFIG.NORMAL_TIMER;
                
                if (elapsed < timerDuration) {
                    const remaining = timerDuration - elapsed;
                    this.timerManager.startTimer(i, killTime, remaining, cell, this.onTimerComplete.bind(this));
                } else {
                    // 时间已到，设置为刷新状态
                    this.tableManager.setCellRefreshed(cell, i);
                    this.storageManager.setLineState(i, 'refreshed');
                }
            }
        }
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
}

// 创建应用实例并初始化
const app = new GoldPigMonitorApp();

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 导出应用实例供调试使用
window.goldPigApp = app;
