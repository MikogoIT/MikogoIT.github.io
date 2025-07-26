// localStorage键名修复脚本
// 检测和修复localStorage中的键名不一致问题

function fixLocalStorageKeys() {
    console.log('🔧 开始修复localStorage键名...');
    
    let migratedStates = 0;
    let migratedTimes = 0;
    let foundOldKeys = [];
    let foundNewKeys = [];
    
    // 扫描所有localStorage键
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pigTimer_')) {
            if (key.includes('_state') || key.includes('_killTime')) {
                foundOldKeys.push(key);
            } else if (key.match(/pigTimer_line-\d+/) || key.match(/pigTimer_killTime-\d+/)) {
                foundNewKeys.push(key);
            }
        }
    }
    
    console.log(`发现旧格式键: ${foundOldKeys.length}个`, foundOldKeys);
    console.log(`发现新格式键: ${foundNewKeys.length}个`, foundNewKeys);
    
    // 迁移旧格式到新格式
    for (let i = 1; i <= 400; i++) {
        // 迁移状态
        const oldStateKey = `pigTimer_line_${i}_state`;
        const newStateKey = `pigTimer_line-${i}`;
        const stateValue = localStorage.getItem(oldStateKey);
        
        if (stateValue) {
            console.log(`迁移线路${i}状态: ${stateValue}`);
            localStorage.setItem(newStateKey, stateValue);
            localStorage.removeItem(oldStateKey);
            migratedStates++;
        }
        
        // 迁移击杀时间
        const oldTimeKey = `pigTimer_line_${i}_killTime`;
        const newTimeKey = `pigTimer_killTime-${i}`;
        const timeValue = localStorage.getItem(oldTimeKey);
        
        if (timeValue) {
            console.log(`迁移线路${i}击杀时间: ${new Date(parseInt(timeValue)).toLocaleString()}`);
            localStorage.setItem(newTimeKey, timeValue);
            localStorage.removeItem(oldTimeKey);
            migratedTimes++;
        }
    }
    
    console.log(`✅ 键名修复完成: 迁移${migratedStates}个状态, ${migratedTimes}个击杀时间`);
    
    // 验证修复结果
    setTimeout(() => {
        console.log('🔍 验证修复结果...');
        let newStates = 0;
        let newTimes = 0;
        let remainingOldKeys = 0;
        
        for (let i = 1; i <= 400; i++) {
            if (localStorage.getItem(`pigTimer_line-${i}`)) newStates++;
            if (localStorage.getItem(`pigTimer_killTime-${i}`)) newTimes++;
            if (localStorage.getItem(`pigTimer_line_${i}_state`) || localStorage.getItem(`pigTimer_line_${i}_killTime`)) {
                remainingOldKeys++;
            }
        }
        
        console.log(`验证结果: ${newStates}个新格式状态, ${newTimes}个新格式时间, ${remainingOldKeys}个残留旧键`);
        
        if (remainingOldKeys === 0) {
            console.log('✅ 所有键名已成功迁移到新格式');
        } else {
            console.warn(`⚠️ 还有${remainingOldKeys}个旧格式键需要处理`);
        }
        
        return {
            migratedStates,
            migratedTimes,
            newStates,
            newTimes,
            remainingOldKeys
        };
    }, 100);
}

// 诊断localStorage状态
function diagnoseLocalStorage() {
    console.log('🔍 诊断localStorage状态...');
    
    const analysis = {
        oldFormatStates: 0,
        oldFormatTimes: 0,
        newFormatStates: 0,
        newFormatTimes: 0,
        inconsistentLines: [],
        allKeys: []
    };
    
    // 收集所有相关键
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pigTimer_')) {
            analysis.allKeys.push(key);
        }
    }
    
    // 分析每条线路
    for (let i = 1; i <= 400; i++) {
        const oldState = localStorage.getItem(`pigTimer_line_${i}_state`);
        const oldTime = localStorage.getItem(`pigTimer_line_${i}_killTime`);
        const newState = localStorage.getItem(`pigTimer_line-${i}`);
        const newTime = localStorage.getItem(`pigTimer_killTime-${i}`);
        
        if (oldState) analysis.oldFormatStates++;
        if (oldTime) analysis.oldFormatTimes++;
        if (newState) analysis.newFormatStates++;
        if (newTime) analysis.newFormatTimes++;
        
        // 检查是否同时存在新旧格式
        if ((oldState && newState) || (oldTime && newTime)) {
            analysis.inconsistentLines.push({
                line: i,
                oldState,
                newState,
                oldTime,
                newTime
            });
        }
    }
    
    console.log('📊 localStorage分析结果:');
    console.log(`- 旧格式状态: ${analysis.oldFormatStates}个`);
    console.log(`- 旧格式时间: ${analysis.oldFormatTimes}个`);
    console.log(`- 新格式状态: ${analysis.newFormatStates}个`);
    console.log(`- 新格式时间: ${analysis.newFormatTimes}个`);
    console.log(`- 格式不一致线路: ${analysis.inconsistentLines.length}个`);
    console.log(`- 所有pigTimer键: ${analysis.allKeys.length}个`);
    
    if (analysis.inconsistentLines.length > 0) {
        console.warn('⚠️ 发现格式不一致的线路:', analysis.inconsistentLines);
    }
    
    return analysis;
}

// 强制统一为新格式
function forceUnifyToNewFormat() {
    console.log('🔄 强制统一为新格式...');
    
    let unifiedStates = 0;
    let unifiedTimes = 0;
    
    for (let i = 1; i <= 400; i++) {
        const oldState = localStorage.getItem(`pigTimer_line_${i}_state`);
        const oldTime = localStorage.getItem(`pigTimer_line_${i}_killTime`);
        const newState = localStorage.getItem(`pigTimer_line-${i}`);
        const newTime = localStorage.getItem(`pigTimer_killTime-${i}`);
        
        // 如果存在新格式，优先使用新格式，否则使用旧格式
        let finalState = newState || oldState;
        let finalTime = newTime || oldTime;
        
        // 设置新格式
        if (finalState) {
            localStorage.setItem(`pigTimer_line-${i}`, finalState);
            unifiedStates++;
        }
        
        if (finalTime) {
            localStorage.setItem(`pigTimer_killTime-${i}`, finalTime);
            unifiedTimes++;
        }
        
        // 清除旧格式
        localStorage.removeItem(`pigTimer_line_${i}_state`);
        localStorage.removeItem(`pigTimer_line_${i}_killTime`);
    }
    
    console.log(`✅ 格式统一完成: ${unifiedStates}个状态, ${unifiedTimes}个时间`);
    
    return { unifiedStates, unifiedTimes };
}

// 导出函数到全局作用域
window.fixLocalStorageKeys = fixLocalStorageKeys;
window.diagnoseLocalStorage = diagnoseLocalStorage;
window.forceUnifyToNewFormat = forceUnifyToNewFormat;

// 自动运行诊断
console.log('📋 localStorage键名修复工具已加载');
console.log('可用命令:');
console.log('- diagnoseLocalStorage() - 诊断当前状态');
console.log('- fixLocalStorageKeys() - 修复键名不一致');
console.log('- forceUnifyToNewFormat() - 强制统一为新格式');

// 立即运行诊断和自动修复
diagnoseLocalStorage();

// 自动修复键名不一致问题
setTimeout(() => {
    const analysis = diagnoseLocalStorage();
    if (analysis.oldFormatStates > 0 || analysis.oldFormatTimes > 0) {
        console.log('🔧 检测到旧格式键名，自动开始修复...');
        fixLocalStorageKeys();
        console.log('✅ localStorage键名自动修复完成');
    }
}, 100);
