// 表格管理器
export class TableManager {
    constructor() {
        this.updateLayoutSettings();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.updateLayoutSettings();
        });
    }
    
    // 根据屏幕大小更新布局设置
    updateLayoutSettings() {
        const screenWidth = window.innerWidth;
        if (screenWidth <= 480) {
            this.cols = 8; // 超小屏幕：8列，确保数字显示完整
            this.rows = 50;
        } else if (screenWidth <= 768) {
            this.cols = 10; // 手机端：10列，更宽的格子
            this.rows = 40;
        } else {
            this.cols = 20; // 桌面端：20列
            this.rows = 20;
        }
        console.log(`屏幕宽度: ${screenWidth}px, 使用布局: ${this.cols}列 x ${this.rows}行`);
    }

    // 初始化表格
    initializeTable(table, eventManager) {
        // 检查是否已有测试行，如果有就为其绑定事件
        const existingCells = table.querySelectorAll('td[data-line]');
        console.log(`表格初始化: 现有单元格${existingCells.length}个`);
        
        // 为现有的测试单元格绑定事件
        existingCells.forEach(cell => {
            // 确保现有单元格有tooltip和timer display
            if (!cell.querySelector('.tooltip')) {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
                cell.appendChild(tooltip);
            }
            
            const lineNumber = cell.dataset.line;
            if (lineNumber && !cell.querySelector('.timer-display')) {
                const timerDisplay = document.createElement('div');
                timerDisplay.id = `timer-${lineNumber}`;
                timerDisplay.className = 'timer-display';
                cell.appendChild(timerDisplay);
            }
            
            this.bindCellEvents(cell, eventManager);
        });
        
        // 如果现有单元格少于400个，需要生成剩余的
        if (existingCells.length < 400) {
            let lineNumber = existingCells.length + 1;
            let currentRow = null;
            let cellsInCurrentRow = 0;
            
            // 如果有测试行，获取当前行中的单元格数量
            if (existingCells.length > 0) {
                const lastCell = existingCells[existingCells.length - 1];
                currentRow = lastCell.parentElement;
                cellsInCurrentRow = currentRow.children.length;
            }
            
            // 生成剩余的单元格
            for (let i = lineNumber; i <= 400; i++) {
                // 如果需要新行或者没有当前行
                if (!currentRow || cellsInCurrentRow >= this.cols) {
                    currentRow = document.createElement('tr');
                    table.appendChild(currentRow);
                    cellsInCurrentRow = 0;
                }
                
                const cell = document.createElement('td');
                cell.textContent = i;
                cell.dataset.line = i;
                
                // 添加提示（检查是否已存在）
                if (!cell.querySelector('.tooltip')) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
                    cell.appendChild(tooltip);
                }
                
                // 添加定时器显示元素（检查是否已存在）
                if (!cell.querySelector('.timer-display')) {
                    const timerDisplay = document.createElement('div');
                    timerDisplay.id = `timer-${i}`;
                    timerDisplay.className = 'timer-display';
                    cell.appendChild(timerDisplay);
                }
                
                // 绑定事件
                this.bindCellEvents(cell, eventManager);
                
                currentRow.appendChild(cell);
                cellsInCurrentRow++;
            }
        }
        
        console.log(`表格初始化完成: 总共400个线路`);
    }

    // 重新生成表格布局（响应式）
    regenerateTable(table, eventManager, storageManager) {
        if (!table) return;
        
        console.log('重新生成表格布局...');
        
        // 保存当前状态
        const currentStates = {};
        const existingCells = table.querySelectorAll('td[data-line]');
        existingCells.forEach(cell => {
            const lineNumber = cell.dataset.line;
            if (lineNumber) {
                currentStates[lineNumber] = {
                    classes: Array.from(cell.classList),
                    timer: cell.querySelector('.timer-display')?.textContent || '',
                    state: storageManager ? storageManager.getLineState(lineNumber) : null
                };
            }
        });
        
        // 清空表格
        table.innerHTML = '';
        
        // 重新生成表格结构
        let lineNumber = 1;
        for (let row = 0; row < this.rows; row++) {
            const tr = document.createElement('tr');
            
            for (let col = 0; col < this.cols && lineNumber <= 400; col++) {
                const cell = document.createElement('td');
                cell.textContent = lineNumber;
                cell.dataset.line = lineNumber;
                
                // 添加提示
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
                cell.appendChild(tooltip);
                
                // 添加定时器显示
                const timerDisplay = document.createElement('div');
                timerDisplay.id = `timer-${lineNumber}`;
                timerDisplay.className = 'timer-display';
                cell.appendChild(timerDisplay);
                
                // 恢复状态
                if (currentStates[lineNumber]) {
                    const state = currentStates[lineNumber];
                    state.classes.forEach(cls => {
                        if (cls !== 'td') cell.classList.add(cls);
                    });
                    if (state.timer) {
                        timerDisplay.textContent = state.timer;
                    }
                }
                
                // 绑定事件
                this.bindCellEvents(cell, eventManager);
                
                tr.appendChild(cell);
                lineNumber++;
            }
            
            table.appendChild(tr);
        }
        
        console.log(`表格重新生成完成: ${this.cols}列 x ${this.rows}行`);
    }

    // 绑定单元格事件
    bindCellEvents(cell, eventManager) {
        // 检测设备类型决定绑定方式
        if (this.isMobileDevice()) {
            // 手机端：使用三连击事件处理
            eventManager.addMobileTripleClickEvent(cell);
        } else {
            // 桌面端：使用传统的点击事件
            cell.addEventListener('click', (e) => eventManager.handleCellClick(e));
            cell.addEventListener('contextmenu', (e) => eventManager.handleCellRightClick(e));
            cell.addEventListener('dblclick', (e) => eventManager.handleCellDoubleClick(e));
        }
    }

    // 检测是否为移动设备
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || window.innerWidth <= 768;
    }

    // 恢复单元格状态
    restoreCellState(cell, lineNumber, status, killTime, testMode) {
        const tooltip = cell.querySelector('.tooltip');
        
        if (status === 'killed') {
            cell.classList.add('killed');
            tooltip.textContent = '双击取消击杀状态';
        } else if (status === 'killed-unknown') {
            cell.classList.add('killed-unknown');
            tooltip.textContent = '双击取消击杀状态';
        } else if (status === 'refreshed') {
            cell.classList.add('refreshed');
            tooltip.textContent = '金猪已刷新，左键击杀开始倒计时，右键击杀但不知时间';
        }
    }

    // 设置单元格为刷新状态
    setCellRefreshed(cell, lineNumber) {
        // 移除所有其他状态
        cell.classList.remove('killed', 'killed-unknown');
        
        // 添加刷新状态
        cell.classList.add('refreshed');
        
        // 更新提示文本
        const tooltip = cell.querySelector('.tooltip');
        if (tooltip) {
            tooltip.textContent = '金猪已刷新，左键击杀开始倒计时，右键击杀但不知时间';
        }
        
        // 清除计时器显示
        const timerDisplay = document.getElementById(`timer-${lineNumber}`);
        if (timerDisplay) {
            timerDisplay.textContent = '';
        }
    }

    // 重置所有单元格
    resetAllCells() {
        for (let i = 1; i <= 400; i++) {
            const cell = document.querySelector(`td[data-line="${i}"]`);
            const timerDisplay = document.getElementById(`timer-${i}`);
            
            if (cell) {
                // 移除所有状态类
                cell.classList.remove('killed', 'killed-unknown', 'refreshed');
                
                // 重置提示文本
                const tooltip = cell.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
                }
                
                // 清除本地存储
                localStorage.removeItem(`line-${i}`);
                localStorage.removeItem(`killTime-${i}`);
            }
            
            // 清除倒计时显示
            if (timerDisplay) {
                timerDisplay.textContent = '';
            }
        }
    }
}
