// 存储管理器 - 处理本地存储操作
export class StorageManager {
    constructor() {
        this.prefix = 'pigTimer_'; // 存储前缀，避免冲突
    }

    // 保存线路状态
    setLineState(lineNumber, state) {
        const key = `${this.prefix}line-${lineNumber}`;
        localStorage.setItem(key, state);
    }

    // 获取线路状态
    getLineState(lineNumber) {
        const key = `${this.prefix}line-${lineNumber}`;
        return localStorage.getItem(key);
    }

    // 删除线路状态
    removeLineState(lineNumber) {
        const key = `${this.prefix}line-${lineNumber}`;
        localStorage.removeItem(key);
    }

    // 保存击杀时间
    setKillTime(lineNumber, timestamp) {
        const key = `${this.prefix}killTime-${lineNumber}`;
        localStorage.setItem(key, timestamp.toString());
    }

    // 获取击杀时间
    getKillTime(lineNumber) {
        const key = `${this.prefix}killTime-${lineNumber}`;
        const time = localStorage.getItem(key);
        return time ? parseInt(time) : null;
    }

    // 删除击杀时间
    removeKillTime(lineNumber) {
        const key = `${this.prefix}killTime-${lineNumber}`;
        localStorage.removeItem(key);
    }

    // 保存击杀事件列表
    setKillEvents(events) {
        const key = `${this.prefix}killEvents`;
        localStorage.setItem(key, JSON.stringify(events));
    }

    // 获取击杀事件列表
    getKillEvents() {
        const key = `${this.prefix}killEvents`;
        const events = localStorage.getItem(key);
        return events ? JSON.parse(events) : [];
    }

    // 删除击杀事件列表
    removeKillEvents() {
        const key = `${this.prefix}killEvents`;
        localStorage.removeItem(key);
    }

    // 保存用户备注
    setUserNotes(notes) {
        const key = `${this.prefix}user-notes`;
        localStorage.setItem(key, notes);
    }

    // 获取用户备注
    getUserNotes() {
        const key = `${this.prefix}user-notes`;
        return localStorage.getItem(key) || '';
    }

    // 保存测试模式状态
    setTestMode(enabled) {
        const key = `${this.prefix}testMode`;
        localStorage.setItem(key, enabled.toString());
    }

    // 获取测试模式状态
    getTestMode() {
        const key = `${this.prefix}testMode`;
        const mode = localStorage.getItem(key);
        return mode === 'true';
    }

    // 保存应用设置
    setSettings(settings) {
        const key = `${this.prefix}settings`;
        localStorage.setItem(key, JSON.stringify(settings));
    }

    // 获取应用设置
    getSettings() {
        const key = `${this.prefix}settings`;
        const settings = localStorage.getItem(key);
        return settings ? JSON.parse(settings) : this.getDefaultSettings();
    }

    // 获取默认设置
    getDefaultSettings() {
        return {
            theme: 'default',
            soundEnabled: true,
            vibrationEnabled: true,
            autoSave: true,
            chartType: 'daily',
            language: 'zh-CN'
        };
    }

    // 重置所有线路状态
    resetAllLineStates() {
        for (let i = 1; i <= 400; i++) {
            this.removeLineState(i);
            this.removeKillTime(i);
        }
    }

    // 重置所有数据
    resetAllData() {
        this.resetAllLineStates();
        this.removeKillEvents();
        // 保留用户备注和设置
    }

    // 导出所有数据
    exportData() {
        const data = {
            version: '1.0',
            timestamp: Date.now(),
            lineStates: {},
            killTimes: {},
            killEvents: this.getKillEvents(),
            userNotes: this.getUserNotes(),
            settings: this.getSettings()
        };

        // 收集所有线路状态和击杀时间
        for (let i = 1; i <= 400; i++) {
            const state = this.getLineState(i);
            const killTime = this.getKillTime(i);
            
            if (state) {
                data.lineStates[i] = state;
            }
            if (killTime) {
                data.killTimes[i] = killTime;
            }
        }

        return data;
    }

    // 导入数据
    importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('无效的数据格式');
            }

            // 清空现有数据
            this.resetAllData();

            // 导入线路状态
            if (data.lineStates) {
                Object.entries(data.lineStates).forEach(([lineNumber, state]) => {
                    this.setLineState(parseInt(lineNumber), state);
                });
            }

            // 导入击杀时间
            if (data.killTimes) {
                Object.entries(data.killTimes).forEach(([lineNumber, killTime]) => {
                    this.setKillTime(parseInt(lineNumber), parseInt(killTime));
                });
            }

            // 导入击杀事件
            if (data.killEvents && Array.isArray(data.killEvents)) {
                this.setKillEvents(data.killEvents);
            }

            // 导入用户备注
            if (data.userNotes) {
                this.setUserNotes(data.userNotes);
            }

            // 导入设置
            if (data.settings) {
                this.setSettings(data.settings);
            }

            return true;
        } catch (error) {
            console.error('导入数据失败:', error);
            return false;
        }
    }

    // 获取存储使用情况
    getStorageUsage() {
        let totalSize = 0;
        let itemCount = 0;

        for (let key in localStorage) {
            if (key.startsWith(this.prefix)) {
                totalSize += localStorage[key].length;
                itemCount++;
            }
        }

        return {
            totalSize: totalSize,
            itemCount: itemCount,
            formattedSize: this.formatBytes(totalSize)
        };
    }

    // 格式化字节大小
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 清理过期数据
    cleanupOldData(daysToKeep = 30) {
        const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        const killEvents = this.getKillEvents();
        
        // 过滤掉过期的击杀事件
        const filteredEvents = killEvents.filter(event => event.timestamp > cutoffTime);
        
        if (filteredEvents.length !== killEvents.length) {
            this.setKillEvents(filteredEvents);
            console.log(`清理了 ${killEvents.length - filteredEvents.length} 条过期击杀记录`);
        }
    }

    // 检查存储空间
    checkStorageSpace() {
        try {
            const testKey = `${this.prefix}test`;
            const testData = 'x'.repeat(1024); // 1KB测试数据
            
            localStorage.setItem(testKey, testData);
            localStorage.removeItem(testKey);
            
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.warn('本地存储空间不足');
                return false;
            }
            throw e;
        }
    }

    // 备份数据到文件
    downloadBackup() {
        const data = this.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pig_timer_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    // 从文件恢复备份
    uploadBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const success = this.importData(data);
                    resolve(success);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }
}

// 导出存储管理器
export { StorageManager };
