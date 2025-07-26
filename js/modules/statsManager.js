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
        console.log('统计元素绑定结果:', {
            killedCount: !!this.killedCountSpan,
            killedUnknown: !!this.killedUnknownCountSpan, 
            refreshed: !!this.refreshedCountSpan,
            available: !!this.availableCountSpan,
            today: !!this.todayCountSpan
        });
        
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
        
        console.log(`统计更新: 击杀=${killed}, 未知=${killedUnknown}, 刷新=${refreshed}, 可用=${available}`);
        
        // 检查元素是否仍然存在
        if (!this.killedCountSpan) {
            console.error('killedCountSpan元素丢失，重新绑定');
            this.bindElements();
        }
        
        if (this.killedCountSpan) {
            this.killedCountSpan.textContent = killed;
            console.log(`更新击杀数: ${killed}`);
        } else {
            console.error('无法更新击杀数，元素不存在');
        }
        
        if (this.killedUnknownCountSpan) {
            this.killedUnknownCountSpan.textContent = killedUnknown;
        } else {
            console.error('无法更新未知击杀数，元素不存在');
        }
        
        if (this.refreshedCountSpan) {
            this.refreshedCountSpan.textContent = refreshed;
        } else {
            console.error('无法更新刷新数，元素不存在');
        }
        
        if (this.availableCountSpan) {
            this.availableCountSpan.textContent = available;
        } else {
            console.error('无法更新可用数，元素不存在');
        }
        
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
            
            // 显示导出成功消息
            setTimeout(() => {
                const exportData = this.exportAllData();
                alert(`JSON数据已导出成功！\n\n文件名: ${link.download}\n文件已保存到浏览器默认下载目录\n\n包含内容:\n- 击杀记录: ${exportData.killEvents.length} 条\n- 线路状态: ${Object.keys(exportData.lineStates.lineStates).length} 个\n- 击杀时间: ${Object.keys(exportData.lineStates.killTimes).length} 个\n- 备注信息和统计数据`);
            }, 200);
            
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
            
            // 按时间排序击杀事件（最新的在前）
            const sortedEvents = this.killEvents.slice().sort((a, b) => b.timestamp - a.timestamp);
            
            // 使用英文标题避免编码问题，并在第二行添加中文说明
            let csvContent = 'LineNumber,KillTime,KillDate,FullTimestamp\n';
            csvContent += '线路号,击杀时间,击杀日期,完整时间戳\n';
            
            // 数据行
            sortedEvents.forEach(event => {
                const date = new Date(event.timestamp);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const seconds = date.getSeconds().toString().padStart(2, '0');
                
                const dateStr = `${year}/${month}/${day}`;  // 改回斜杠格式，兼容Excel
                const timeStr = `${hours}:${minutes}:${seconds}`;
                const fullTimestamp = `${year}/${month}/${day} ${timeStr}`;
                
                // 使用双引号包围数据，确保特殊字符正确处理
                csvContent += `"${event.line}","${timeStr}","${dateStr}","${fullTimestamp}"\n`;
            });
            
            console.log('CSV内容长度:', csvContent.length);
            console.log('CSV前200字符:', csvContent.substring(0, 200));
            
            // 创建UTF-8编码的Blob，使用BOM确保Excel正确识别
            const BOM = '\uFEFF';
            const csvContentWithBOM = BOM + csvContent;
            
            const blob = new Blob([csvContentWithBOM], { 
                type: 'text/csv;charset=utf-8'
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `金猪击杀记录_${this.formatDateForFilename(new Date())}.csv`;
            console.log('CSV下载文件名:', link.download);
            
            // 添加到DOM并触发下载
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            // 延迟清理
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('CSV清理完成');
            }, 100);
            
            console.log('CSV导出完成');
            
            // 显示导出成功消息，包含使用说明
            setTimeout(() => {
                alert(`CSV文件已导出成功！\n\n文件名: ${link.download}\n文件已保存到浏览器默认下载目录\n\n包含 ${sortedEvents.length} 条击杀记录\n按时间倒序排列（最新的在前）\n\n💡 使用提示：\n- 第一行是英文标题（便于Excel识别）\n- 第二行是中文说明\n- 如果Excel打开仍有乱码，请尝试：\n  1. 用记事本打开文件，另存为UTF-8编码\n  2. 或在Excel中选择"数据"->"从文本"导入`);
            }, 200);
            
            return true;
        } catch (error) {
            console.error('导出CSV时发生错误:', error);
            alert('CSV导出失败: ' + error.message);
            return false;
        }
    }
    
    // 导出为纯ASCII CSV（避免编码问题）
    exportToASCIICSV() {
        try {
            console.log('开始导出ASCII CSV数据...');
            
            if (this.killEvents.length === 0) {
                alert('暂无击杀记录可导出');
                return false;
            }
            
            // 按时间排序击杀事件（最新的在前）
            const sortedEvents = this.killEvents.slice().sort((a, b) => b.timestamp - a.timestamp);
            
            // 使用纯英文标题，避免任何编码问题
            let csvContent = 'Line,Time,Date,Timestamp\n';
            
            // 数据行
            sortedEvents.forEach(event => {
                const date = new Date(event.timestamp);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const seconds = date.getSeconds().toString().padStart(2, '0');
                
                const dateStr = `${year}/${month}/${day}`;
                const timeStr = `${hours}:${minutes}:${seconds}`;
                const fullTimestamp = `${year}/${month}/${day} ${timeStr}`;
                
                csvContent += `${event.line},${timeStr},${dateStr},${fullTimestamp}\n`;
            });
            
            // 不使用BOM，创建纯ASCII CSV
            const blob = new Blob([csvContent], { 
                type: 'text/plain;charset=ascii'
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `PigKillRecord_ASCII_${this.formatDateForFilename(new Date())}.csv`;
            
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            alert(`ASCII CSV文件已导出！\n\n文件名: ${link.download}\n\n此文件使用纯英文标题，应该不会有乱码问题\n包含 ${sortedEvents.length} 条记录`);
            
            return true;
        } catch (error) {
            console.error('导出ASCII CSV时发生错误:', error);
            alert('ASCII CSV导出失败: ' + error.message);
            return false;
        }
    }
    
    // 导出为制表符分隔的TXT文件
    exportToTSV() {
        try {
            console.log('开始导出TSV数据...');
            
            if (this.killEvents.length === 0) {
                alert('暂无击杀记录可导出');
                return false;
            }
            
            // 按时间排序击杀事件（最新的在前）
            const sortedEvents = this.killEvents.slice().sort((a, b) => b.timestamp - a.timestamp);
            
            // 使用制表符分隔，第一行中文标题
            let tsvContent = '线路号\t击杀时间\t击杀日期\t完整时间戳\n';
            
            // 数据行
            sortedEvents.forEach(event => {
                const date = new Date(event.timestamp);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const seconds = date.getSeconds().toString().padStart(2, '0');
                
                const dateStr = `${year}/${month}/${day}`;
                const timeStr = `${hours}:${minutes}:${seconds}`;
                const fullTimestamp = `${year}/${month}/${day} ${timeStr}`;
                
                tsvContent += `${event.line}\t${timeStr}\t${dateStr}\t${fullTimestamp}\n`;
            });
            
            // 使用UTF-8编码
            const blob = new Blob(['\uFEFF' + tsvContent], { 
                type: 'text/tab-separated-values;charset=utf-8'
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `金猪击杀记录_${this.formatDateForFilename(new Date())}.tsv`;
            
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            alert(`TSV文件已导出！\n\n文件名: ${link.download}\n\n制表符分隔格式，可以用Excel打开\n包含 ${sortedEvents.length} 条记录`);
            
            return true;
        } catch (error) {
            console.error('导出TSV时发生错误:', error);
            alert('TSV导出失败: ' + error.message);
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
    
    // 调试CSV内容（开发用）
    debugCSVContent() {
        try {
            console.log('=== CSV内容调试 ===');
            console.log('击杀事件数量:', this.killEvents.length);
            
            if (this.killEvents.length === 0) {
                console.log('没有击杀记录');
                return;
            }
            
            // 模拟CSV生成过程
            let csvContent = '\uFEFF';
            csvContent += '线路号,击杀时间,击杀日期,完整时间戳\n';
            
            const sortedEvents = this.killEvents.slice().sort((a, b) => b.timestamp - a.timestamp);
            console.log('排序后事件数量:', sortedEvents.length);
            
            // 只显示前5条记录的详细信息
            const debugEvents = sortedEvents.slice(0, 5);
            debugEvents.forEach((event, index) => {
                const date = new Date(event.timestamp);
                console.log(`记录${index + 1}:`, {
                    原始数据: event,
                    解析时间: date.toString(),
                    时间戳: event.timestamp,
                    线路: event.line
                });
                
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const seconds = date.getSeconds().toString().padStart(2, '0');
                
                const dateStr = `${year}-${month}-${day}`;
                const timeStr = `${hours}:${minutes}:${seconds}`;
                const fullTimestamp = date.toLocaleString('zh-CN');
                
                const csvLine = `${event.line},${timeStr},${dateStr},${fullTimestamp}`;
                csvContent += csvLine + '\n';
                
                console.log(`CSV行${index + 2}:`, csvLine);
            });
            
            console.log('=== 完整CSV前500字符 ===');
            console.log(csvContent.substring(0, 500));
            
            console.log('=== CSV调试完成 ===');
            
            // 返回生成的CSV内容供测试
            return csvContent;
            
        } catch (error) {
            console.error('CSV调试出错:', error);
        }
    }
    
    // 测试导出数据的有效性
    validateExportData() {
        try {
            console.log('=== 导出数据验证 ===');
            
            // 验证击杀事件
            console.log('击杀事件检查:');
            console.log('- 总数:', this.killEvents.length);
            console.log('- 示例事件:', this.killEvents.slice(0, 3));
            
            // 验证时间戳
            if (this.killEvents.length > 0) {
                const timestamps = this.killEvents.map(e => e.timestamp);
                const validTimestamps = timestamps.filter(t => !isNaN(t) && t > 0);
                console.log('- 有效时间戳:', validTimestamps.length, '/', timestamps.length);
                
                if (validTimestamps.length !== timestamps.length) {
                    console.warn('发现无效时间戳！');
                    this.killEvents.forEach((event, index) => {
                        if (isNaN(event.timestamp) || event.timestamp <= 0) {
                            console.warn(`无效事件[${index}]:`, event);
                        }
                    });
                }
            }
            
            // 验证线路状态
            const lineStatesData = this.getLineStatesData();
            console.log('线路状态检查:');
            console.log('- 状态数量:', Object.keys(lineStatesData.lineStates).length);
            console.log('- 击杀时间数量:', Object.keys(lineStatesData.killTimes).length);
            
            console.log('=== 验证完成 ===');
            return true;
            
        } catch (error) {
            console.error('数据验证出错:', error);
            return false;
        }
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
            
            // 使用完整状态恢复方法
            setTimeout(() => {
                this.triggerFullStateRestore();
                
                // 验证恢复情况
                setTimeout(() => {
                    this.verifyStateRestoration();
                }, 800);
            }, 200);
            
            console.log('数据导入完成');
            return true;
            
        } catch (error) {
            console.error('数据导入失败:', error);
            alert('数据导入失败: ' + error.message);
            return false;
        }
    }

    // 导入后恢复表格状态
    restoreTableStateAfterImport() {
        console.log('开始恢复表格状态...');
        
        // 多次尝试确保表格完全加载
        const maxRetries = 5;
        let retryCount = 0;
        
        const attemptRestore = () => {
            const lineCells = document.querySelectorAll('td[data-line]');
            console.log(`第${retryCount + 1}次尝试: 找到 ${lineCells.length} 个线路单元格`);
            
            if (lineCells.length === 0 && retryCount < maxRetries) {
                retryCount++;
                console.log(`没有找到线路单元格，${500 * retryCount}ms后重试...`);
                setTimeout(attemptRestore, 500 * retryCount);
                return;
            }
            
            if (lineCells.length === 0) {
                console.error('多次尝试后仍未找到线路单元格，恢复失败');
                return;
            }
            
            let restoredCount = 0;
            let killedTimersCount = 0;
            
            console.log('开始逐个恢复线路状态...');
            
            lineCells.forEach(cell => {
                const lineNumber = cell.dataset.line;
                if (!lineNumber) return;
                
                // 清除所有状态类
                cell.classList.remove('killed', 'killed-unknown', 'refreshed');
                
                // 获取存储的状态
                const state = localStorage.getItem(`pigTimer_line_${lineNumber}_state`);
                const killTime = localStorage.getItem(`pigTimer_line_${lineNumber}_killTime`);
                
                if (state) {
                    console.log(`恢复线路${lineNumber}: 状态=${state}, 击杀时间=${killTime ? new Date(parseInt(killTime)).toLocaleString() : '无'}`);
                    
                    // 恢复状态类
                    cell.classList.add(state);
                    restoredCount++;
                    
                    // 更新提示文本
                    const tooltip = cell.querySelector('.tooltip');
                    if (tooltip) {
                        if (state === 'killed' || state === 'killed-unknown') {
                            tooltip.textContent = '双击取消击杀状态';
                        } else if (state === 'refreshed') {
                            tooltip.textContent = '金猪已刷新！点击标记击杀';
                        } else {
                            tooltip.textContent = '点击标记金猪被击杀';
                        }
                    }
                    
                    // 如果是击杀状态且有击杀时间，恢复倒计时
                    if (state === 'killed' && killTime) {
                        const killTimeNum = parseInt(killTime);
                        
                        // 确保定时器元素存在
                        let timerElement = cell.querySelector('.timer-display');
                        if (!timerElement) {
                            console.log(`创建线路${lineNumber}的定时器元素`);
                            timerElement = document.createElement('div');
                            timerElement.id = `timer-${lineNumber}`;
                            timerElement.className = 'timer-display';
                            cell.appendChild(timerElement);
                        }
                        
                        // 启动倒计时（如果应用和定时器管理器可用）
                        if (window.app && window.app.timerManager) {
                            console.log(`启动线路${lineNumber}的定时器，击杀时间: ${new Date(killTimeNum).toLocaleString()}`);
                            window.app.timerManager.startTimer(lineNumber, killTimeNum, null, cell, 
                                (completedLine) => {
                                    if (window.app && window.app.eventManager) {
                                        window.app.eventManager.onTimerComplete(completedLine);
                                    }
                                });
                            killedTimersCount++;
                        } else {
                            console.warn('定时器管理器不可用，无法启动倒计时');
                        }
                    }
                }
            });
            
            console.log(`✅ 表格状态恢复完成: 共恢复 ${restoredCount} 个线路状态，其中 ${killedTimersCount} 个启动了倒计时`);
            
            // 强制重新检查一下状态应用情况
            setTimeout(() => {
                console.log('验证状态恢复结果:');
                const finalCheck = document.querySelectorAll('td[data-line]');
                let successCount = 0;
                finalCheck.forEach(cell => {
                    const lineNumber = cell.dataset.line;
                    const expectedState = localStorage.getItem(`pigTimer_line_${lineNumber}_state`);
                    if (expectedState) {
                        const hasCorrectClass = cell.classList.contains(expectedState);
                        if (hasCorrectClass) {
                            successCount++;
                        } else {
                            console.warn(`❌ 线路${lineNumber}状态验证失败: 期望=${expectedState}, 实际类=${cell.classList.toString()}`);
                        }
                    }
                });
                console.log(`状态验证结果: ${successCount}/${restoredCount} 个状态正确应用`);
            }, 1000);
        };
        
        // 开始第一次尝试
        attemptRestore();
        
        // 如果在协作房间中，同步状态给其他用户
        if (window.app && window.app.collaborationManager && window.app.collaborationManager.roomId) {
            console.log('检测到协作模式，同步导入的状态给其他用户');
            setTimeout(() => {
                this.syncImportedStateToCollaborators();
            }, 1500);
        }
    }
    
    // 同步导入的状态给协作用户
    syncImportedStateToCollaborators() {
        // 遍历所有状态并同步
        for (let i = 1; i <= 400; i++) {
            const state = localStorage.getItem(`pigTimer_line_${i}_state`);
            const killTime = localStorage.getItem(`pigTimer_line_${i}_killTime`);
            
            if (state && window.app.collaborationManager) {
                const killTimeNum = killTime ? parseInt(killTime) : null;
                window.app.collaborationManager.syncLineStateChange(i, state, killTimeNum);
            }
        }
    }

    // 验证状态恢复情况
    verifyStateRestoration() {
        console.log('验证状态恢复情况...');
        
        let expectedStates = 0;
        let actualStates = 0;
        let missingStates = [];
        
        // 统计localStorage中的状态
        for (let i = 1; i <= 400; i++) {
            const state = localStorage.getItem(`pigTimer_line_${i}_state`);
            if (state) {
                expectedStates++;
                
                // 检查DOM中是否正确应用
                const cell = document.querySelector(`td[data-line="${i}"]`);
                if (cell && cell.classList.contains(state)) {
                    actualStates++;
                } else {
                    missingStates.push({ line: i, expectedState: state, cell });
                }
            }
        }
        
        console.log(`状态恢复验证: 期望${expectedStates}个状态，实际恢复${actualStates}个状态`);
        
        if (missingStates.length > 0) {
            console.warn(`发现${missingStates.length}个状态未正确恢复:`, missingStates.map(s => `线路${s.line}(${s.expectedState})`));
            
            // 尝试手动修复未恢复的状态
            missingStates.forEach(({ line, expectedState, cell }) => {
                if (cell) {
                    console.log(`手动修复线路${line}状态: ${expectedState}`);
                    cell.classList.remove('killed', 'killed-unknown', 'refreshed');
                    cell.classList.add(expectedState);
                    
                    // 如果是击杀状态，尝试恢复倒计时
                    if (expectedState === 'killed' && window.app && window.app.timerManager) {
                        const killTime = localStorage.getItem(`pigTimer_line_${line}_killTime`);
                        if (killTime) {
                            const killTimeNum = parseInt(killTime);
                            window.app.timerManager.startTimer(line, killTimeNum, null, cell, 
                                (completedLine) => {
                                    if (window.app && window.app.eventManager) {
                                        window.app.eventManager.onTimerComplete(completedLine);
                                    }
                                });
                        }
                    }
                } else {
                    console.error(`线路${line}的DOM元素未找到`);
                }
            });
            
            // 再次验证
            setTimeout(() => {
                let finalActualStates = 0;
                for (let i = 1; i <= 400; i++) {
                    const state = localStorage.getItem(`pigTimer_line_${i}_state`);
                    if (state) {
                        const cell = document.querySelector(`td[data-line="${i}"]`);
                        if (cell && cell.classList.contains(state)) {
                            finalActualStates++;
                        }
                    }
                }
                console.log(`最终验证结果: ${finalActualStates}/${expectedStates} 个状态正确恢复`);
                
                if (finalActualStates === expectedStates) {
                    console.log('✅ 所有状态最终恢复成功！');
                } else {
                    console.error(`❌ 仍有${expectedStates - finalActualStates}个状态恢复失败`);
                }
            }, 1000);
        } else {
            console.log('✅ 所有状态恢复成功！');
        }
        
        // 如果在协作房间中，同步状态给其他用户
        if (window.app && window.app.collaborationManager && window.app.collaborationManager.roomId) {
            console.log('检测到协作模式，同步导入的状态给其他用户');
            setTimeout(() => {
                this.syncImportedStateToCollaborators();
            }, 1000);
        }
    }
    
    // 强制恢复所有状态
    forceRestoreAllStates() {
        console.log('强制恢复所有状态...');
        
        const lineCells = document.querySelectorAll('td[data-line]');
        let forceRestoredCount = 0;
        
        lineCells.forEach(cell => {
            const lineNumber = cell.dataset.line;
            if (!lineNumber) return;
            
            const state = localStorage.getItem(`pigTimer_line_${lineNumber}_state`);
            if (state) {
                // 强制清除并重新应用状态
                cell.classList.remove('killed', 'killed-unknown', 'refreshed');
                cell.classList.add(state);
                
                console.log(`强制恢复线路${lineNumber}: ${state}`);
                forceRestoredCount++;
                
                // 确保定时器元素存在
                let timerElement = cell.querySelector('.timer-display');
                if (!timerElement) {
                    timerElement = document.createElement('div');
                    timerElement.id = `timer-${lineNumber}`;
                    timerElement.className = 'timer-display';
                    cell.appendChild(timerElement);
                }
                
                // 如果是击杀状态，重新启动倒计时
                if (state === 'killed') {
                    const killTime = localStorage.getItem(`pigTimer_line_${lineNumber}_killTime`);
                    if (killTime && window.app && window.app.timerManager) {
                        const killTimeNum = parseInt(killTime);
                        console.log(`强制重启线路${lineNumber}倒计时`);
                        window.app.timerManager.startTimer(lineNumber, killTimeNum, null, cell, 
                            (completedLine) => {
                                if (window.app && window.app.eventManager) {
                                    window.app.eventManager.onTimerComplete(completedLine);
                                }
                            });
                    }
                }
            }
        });
        
        console.log(`强制恢复完成，共处理${forceRestoredCount}个状态`);
        
        // 最后更新一次统计
        this.updateStats();
    }

    // 添加导入后的状态恢复帮助方法
    triggerFullStateRestore() {
        console.log('触发完整状态恢复...');
        
        // 优先使用主应用的恢复方法
        if (window.app && typeof window.app.restoreTableState === 'function') {
            console.log('使用主应用的restoreTableState方法');
            window.app.restoreTableState();
            
            // 同时更新统计
            setTimeout(() => {
                this.updateStats();
                if (window.app.chartManager) {
                    window.app.chartManager.updateChart();
                }
            }, 100);
        } else {
            console.warn('主应用不可用，使用备用恢复方法');
            this.restoreTableStateAfterImport();
        }
    }
}
