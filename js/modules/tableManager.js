// 表格管理器
export class TableManager {
    constructor() {
        this.rows = 20;
        this.cols = 20;
    }

    // 初始化表格
    initializeTable(table, eventManager) {
        // 检查是否已有测试行，如果有就从第21个开始
        const existingCells = table.querySelectorAll('td[data-line]');
        let lineNumber = existingCells.length > 0 ? existingCells.length + 1 : 1;
        let startRow = existingCells.length > 0 ? 1 : 0; // 如果已有测试行，从第二行开始
        
        console.log(`表格初始化: 现有单元格${existingCells.length}个, 从线路${lineNumber}开始`);
        
        // 为现有的测试单元格绑定事件
        existingCells.forEach(cell => {
            this.bindCellEvents(cell, eventManager);
        });
        
        // 创建剩余的行
        for (let i = startRow; i < this.rows; i++) {
            const row = document.createElement('tr');
            
            for (let j = 0; j < this.cols; j++) {
                // 如果是第一行且已有测试单元格，跳过已存在的
                if (i === 0 && j < existingCells.length) {
                    continue;
                }
                
                const cell = document.createElement('td');
                cell.textContent = lineNumber;
                cell.dataset.line = lineNumber;
                
                // 添加提示
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
                cell.appendChild(tooltip);
                
                // 添加定时器显示元素
                const timerDisplay = document.createElement('div');
                timerDisplay.id = `timer-${lineNumber}`;
                timerDisplay.className = 'timer-display';
                cell.appendChild(timerDisplay);
                
                // 绑定事件
                this.bindCellEvents(cell, eventManager);
                
                row.appendChild(cell);
                lineNumber++;
            }
            
            // 只添加非空行
            if (row.children.length > 0) {
                table.appendChild(row);
            }
        }
        
        console.log(`表格初始化完成: 总共${lineNumber - 1}个线路`);
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
    restoreCellState(cell, status, killTime, lineNumber) {
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
