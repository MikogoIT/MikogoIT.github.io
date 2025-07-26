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
}
