// 表格管理器
export class TableManager {
    constructor() {
        this.rows = 20;
        this.cols = 20;
    }

    // 初始化表格
    initializeTable(table, eventManager) {
        let lineNumber = 1;
        
        // 创建20行（每行20列）
        for (let i = 0; i < this.rows; i++) {
            const row = document.createElement('tr');
            
            for (let j = 0; j < this.cols; j++) {
                const cell = document.createElement('td');
                cell.textContent = lineNumber;
                cell.dataset.line = lineNumber;
                
                // 添加提示
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
                cell.appendChild(tooltip);
                
                // 绑定事件
                this.bindCellEvents(cell, eventManager);
                
                row.appendChild(cell);
                lineNumber++;
            }
            
            table.appendChild(row);
            
            // 在每行后添加一行用于倒计时显示
            const timerRow = document.createElement('tr');
            timerRow.id = `timer-row-${i}`;
            
            for (let j = 0; j < this.cols; j++) {
                const timerCell = document.createElement('td');
                timerCell.classList.add('timer-cell');
                timerCell.id = `timer-${lineNumber - this.cols + j}`;
                timerRow.appendChild(timerCell);
            }
            
            table.appendChild(timerRow);
        }
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
            const timerCell = document.getElementById(`timer-${i}`);
            
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
            if (timerCell) {
                timerCell.textContent = '';
            }
        }
    }
}
