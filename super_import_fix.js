// 简化的JSON导入状态修复工具
console.log('🚀 启动JSON导入状态修复工具...');

// 快速检查状态不匹配
function quickCheckStates() {
    console.log('⚡ 快速检查状态...');
    
    let mismatchCount = 0;
    let totalStates = 0;
    let details = [];
    
    for (let i = 1; i <= 400; i++) {
        const state = localStorage.getItem(`pigTimer_line_${i}_state`);
        if (state) {
            totalStates++;
            const cell = document.querySelector(`td[data-line="${i}"]`);
            
            if (cell && !cell.classList.contains(state)) {
                mismatchCount++;
                details.push({
                    line: i,
                    expected: state,
                    actual: Array.from(cell.classList).filter(cls => 
                        ['killed', 'killed-unknown', 'refreshed'].includes(cls)
                    )
                });
            }
        }
    }
    
    console.log(`⚡ 快速检查结果: ${totalStates}个状态中有${mismatchCount}个不匹配`);
    if (mismatchCount > 0) {
        console.log('不匹配详情:', details);
    }
    
    return { totalStates, mismatchCount, details };
}

// 超级强力修复 - 直接重建所有状态
function superForceFixStates() {
    console.log('💪 执行超级强力状态修复...');
    
    const currentTime = new Date().getTime();
    const testMode = window.app ? window.app.testMode : false;
    const timerDuration = testMode ? 10000 : (24 * 60 * 60 * 1000);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (let i = 1; i <= 400; i++) {
        const state = localStorage.getItem(`pigTimer_line_${i}_state`);
        const killTime = localStorage.getItem(`pigTimer_line_${i}_killTime`);
        const cell = document.querySelector(`td[data-line="${i}"]`);
        
        if (state && cell) {
            // 强制清除所有现有状态
            cell.classList.remove('killed', 'killed-unknown', 'refreshed');
            
            let finalState = state;
            
            // 检查killed状态是否过期
            if (state === 'killed' && killTime) {
                const killTimeNum = parseInt(killTime);
                const elapsed = currentTime - killTimeNum;
                
                if (elapsed >= timerDuration) {
                    // 过期，改为refreshed
                    finalState = 'refreshed';
                    localStorage.setItem(`pigTimer_line_${i}_state`, 'refreshed');
                    localStorage.removeItem(`pigTimer_line_${i}_killTime`);
                    console.log(`💪 线路${i}: killed(过期) -> refreshed`);
                }
            }
            
            // 应用最终状态
            cell.classList.add(finalState);
            
            // 更新提示文本
            const tooltip = cell.querySelector('.tooltip');
            if (tooltip) {
                if (finalState === 'killed') {
                    tooltip.textContent = '双击取消击杀状态';
                } else if (finalState === 'killed-unknown') {
                    tooltip.textContent = '双击取消击杀状态';
                } else if (finalState === 'refreshed') {
                    tooltip.textContent = '金猪已刷新，左键击杀开始倒计时，右键击杀但不知时间';
                }
            }
            
            // 处理计时器
            if (finalState === 'killed' && killTime && window.app && window.app.timerManager) {
                const killTimeNum = parseInt(killTime);
                const elapsed = currentTime - killTimeNum;
                const remaining = timerDuration - elapsed;
                
                if (remaining > 0) {
                    // 确保定时器元素存在
                    let timerElement = document.getElementById(`timer-${i}`);
                    if (!timerElement) {
                        timerElement = document.createElement('div');
                        timerElement.id = `timer-${i}`;
                        timerElement.className = 'timer-display';
                        cell.appendChild(timerElement);
                    }
                    
                    // 启动计时器
                    window.app.timerManager.startTimer(i, killTimeNum, remaining, cell, 
                        window.app.onTimerComplete.bind(window.app));
                    
                    console.log(`💪 线路${i}: 恢复计时器，剩余${Math.floor(remaining/1000)}秒`);
                }
            } else {
                // 清除计时器显示
                const timerDisplay = document.getElementById(`timer-${i}`);
                if (timerDisplay) {
                    timerDisplay.textContent = '';
                }
            }
            
            fixedCount++;
        } else if (state && !cell) {
            console.error(`💪 线路${i}: localStorage有状态但DOM元素不存在`);
            skippedCount++;
        }
    }
    
    console.log(`💪 超级强力修复完成: 处理${fixedCount}个状态，跳过${skippedCount}个`);
    
    // 立即更新统计
    if (window.app && window.app.statsManager) {
        window.app.statsManager.updateStats();
        console.log('💪 统计数据已更新');
    }
    
    return { fixedCount, skippedCount };
}

// 完整的导入后修复流程
function completeImportFix() {
    console.log('🎯 执行完整的导入后修复流程...');
    
    // 1. 快速检查
    const checkResult = quickCheckStates();
    
    if (checkResult.mismatchCount > 0) {
        console.log(`🎯 发现${checkResult.mismatchCount}个状态不匹配，执行修复...`);
        
        // 2. 超级强力修复
        const fixResult = superForceFixStates();
        
        // 3. 再次检查
        setTimeout(() => {
            const recheckResult = quickCheckStates();
            
            if (recheckResult.mismatchCount === 0) {
                console.log('🎉 修复成功！所有状态现在都正确匹配');
            } else {
                console.warn(`⚠️ 仍有${recheckResult.mismatchCount}个状态不匹配，需要进一步调查`);
            }
            
            // 4. 强制重新验证
            if (window.app && window.app.statsManager) {
                setTimeout(() => {
                    window.app.statsManager.verifyStateRestoration();
                }, 200);
            }
        }, 300);
    } else {
        console.log('🎉 状态检查通过，无需修复');
    }
}

// 提供全局函数
window.quickCheckStates = quickCheckStates;
window.superForceFixStates = superForceFixStates;
window.completeImportFix = completeImportFix;

// 自动执行一次完整修复
setTimeout(() => {
    completeImportFix();
}, 100);

console.log('✅ JSON导入状态修复工具已就绪');
console.log('💡 可用命令:');
console.log('- quickCheckStates() - 快速检查状态');
console.log('- superForceFixStates() - 超级强力修复');
console.log('- completeImportFix() - 完整修复流程');
