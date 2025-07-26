// 快速修复离开房间问题的脚本
// 在浏览器控制台中运行此脚本

console.log('🔧 快速修复离开房间问题...');

// 1. 强制显示悬浮协作面板（如果用户在房间中）
function showFloatingPanelFixed() {
    if (window.app && window.app.firebaseManager) {
        console.log('📱 强制显示悬浮协作面板...');
        window.app.firebaseManager.showFloatingCollaborationPanel();
        console.log('✅ 悬浮协作面板已显示');
    } else {
        console.log('❌ 无法访问FirebaseManager');
    }
}

// 2. 修复离开房间按钮
function fixLeaveButton() {
    console.log('🔧 修复离开房间按钮...');
    
    const leaveBtn = document.getElementById('leave-room-btn');
    if (leaveBtn) {
        console.log('✅ 找到离开房间按钮');
        
        // 移除所有现有的事件监听器
        const newBtn = leaveBtn.cloneNode(true);
        leaveBtn.parentNode.replaceChild(newBtn, leaveBtn);
        
        // 添加新的事件监听器
        newBtn.addEventListener('click', async (e) => {
            console.log('🚪 修复后的离开按钮被点击');
            e.preventDefault();
            e.stopPropagation();
            
            if (confirm('确定要离开房间吗？')) {
                console.log('✅ 用户确认离开');
                
                newBtn.disabled = true;
                newBtn.textContent = '离开中...';
                
                try {
                    if (window.app && window.app.firebaseManager) {
                        await window.app.firebaseManager.leaveRoom();
                        console.log('✅ 离开房间成功');
                        
                        // 隐藏面板
                        const panel = document.getElementById('firebase-collaboration-panel');
                        if (panel) panel.remove();
                        
                    } else {
                        throw new Error('无法访问FirebaseManager');
                    }
                } catch (error) {
                    console.error('❌ 离开房间失败:', error);
                    alert('离开房间失败: ' + error.message);
                    newBtn.disabled = false;
                    newBtn.textContent = '🚪 离开房间';
                }
            }
        });
        
        // 确保按钮样式正确
        newBtn.style.cssText = `
            background: #e74c3c !important;
            color: white !important;
            border: none !important;
            padding: 10px 15px !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: bold !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            width: 100% !important;
        `;
        
        console.log('✅ 离开按钮已修复');
    } else {
        console.log('❌ 未找到离开房间按钮');
    }
}

// 3. 应急离开房间方法
function emergencyLeaveRoom() {
    console.log('🚨 执行应急离开房间...');
    
    if (window.app && window.app.firebaseManager) {
        const fm = window.app.firebaseManager;
        
        try {
            // 强制清理本地状态
            console.log('🧹 清理本地状态...');
            
            if (fm.stopHeartbeat) fm.stopHeartbeat();
            if (fm.removeRoomListeners) fm.removeRoomListeners();
            
            fm.roomId = null;
            fm.isHost = false;
            fm.roomRef = null;
            fm.usersRef = null;
            fm.gameStateRef = null;
            
            // 隐藏房间信息框
            const roomInfo = document.getElementById('room-info');
            if (roomInfo) roomInfo.remove();
            
            // 清理本地存储
            localStorage.removeItem('firebase_collaboration_roomId');
            localStorage.removeItem('firebase_collaboration_isHost');
            
            console.log('✅ 应急离开完成');
            alert('应急离开完成！');
            
        } catch (error) {
            console.error('❌ 应急离开失败:', error);
            alert('应急离开失败: ' + error.message);
        }
    } else {
        console.log('❌ 无法访问FirebaseManager');
    }
}

// 4. 一键修复函数
function quickFix() {
    console.log('🚀 执行一键修复...');
    
    // 强制显示房间信息框
    showRoomInfoFixed();
    
    // 等待DOM更新后修复按钮
    setTimeout(() => {
        fixLeaveButton();
    }, 500);
    
    console.log('✅ 一键修复完成');
}

// 将函数暴露到全局
window.showRoomInfoFixed = showRoomInfoFixed;
window.fixLeaveButton = fixLeaveButton;
window.emergencyLeaveRoom = emergencyLeaveRoom;
window.quickFix = quickFix;

console.log('✅ 修复脚本加载完成！');
console.log('📖 可用命令:');
console.log('  quickFix() - 一键修复');
console.log('  showRoomInfoFixed() - 强制显示房间信息框');
console.log('  fixLeaveButton() - 修复离开按钮');
console.log('  emergencyLeaveRoom() - 应急离开房间');

// 自动执行一键修复
quickFix();
