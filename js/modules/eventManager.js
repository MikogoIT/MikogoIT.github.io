// 事件管理器
export class EventManager {
    constructor(timerManager, statsManager, animationManager, uiManager, storageManager) {
        this.timerManager = timerManager;
        this.statsManager = statsManager;
        this.animationManager = animationManager;
        this.uiManager = uiManager;
        this.storageManager = storageManager;
    }

    // 处理单元格单击
    handleCellClick(event) {
        const cell = event.currentTarget;
        const lineNumber = cell.dataset.line;
        
        // 如果已经是击杀状态，则忽略点击（双击用于取消）
        if (cell.classList.contains('killed') || cell.classList.contains('killed-unknown')) return;
        
        // 获取点击位置用于动画
        const coords = this.uiManager.getCellCoordinates(cell);
        
        // 移除刷新状态（如果存在）
        if (cell.classList.contains('refreshed')) {
            cell.classList.remove('refreshed');
        }
        
        // 添加击杀状态
        cell.classList.add('killed');
        this.uiManager.updateCellTooltip(cell, '双击取消击杀状态');
        this.storageManager.setLineState(lineNumber, 'killed');
        
        // 记录击杀时间
        const killTime = new Date().getTime();
        this.storageManager.setKillTime(lineNumber, killTime);
        
        // 记录击杀事件并检查里程碑
        const isMilestone = this.statsManager.recordKillEvent(lineNumber, killTime);
        
        // 创建掉落动画效果
        this.animationManager.createPigDropAnimation(coords.x, coords.y);
        
        // 检查是否达到里程碑
        if (isMilestone) {
            setTimeout(() => {
                this.animationManager.createCelebrationAnimation();
            }, 500);
        }
        
        // 开始倒计时
        this.timerManager.startTimer(lineNumber, killTime, null, cell, this.onTimerComplete.bind(this));
        
        // 更新状态显示
        this.uiManager.showKillStatus(lineNumber);
        
        // 更新统计
        this.statsManager.updateStats();
    }

    // 处理单元格右键点击（标记为击杀但不知时间）
    handleCellRightClick(event) {
        event.preventDefault(); // 阻止默认右键菜单
        
        const cell = event.currentTarget;
        const lineNumber = cell.dataset.line;
        
        // 如果已经是击杀状态，则忽略点击（双击用于取消）
        if (cell.classList.contains('killed') || cell.classList.contains('killed-unknown')) return;
        
        // 获取点击位置用于动画
        const coords = this.uiManager.getCellCoordinates(cell);
        
        // 移除刷新状态（如果存在）
        if (cell.classList.contains('refreshed')) {
            cell.classList.remove('refreshed');
        }
        
        // 添加击杀未知时间状态
        cell.classList.add('killed-unknown');
        this.uiManager.updateCellTooltip(cell, '双击取消击杀状态');
        this.storageManager.setLineState(lineNumber, 'killed-unknown');
        
        // 记录击杀时间（用于统计，但不开始倒计时）
        const killTime = new Date().getTime();
        
        // 记录击杀事件
        this.statsManager.recordKillEvent(lineNumber, killTime);
        
        // 创建掉落动画效果
        this.animationManager.createPigDropAnimation(coords.x, coords.y);
        
        // 更新状态显示
        this.uiManager.showUnknownKillStatus(lineNumber);
        
        // 更新统计
        this.statsManager.updateStats();
    }

    // 处理单元格双击（取消倒计时）
    handleCellDoubleClick(event) {
        const cell = event.currentTarget;
        const lineNumber = cell.dataset.line;
        
        // 只处理击杀状态（包括未知时间状态）
        if (!cell.classList.contains('killed') && !cell.classList.contains('killed-unknown')) return;
        
        // 获取击杀时间
        const killTime = this.storageManager.getKillTime(lineNumber);
        
        // 恢复初始状态
        cell.classList.remove('killed', 'killed-unknown');
        this.uiManager.updateCellTooltip(cell, '左键击杀开始倒计时，右键击杀但不知时间');
        
        // 清除本地存储
        this.storageManager.removeLineState(lineNumber);
        this.storageManager.removeKillTime(lineNumber);
        
        // 清除倒计时显示
        const timerCell = document.getElementById(`timer-${lineNumber}`);
        if (timerCell) {
            timerCell.textContent = '';
        }
        
        // 清除计时器
        this.timerManager.clearTimer(lineNumber);
        
        // 从击杀事件中移除
        this.statsManager.removeKillEvent(lineNumber, killTime);
        
        // 更新状态显示
        this.uiManager.showCancelStatus(lineNumber);
        
        // 更新统计
        this.statsManager.updateStats();
    }

