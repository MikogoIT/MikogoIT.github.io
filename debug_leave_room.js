// 离开房间按钮调试脚本
// 在浏览器控制台中运行此脚本来调试离开房间按钮

console.log('🔍 开始调试离开房间按钮...');

// 1. 检查按钮是否存在
const leaveBtn = document.getElementById('leave-room-btn');
console.log('1. 按钮存在性检查:', !!leaveBtn);

if (leaveBtn) {
    // 2. 检查按钮属性
    console.log('2. 按钮属性:', {
        id: leaveBtn.id,
        className: leaveBtn.className,
        tagName: leaveBtn.tagName,
        disabled: leaveBtn.disabled,
        style: leaveBtn.style.cssText,
        offsetParent: !!leaveBtn.offsetParent,
        isConnected: leaveBtn.isConnected,
        parentElement: !!leaveBtn.parentElement
    });
    
    // 3. 检查按钮位置和大小
    const rect = leaveBtn.getBoundingClientRect();
    console.log('3. 按钮位置和大小:', {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
    });
    
    // 4. 检查CSS样式
    const computedStyle = window.getComputedStyle(leaveBtn);
    console.log('4. 计算样式:', {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        pointerEvents: computedStyle.pointerEvents,
        cursor: computedStyle.cursor,
        zIndex: computedStyle.zIndex
    });
    
    // 5. 检查事件监听器
    console.log('5. 事件监听器测试:');
    
    // 添加临时测试监听器
    const testListener = (e) => {
        console.log('✅ 测试监听器被触发!', e.type);
    };
    
    leaveBtn.addEventListener('click', testListener);
    leaveBtn.addEventListener('mousedown', testListener);
    leaveBtn.addEventListener('mouseup', testListener);
    
    // 6. 手动触发点击事件
    console.log('6. 手动触发点击事件...');
    leaveBtn.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
    }));
    
    // 清理测试监听器
    setTimeout(() => {
        leaveBtn.removeEventListener('click', testListener);
        leaveBtn.removeEventListener('mousedown', testListener);
        leaveBtn.removeEventListener('mouseup', testListener);
        console.log('🧹 清理测试监听器');
    }, 1000);
    
} else {
    console.log('❌ 离开房间按钮不存在');
    
    // 检查房间信息组件
    const roomInfo = document.getElementById('room-info');
    console.log('房间信息组件存在:', !!roomInfo);
    
    if (roomInfo) {
        console.log('房间信息组件内容:', roomInfo.innerHTML);
    }
}

// 7. 检查全局函数
console.log('7. 全局函数检查:', {
    leaveFirebaseRoom: typeof window.leaveFirebaseRoom,
    debugLeaveRoom: typeof window.debugLeaveRoom,
    globalLeaveRoom: typeof window.globalLeaveRoom
});

// 8. 提供手动测试方法
window.testLeaveRoomManual = () => {
    console.log('🧪 手动测试离开房间...');
    
    if (window.globalLeaveRoom) {
        window.globalLeaveRoom();
    } else if (window.leaveFirebaseRoom) {
        window.leaveFirebaseRoom();
    } else if (window.debugLeaveRoom) {
        window.debugLeaveRoom();
    } else {
        console.error('❌ 没有找到可用的离开房间方法');
    }
};

console.log('🎯 调试完成! 可以使用 testLeaveRoomManual() 手动测试离开房间');
