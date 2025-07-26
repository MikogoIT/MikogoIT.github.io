// 定时器管理器
import { GAME_CONFIG } from '../config.js';

export class TimerManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.timers = {};
        this.testMode = false;
    }

    // 设置测试模式
    setTestMode(testMode) {
        this.testMode = testMode;
    }

    // 启动倒计时
    startTimer(lineNumber, killTime, initialRemaining = null, cellElement = null, onComplete = null) {
        console.log(`启动定时器: 线路${lineNumber}`);
        
        const timerCell = document.getElementById(`timer-${lineNumber}`);
        console.log(`定时器元素查找结果:`, timerCell);
        
        if (!timerCell) {
            console.error(`定时器元素不存在: timer-${lineNumber}`);
            
            // 尝试从单元格中查找或创建定时器元素
            const lineCell = cellElement || document.querySelector(`td[data-line="${lineNumber}"]`);
            if (lineCell) {
                let existingTimer = lineCell.querySelector('.timer-display');
                if (!existingTimer) {
                    console.log('创建新的定时器显示元素');
                    existingTimer = document.createElement('div');
                    existingTimer.id = `timer-${lineNumber}`;
                    existingTimer.className = 'timer-display';
                    lineCell.appendChild(existingTimer);
                }
                // 重新获取定时器元素
                const newTimerCell = document.getElementById(`timer-${lineNumber}`);
                if (newTimerCell) {
                    console.log('成功创建并获取定时器元素');
                    return this.startTimer(lineNumber, killTime, initialRemaining, cellElement, onComplete);
                }
            }
            console.error('无法创建定时器元素，退出');
            return;
        }

        // 清除已有的计时器（如果有）
        if (this.timers[lineNumber]) {
            clearInterval(this.timers[lineNumber]);
        }

        // 根据测试模式选择倒计时时长
        const timerDuration = this.testMode ? GAME_CONFIG.TEST_TIMER : GAME_CONFIG.NORMAL_TIMER;

        // 如果有初始剩余时间，使用它
        let remaining = initialRemaining !== null ? initialRemaining : timerDuration;

        // 定义更新显示函数
        const updateTimerDisplay = () => {
            // 计算从击杀时间到现在的时间
            const currentTime = new Date().getTime();
            const elapsed = currentTime - killTime;
            remaining = timerDuration - elapsed;

            console.log(`更新定时器显示: 线路${lineNumber}, 剩余时间=${remaining}ms`);

            // 如果倒计时结束
            if (remaining <= 0) {
                console.log(`定时器完成: 线路${lineNumber}`);
                clearInterval(this.timers[lineNumber]);
                delete this.timers[lineNumber];
                timerCell.textContent = '';

                // 更新线路状态
                const lineCell = cellElement || document.querySelector(`td[data-line="${lineNumber}"]`);
                if (lineCell) {
                    lineCell.classList.remove('killed');
                    lineCell.classList.add('refreshed');
                    
                    // 更新存储状态
                    this.storageManager.setLineState(lineNumber, 'refreshed');
                    this.storageManager.removeKillTime(lineNumber);

                    // 🎉 金猪刷新动画效果
                    const rect = lineCell.getBoundingClientRect();
                    const refreshX = rect.left + rect.width / 2;
                    const refreshY = rect.top + rect.height / 2;
                    
                    // 调用动画管理器的刷新动画
                    if (window.app && window.app.animationManager) {
                        window.app.animationManager.createRefreshAnimation(refreshX, refreshY);
                    }
                    
                    // 更新tooltip
                    const tooltip = lineCell.querySelector('.tooltip');
                    if (tooltip) {
                        tooltip.textContent = '金猪已刷新，左键击杀开始倒计时，右键击杀但不知时间';
                    }
                }

                // 更新状态显示
                const statusSpan = document.getElementById('status');
                if (statusSpan) {
                    statusSpan.textContent = `线路 ${lineNumber} 金猪已刷新 🎉`;
                    statusSpan.style.color = '#2ecc71';
                    setTimeout(() => {
                        statusSpan.textContent = '运行中';
                        statusSpan.style.color = '';
                    }, 5000);
                }

                // 调用完成回调
                if (onComplete) {
                    onComplete(lineNumber);
                }

                return;
            }

            // 计算剩余时间
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            // 显示倒计时
            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerCell.textContent = timeStr;
            console.log(`定时器显示更新: 线路${lineNumber} -> ${timeStr}`);
        };

        // 立即更新一次显示
        console.log('立即执行第一次定时器显示更新');
        updateTimerDisplay();

        // 启动计时器
        console.log(`设置定时器间隔: 线路${lineNumber}`);
        this.timers[lineNumber] = setInterval(updateTimerDisplay, 1000);
        
        console.log(`定时器启动完成: 线路${lineNumber}, 活跃定时器数量:`, Object.keys(this.timers).length);
    }

    // 清除单个计时器
    clearTimer(lineNumber) {
        if (this.timers[lineNumber]) {
            clearInterval(this.timers[lineNumber]);
            delete this.timers[lineNumber];
        }
        
        const timerCell = document.getElementById(`timer-${lineNumber}`);
        if (timerCell) {
            timerCell.textContent = '';
        }
    }

    // 清除所有计时器
    clearAllTimers() {
        Object.keys(this.timers).forEach(lineNumber => {
            this.clearTimer(lineNumber);
        });
        this.timers = {};
    }
}
