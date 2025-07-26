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
    startTimer(lineNumber, killTime, initialRemaining = null) {
        const timerCell = document.getElementById(`timer-${lineNumber}`);
        if (!timerCell) return;

        // 清除已有的计时器（如果有）
        if (this.timers[lineNumber]) {
            clearInterval(this.timers[lineNumber]);
        }

        // 根据测试模式选择倒计时时长
        const timerDuration = this.testMode ? GAME_CONFIG.TEST_TIMER : GAME_CONFIG.NORMAL_TIMER;

        // 如果有初始剩余时间，使用它
        let remaining = initialRemaining !== null ? initialRemaining : timerDuration;

        // 立即更新一次显示
        this.updateTimerDisplay();

        // 启动计时器
        const timerId = setInterval(() => this.updateTimerDisplay(), 1000);
        this.timers[lineNumber] = timerId;

        function updateTimerDisplay() {
            // 计算从击杀时间到现在的时间
            const currentTime = new Date().getTime();
            const elapsed = currentTime - killTime;
            remaining = timerDuration - elapsed;

            // 如果倒计时结束
            if (remaining <= 0) {
                clearInterval(timerId);
                timerCell.textContent = '';

                // 更新线路状态
                const lineCell = document.querySelector(`td[data-line="${lineNumber}"]`);
                if (lineCell) {
                    lineCell.classList.remove('killed');
                    lineCell.classList.add('refreshed');
                    const tooltip = lineCell.querySelector('.tooltip');
                    if (tooltip) {
                        tooltip.textContent = '金猪已刷新，左键击杀开始倒计时，右键击杀但不知时间';
                    }
                    localStorage.setItem(`line-${lineNumber}`, 'refreshed');

                    // 🎉 金猪刷新动画效果
                    const rect = lineCell.getBoundingClientRect();
                    const refreshX = rect.left + rect.width / 2;
                    const refreshY = rect.top + rect.height / 2;
                    
                    // 调用动画管理器的刷新动画
                    if (window.app && window.app.animationManager) {
                        window.app.animationManager.createRefreshAnimation(refreshX, refreshY);
                    }
                }

                // 更新状态显示
                const statusSpan = document.getElementById('status');
                statusSpan.textContent = `线路 ${lineNumber} 金猪已刷新 🎉`;
                statusSpan.style.color = '#2ecc71';
                setTimeout(() => {
                    statusSpan.textContent = '运行中';
                    statusSpan.style.color = '';
                }, 5000);

                return;
            }

            // 计算剩余时间
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            // 显示倒计时
            timerCell.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        // 绑定updateTimerDisplay到正确的上下文
        updateTimerDisplay = updateTimerDisplay.bind(this);
        updateTimerDisplay();
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
