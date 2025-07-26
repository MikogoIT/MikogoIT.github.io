// 事件管理器
export class EventManager {
    constructor(timerManager, statsManager, animationManager, uiManager, storageManager, chartManager, collaborationManager = null) {
        this.timerManager = timerManager;
        this.statsManager = statsManager;
        this.animationManager = animationManager;
        this.uiManager = uiManager;
        this.storageManager = storageManager;
        this.chartManager = chartManager;
        this.collaborationManager = collaborationManager;
    }

    // 处理单元格单击
    handleCellClick(event) {
        console.log('handleCellClick被调用');
        
        try {
            const cell = event.currentTarget;
            const lineNumber = cell.dataset.line;
            
            console.log(`点击线路: ${lineNumber}, 当前状态:`, cell.classList.toString());
            
            // 如果已经是击杀状态，则忽略点击（双击用于取消）
            if (cell.classList.contains('killed') || cell.classList.contains('killed-unknown')) {
                console.log('单元格已经是击杀状态，忽略点击');
                return;
            }
            
            // 获取点击位置用于动画
            const coords = this.uiManager.getCellCoordinates(cell);
            console.log('获取单元格坐标:', coords);
            
            // 移除刷新状态（如果存在）
            if (cell.classList.contains('refreshed')) {
                cell.classList.remove('refreshed');
            }
            
            // 添加击杀状态
            cell.classList.add('killed');
            console.log('添加击杀状态类');
            
            this.uiManager.updateCellTooltip(cell, '双击取消击杀状态');
            console.log('更新单元格提示');
            
            this.storageManager.setLineState(lineNumber, 'killed');
            console.log('保存线路状态到存储');
            
            // 记录击杀时间
            const killTime = new Date().getTime();
            this.storageManager.setKillTime(lineNumber, killTime);
            console.log('保存击杀时间到存储');
            
            // 记录击杀事件并检查里程碑
            const isMilestone = this.statsManager.recordKillEvent(lineNumber, killTime);
            console.log('记录击杀事件到统计，里程碑:', isMilestone);
            
            // 添加到击杀事件列表
            this.statsManager.addKillEvent(lineNumber, killTime);
            console.log('添加击杀事件到列表');
            
            // 同步到其他用户（本地P2P协作）
            if (this.collaborationManager) {
                console.log('同步状态到P2P协作用户');
                this.collaborationManager.syncLineStateChange(lineNumber, 'killed', killTime);
            }
            
            // 同步到Firebase协作
            if (this.firebaseCollaborationManager && this.firebaseCollaborationManager.roomId) {
                console.log('同步状态到Firebase协作');
                this.firebaseCollaborationManager.syncLineStateChange(lineNumber, 'killed', killTime);
            }
            
            // 触发自定义事件（用于协作同步）
            document.dispatchEvent(new CustomEvent('lineStateChanged', {
                detail: { lineNumber, state: 'killed', killTime }
            }));
            console.log('触发自定义事件');
            
            // 更新图表
            if (this.chartManager) {
                this.chartManager.updateChart();
                console.log('更新图表');
            }
            
            // 创建掉落动画效果
            this.animationManager.createPigDropAnimation(coords.x, coords.y);
            console.log('创建掉落动画');
            
            // 检查是否达到里程碑
            if (isMilestone) {
                setTimeout(() => {
                    this.animationManager.createCelebrationAnimation();
                }, 500);
                console.log('设置里程碑庆祝动画');
            }
            
            // 开始倒计时
            console.log('准备启动倒计时...');
            
            // 确保定时器元素存在
            let timerElement = document.getElementById(`timer-${lineNumber}`);
            if (!timerElement) {
                console.log('定时器元素不存在，创建新的');
                timerElement = document.createElement('div');
                timerElement.id = `timer-${lineNumber}`;
                timerElement.className = 'timer-display';
                cell.appendChild(timerElement);
                console.log('定时器元素创建完成');
            } else {
                console.log('定时器元素已存在');
            }
            
            this.timerManager.startTimer(lineNumber, killTime, null, cell, this.onTimerComplete.bind(this));
            console.log('启动倒计时');
            
            // 更新状态显示
            this.uiManager.showKillStatus(lineNumber);
            console.log('更新状态显示');
            
            // 更新统计
            this.statsManager.updateStats();
            
            console.log(`击杀事件处理完成，线路${lineNumber}，统计已更新`);
            
        } catch (error) {
            console.error('handleCellClick处理过程中发生错误:', error);
            // 即使出错也尝试更新统计
            try {
                this.statsManager.updateStats();
            } catch (statsError) {
                console.error('统计更新也失败:', statsError);
            }
        }
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
        this.storageManager.setKillTime(lineNumber, killTime);
        
        // 记录击杀事件
        this.statsManager.recordKillEvent(lineNumber, killTime);
        
        // 添加到击杀事件列表（时间未知）
        this.statsManager.addKillEvent(lineNumber, null);
        
        // 同步到其他用户（本地P2P协作）
        if (this.collaborationManager) {
            this.collaborationManager.syncLineStateChange(lineNumber, 'killed-unknown', null);
        }
        
        // 同步到Firebase协作
        if (this.firebaseCollaborationManager && this.firebaseCollaborationManager.roomId) {
            this.firebaseCollaborationManager.syncLineStateChange(lineNumber, 'killed-unknown', null);
        }
        
        // 触发自定义事件
        document.dispatchEvent(new CustomEvent('lineStateChanged', {
            detail: { lineNumber, state: 'killed-unknown', killTime: null }
        }));
        
        // 更新图表
        if (this.chartManager) {
            this.chartManager.updateChart();
        }
        
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
        
        // 同步到其他用户（本地P2P协作）
        if (this.collaborationManager) {
            this.collaborationManager.syncLineStateChange(lineNumber, 'cancelled', null);
        }
        
        // 同步到Firebase协作
        if (this.firebaseCollaborationManager && this.firebaseCollaborationManager.roomId) {
            this.firebaseCollaborationManager.syncLineStateChange(lineNumber, 'cancelled', null);
        }
        
        // 触发自定义事件
        document.dispatchEvent(new CustomEvent('lineStateChanged', {
            detail: { lineNumber, state: 'cancelled', killTime: null }
        }));
        
        // 更新图表
        if (this.chartManager) {
            this.chartManager.updateChart();
        }
        
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
    onTimerComplete(lineNumber) {
        // 更新统计
        this.statsManager.updateStats();
    }
}
