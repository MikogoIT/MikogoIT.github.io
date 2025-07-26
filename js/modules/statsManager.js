// 统计管理器 - 处理统计数据和今日计数
export class StatsManager {
    constructor() {
        this.killEvents = JSON.parse(localStorage.getItem('killEvents')) || [];
        this.initElements();
    }

    // 初始化统计元素
    initElements() {
        // 使用延迟初始化确保DOM元素已加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindElements());
        } else {
            this.bindElements();
        }
    }

    // 绑定DOM元素
    bindElements() {
        this.killedCountSpan = document.getElementById('killed-count');
        this.killedUnknownCountSpan = document.getElementById('killed-unknown-count');
        this.refreshedCountSpan = document.getElementById('refreshed-count');
        this.availableCountSpan = document.getElementById('available-count');
        this.todayCountSpan = document.getElementById('today-count');
        
        // 检查元素是否正确绑定
        if (!this.todayCountSpan) {
            console.error('统计元素绑定失败：today-count 元素未找到');
        }
    }

    // 更新统计信息
    updateStats() {
        let killed = 0;
        let killedUnknown = 0;
        let refreshed = 0;
        let available = 0;
        
        // 获取所有线路格子
        const lineCells = document.querySelectorAll('td[data-line]');
        lineCells.forEach(cell => {
            if (cell.classList.contains('killed')) killed++;
            else if (cell.classList.contains('killed-unknown')) killedUnknown++;
            else if (cell.classList.contains('refreshed')) refreshed++;
            else available++;
        });
        
        this.killedCountSpan.textContent = killed;
        this.killedUnknownCountSpan.textContent = killedUnknown;
        this.refreshedCountSpan.textContent = refreshed;
        this.availableCountSpan.textContent = available;
        
        // 更新今日击杀数量
        this.updateTodayCount();
    }

    // 更新今日击杀数量
    updateTodayCount() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;
        
        const todayKills = this.killEvents.filter(event => {
            return event.timestamp >= todayStart && event.timestamp < todayEnd;
        }).length;
        
        console.log(`更新今日击杀数: ${todayKills}, 总事件数: ${this.killEvents.length}`);
        
        if (this.todayCountSpan) {
            this.todayCountSpan.textContent = todayKills;
        } else {
            console.error('today-count 元素未找到，无法更新今日击杀数');
        }
    }

    // 记录击杀事件
    recordKillEvent(lineNumber, timestamp) {
        const event = { line: lineNumber, timestamp: timestamp };
        this.killEvents.push(event);
        localStorage.setItem('killEvents', JSON.stringify(this.killEvents));
        
        console.log(`记录击杀事件: 线路${lineNumber}, 时间${new Date(timestamp)}, 总事件数: ${this.killEvents.length}`);
        
        // 检查是否达到里程碑（每10次击杀触发庆祝动画）
        const totalKills = this.killEvents.length;
        return totalKills > 0 && totalKills % 10 === 0;
    }

    // 移除击杀事件
    removeKillEvent(lineNumber, killTime) {
        const originalLength = this.killEvents.length;
        
        if (killTime) {
            // 有击杀时间时，精确匹配
            this.killEvents = this.killEvents.filter(event => 
                !(event.line == lineNumber && Math.abs(event.timestamp - killTime) < 1000)
            );
        } else {
            // 没有击杀时间时，移除该线路的最近一次击杀记录
            // 找到该线路的最后一个击杀事件并移除
            for (let i = this.killEvents.length - 1; i >= 0; i--) {
                if (this.killEvents[i].line == lineNumber) {
                    this.killEvents.splice(i, 1);
                    break;
                }
            }
        }
        
        // 只有成功移除事件时才更新存储
        if (this.killEvents.length < originalLength) {
            localStorage.setItem('killEvents', JSON.stringify(this.killEvents));
            console.log(`已移除线路 ${lineNumber} 的击杀记录${killTime ? ', 击杀时间: ' + new Date(killTime) : ' (最近一次)'}`);
        } else {
            console.warn(`未找到线路 ${lineNumber} 的击杀记录${killTime ? ', 击杀时间: ' + new Date(killTime) : ''}`);
        }
    }

    // 重置所有击杀事件
    resetAllKillEvents() {
        this.killEvents = [];
        localStorage.removeItem('killEvents');
    }

    // 获取最近几天的击杀数据
    getDailyKillData(days = 7) {
        const dates = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            dates.push({
                label: `${date.getMonth() + 1}/${date.getDate()}`,
                fullDate: date.toLocaleDateString()
            });
        }
        
        // 统计每日击杀数量
        const dailyKills = dates.map(dateInfo => {
            return this.killEvents.filter(event => {
                const eventDate = new Date(event.timestamp).toLocaleDateString();
                return eventDate === dateInfo.fullDate;
            }).length;
        });
        
        return {
            labels: dates.map(d => d.label),
            data: dailyKills
        };
    }

    // 获取小时击杀数据
    getHourlyKillData(hours = 24) {
        const hourLabels = [];
        const hourlyKills = new Array(hours).fill(0);
        
        for (let i = 0; i < hours; i++) {
            hourLabels.push(`${i.toString().padStart(2, '0')}:00`);
        }
        
        // 统计每小时的击杀数量
        this.killEvents.forEach(event => {
            const eventDate = new Date(event.timestamp);
            const hour = eventDate.getHours();
            if (hour < hours) {
                hourlyKills[hour]++;
            }
        });
        
        return {
            labels: hourLabels,
            data: hourlyKills
        };
    }

    // 获取所有击杀事件（用于备份或导出）
    getKillEvents() {
        return [...this.killEvents]; // 返回副本
    }

    // 导入击杀事件（用于恢复备份）
    importKillEvents(events) {
        if (Array.isArray(events)) {
            this.killEvents = events;
            localStorage.setItem('killEvents', JSON.stringify(this.killEvents));
            this.updateStats();
        }
    }

    // 获取统计摘要
    getStatsSummary() {
        const totalKills = this.killEvents.length;
        const todayKills = this.getTodayKillCount();
        
        // 计算平均每日击杀
        const firstKillDate = this.killEvents.length > 0 ? 
            new Date(Math.min(...this.killEvents.map(e => e.timestamp))) : new Date();
        const daysSinceFirst = Math.ceil((Date.now() - firstKillDate.getTime()) / (1000 * 60 * 60 * 24));
        const avgDaily = daysSinceFirst > 0 ? (totalKills / daysSinceFirst).toFixed(1) : 0;
        
        return {
            total: totalKills,
            today: todayKills,
            avgDaily: avgDaily,
            daysSinceFirst: daysSinceFirst
        };
    }

    // 获取今日击杀数量
    getTodayKillCount() {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 24 * 60 * 60 * 1000;
        
        return this.killEvents.filter(event => {
            return event.timestamp >= todayStart && event.timestamp < todayEnd;
        }).length;
    }

    // 导出所有数据
    exportAllData() {
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            killEvents: this.killEvents,
            lineStates: this.getLineStatesData(),
            statistics: this.getStatsSummary(),
            notes: this.getNotesData()
        };
        
        return exportData;
    }
    
    // 获取线路状态数据（从localStorage）
    getLineStatesData() {
        const lineStates = {};
        const killTimes = {};
        
        for (let i = 1; i <= 400; i++) {
            const state = localStorage.getItem(`pigTimer_line_${i}_state`);
            const killTime = localStorage.getItem(`pigTimer_line_${i}_killTime`);
            
            if (state) {
                lineStates[i] = state;
            }
            if (killTime) {
                killTimes[i] = parseInt(killTime);
            }
        }
        
        return { lineStates, killTimes };
    }
    
    // 获取备注数据
    getNotesData() {
        return localStorage.getItem('pigTimer_notes') || '';
    }
    
    // 导出为JSON文件
    exportToJSON() {
        try {
            console.log('开始导出JSON数据...');
            
            // 检查浏览器兼容性
            if (!window.Blob) {
                alert('您的浏览器不支持文件下载功能，请使用更新版本的浏览器');
                return false;
            }
            
            if (!window.URL || !window.URL.createObjectURL) {
                alert('您的浏览器不支持文件下载功能，请使用更新版本的浏览器');
                return false;
            }
            
            const data = this.exportAllData();
            console.log('导出数据:', data);
            
            const jsonString = JSON.stringify(data, null, 2);
            console.log('JSON字符串长度:', jsonString.length);
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            console.log('Blob创建成功:', blob);
            
            const url = URL.createObjectURL(blob);
            console.log('URL创建成功:', url);
            
            const link = document.createElement('a');
            
            // 检查下载属性支持
            if (!('download' in link)) {
                alert('您的浏览器不支持自动下载，请右键点击链接选择"另存为"');
                // 创建一个新窗口显示数据
                const newWindow = window.open();
                newWindow.document.write('<pre>' + jsonString + '</pre>');
                newWindow.document.title = '金猪监控数据';
                return true;
            }
            
            link.href = url;
            link.download = `金猪监控数据_${this.formatDateForFilename(new Date())}.json`;
            console.log('下载链接:', link.download);
            
            // 添加到DOM并触发点击
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            console.log('点击下载链接');
            
            // 延迟清理
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('清理完成');
            }, 100);
            
            console.log('数据导出完成');
            return true;
        } catch (error) {
            console.error('导出JSON时发生错误:', error);
            alert('导出失败: ' + error.message);
            return false;
        }
    }
    
    // 导出为CSV文件（击杀记录）
    exportToCSV() {
        try {
            console.log('开始导出CSV数据...');
            console.log('击杀事件数量:', this.killEvents.length);
            
            if (this.killEvents.length === 0) {
                console.log('没有击杀记录，显示提示');
                alert('暂无击杀记录可导出');
                return false;
            }
            
            let csvContent = '线路号,击杀时间,击杀日期\n';
            
            this.killEvents.forEach(event => {
                const date = new Date(event.timestamp);
                const dateStr = date.toLocaleDateString('zh-CN');
                const timeStr = date.toLocaleTimeString('zh-CN');
                csvContent += `${event.line},${timeStr},${dateStr}\n`;
            });
            
            console.log('CSV内容长度:', csvContent.length);
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `金猪击杀记录_${this.formatDateForFilename(new Date())}.csv`;
            console.log('CSV下载文件名:', link.download);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            console.log('CSV导出完成');
            return true;
        } catch (error) {
            console.error('导出CSV时发生错误:', error);
            return false;
        }
    }
    
    // 格式化日期用于文件名
    formatDateForFilename(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}`;
    }
    
    // 导入数据
    importData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (!data.version || !data.killEvents) {
                throw new Error('无效的数据格式');
            }
            
            // 导入击杀事件
            if (Array.isArray(data.killEvents)) {
                this.killEvents = data.killEvents;
                localStorage.setItem('killEvents', JSON.stringify(this.killEvents));
            }
            
            // 导入线路状态
            if (data.lineStates) {
                const { lineStates, killTimes } = data.lineStates;
                
                // 清除现有状态
                for (let i = 1; i <= 400; i++) {
                    localStorage.removeItem(`pigTimer_line_${i}_state`);
                    localStorage.removeItem(`pigTimer_line_${i}_killTime`);
                }
                
                // 设置新状态
                Object.entries(lineStates).forEach(([line, state]) => {
                    localStorage.setItem(`pigTimer_line_${line}_state`, state);
                });
                
                Object.entries(killTimes).forEach(([line, time]) => {
                    localStorage.setItem(`pigTimer_line_${line}_killTime`, time.toString());
                });
            }
            
            // 导入备注
            if (data.notes) {
                localStorage.setItem('pigTimer_notes', data.notes);
            }
            
            // 更新统计
            this.updateStats();
            
            console.log('数据导入完成');
            return true;
            
        } catch (error) {
            console.error('数据导入失败:', error);
            alert('数据导入失败: ' + error.message);
            return false;
        }
    }
}