    // 添加手机端三连击事件
    addMobileTripleClickEvent(cell) {
        let clickCount = 0;
        let clickTimer;
        let lastClickTime = 0;
        let isProcessing = false; // 防止重复处理
        
        // 处理点击事件
        const handleMobileClick = (e) => {
            // 如果正在处理中，忽略
            if (isProcessing) return;
            
            const currentTime = Date.now();
            const timeBetweenClicks = currentTime - lastClickTime;
            
            // 如果两次点击间隔超过800ms，重置计数
            if (timeBetweenClicks > 800) {
                clickCount = 0;
            }
            
            clickCount++;
            lastClickTime = currentTime;
            
            // 清除之前的计时器
            if (clickTimer) {
                clearTimeout(clickTimer);
            }
            
            // 添加视觉反馈
            if (clickCount === 1) {
                this.animationManager.addClickFeedback(cell, 'first');
            } else if (clickCount === 2) {
                this.animationManager.addClickFeedback(cell, 'double');
            }
            
            if (clickCount === 3) {
                // 三连击触发特殊操作（相当于右键点击）
                e.preventDefault();
                e.stopPropagation();
                
                isProcessing = true;
                
                // 添加三连击视觉反馈
                this.animationManager.addClickFeedback(cell, 'triple');
                
                // 创建一个模拟的右键事件
                const rightClickEvent = new Event('contextmenu', { bubbles: true, cancelable: true });
                Object.defineProperty(rightClickEvent, 'currentTarget', { value: cell });
                Object.defineProperty(rightClickEvent, 'target', { value: cell });
                
                // 触发右键点击事件
                this.handleCellRightClick(rightClickEvent);
                
                // 显示三连击提示
                this.uiManager.showMobileHint('三连击标记击杀但不知时间 ⚡');
                
                // 重置状态
                clickCount = 0;
                
                // 解除处理状态
                setTimeout(() => {
                    isProcessing = false;
                }, 300);
                
            } else {
                // 设置延迟，如果300ms内没有下一次点击，执行对应操作
                clickTimer = setTimeout(() => {
                    isProcessing = true;
                    
                    if (clickCount === 1) {
                        // 单击操作
                        const clickEvent = new Event('click', { bubbles: true, cancelable: true });
                        Object.defineProperty(clickEvent, 'currentTarget', { value: cell });
                        Object.defineProperty(clickEvent, 'target', { value: cell });
                        
                        this.handleCellClick(clickEvent);
                    } else if (clickCount === 2) {
                        // 双击操作
                        const dblClickEvent = new Event('dblclick', { bubbles: true, cancelable: true });
                        Object.defineProperty(dblClickEvent, 'currentTarget', { value: cell });
                        Object.defineProperty(dblClickEvent, 'target', { value: cell });
                        
                        this.handleCellDoubleClick(dblClickEvent);
                    }
                    
                    // 重置状态
                    clickCount = 0;
                    
                    // 解除处理状态
                    setTimeout(() => {
                        isProcessing = false;
                    }, 100);
                }, 300);
            }
        };
        
        // 绑定点击事件
        cell.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleMobileClick(e);
        }, { passive: false });
    }

    // 定时器完成回调
    onTimerComplete(lineNumber, cell) {
        // 更新线路状态
        cell.classList.remove('killed');
        cell.classList.add('refreshed');
        this.uiManager.updateCellTooltip(cell, '金猪已刷新，左键击杀开始倒计时，右键击杀但不知时间');
        this.storageManager.setLineState(lineNumber, 'refreshed');
        
        // 创建刷新动画效果
        const coords = this.uiManager.getCellCoordinates(cell);
        this.animationManager.createRefreshAnimation(coords.x, coords.y);
        
        // 更新状态显示
        this.uiManager.showRefreshStatus(lineNumber);
        
        // 更新统计
        this.statsManager.updateStats();
    }
}
