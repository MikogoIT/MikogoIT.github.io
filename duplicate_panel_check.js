// 检查重复悬浮面板的诊断脚本
console.log('🔍 开始检查重复悬浮面板...');

// 检查Firebase协作面板
const firebasePanels = document.querySelectorAll('#firebase-collaboration-panel');
console.log(`🔥 Firebase协作面板数量: ${firebasePanels.length}`);
if (firebasePanels.length > 1) {
    console.warn('⚠️ 发现重复的Firebase协作面板！');
    firebasePanels.forEach((panel, index) => {
        console.log(`面板 ${index + 1}:`, panel);
        console.log(`位置:`, panel.style.position, panel.style.top, panel.style.right);
        console.log(`显示状态:`, panel.style.display);
        console.log(`z-index:`, panel.style.zIndex);
    });
}

// 检查P2P协作模态框
const p2pModals = document.querySelectorAll('.collaboration-modal');
console.log(`👥 P2P协作模态框数量: ${p2pModals.length}`);
if (p2pModals.length > 1) {
    console.warn('⚠️ 发现重复的P2P协作模态框！');
    p2pModals.forEach((modal, index) => {
        console.log(`模态框 ${index + 1}:`, modal);
    });
}

// 检查所有position: fixed的元素（可能的悬浮面板）
const fixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const style = window.getComputedStyle(el);
    return style.position === 'fixed' && 
           (el.id.includes('collaboration') || 
            el.className.includes('collaboration') ||
            el.className.includes('firebase') ||
            el.className.includes('modal'));
});

console.log(`🎯 固定定位的协作相关元素数量: ${fixedElements.length}`);
fixedElements.forEach((el, index) => {
    console.log(`元素 ${index + 1}:`, el.tagName, el.id, el.className);
    const rect = el.getBoundingClientRect();
    console.log(`位置: top=${rect.top}, right=${window.innerWidth - rect.right}, 尺寸: ${rect.width}x${rect.height}`);
});

// 提供清理函数
window.cleanupDuplicatePanels = function() {
    console.log('🧹 清理重复面板...');
    
    // 清理重复的Firebase面板，只保留最后一个
    const firebasePanels = document.querySelectorAll('#firebase-collaboration-panel');
    for (let i = 0; i < firebasePanels.length - 1; i++) {
        console.log(`删除重复的Firebase面板 ${i + 1}`);
        firebasePanels[i].remove();
    }
    
    // 清理重复的P2P模态框，只保留最后一个
    const p2pModals = document.querySelectorAll('.collaboration-modal');
    for (let i = 0; i < p2pModals.length - 1; i++) {
        console.log(`删除重复的P2P模态框 ${i + 1}`);
        p2pModals[i].remove();
    }
    
    console.log('✅ 清理完成');
};

// 监听新的面板创建
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === 1) { // Element node
                if (node.id === 'firebase-collaboration-panel') {
                    console.log('📝 检测到新的Firebase协作面板被创建');
                    const allPanels = document.querySelectorAll('#firebase-collaboration-panel');
                    if (allPanels.length > 1) {
                        console.warn('⚠️ 现在有多个Firebase协作面板！');
                    }
                }
                if (node.className && node.className.includes('collaboration-modal')) {
                    console.log('📝 检测到新的P2P协作模态框被创建');
                    const allModals = document.querySelectorAll('.collaboration-modal');
                    if (allModals.length > 1) {
                        console.warn('⚠️ 现在有多个P2P协作模态框！');
                    }
                }
            }
        });
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('✅ 重复面板检查完成，已设置监听器');
console.log('💡 使用 cleanupDuplicatePanels() 函数可以清理重复面板');
