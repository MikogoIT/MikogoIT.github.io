// 离开房间错误诊断脚本
// 运行此脚本来诊断离开房间时可能遇到的问题

console.log('🔍 开始诊断离开房间问题...');

// 1. 检查 FirebaseCollaborationManager 实例
function checkFirebaseManager() {
    console.log('1. 检查 FirebaseCollaborationManager 实例...');
    
    // 检查全局 app 对象
    if (window.app && window.app.firebaseManager) {
        console.log('✅ 找到 firebaseManager 实例');
        const fm = window.app.firebaseManager;
        
        console.log('FirebaseManager 状态:', {
            isInitialized: fm.isInitialized,
            isConnected: fm.isConnected,
            roomId: fm.roomId,
            userId: fm.userId,
            userName: fm.userName,
            isHost: fm.isHost
        });
        
        return fm;
    } else {
        console.log('❌ 未找到 firebaseManager 实例');
        return null;
    }
}

// 2. 检查离开房间按钮
function checkLeaveButton() {
    console.log('2. 检查离开房间按钮...');
    
    const leaveBtn = document.getElementById('leave-room-btn');
    if (leaveBtn) {
        console.log('✅ 找到离开房间按钮');
        
        // 检查按钮状态
        const rect = leaveBtn.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(leaveBtn);
        
        console.log('按钮状态:', {
            visible: rect.width > 0 && rect.height > 0,
            enabled: !leaveBtn.disabled,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            pointerEvents: computedStyle.pointerEvents,
            opacity: computedStyle.opacity
        });
        
        return leaveBtn;
    } else {
        console.log('❌ 未找到离开房间按钮');
        return null;
    }
}

// 3. 测试 leaveRoom 方法
async function testLeaveRoom(firebaseManager) {
    console.log('3. 测试 leaveRoom 方法...');
    
    if (!firebaseManager) {
        console.log('❌ 没有 firebaseManager 实例，无法测试');
        return;
    }
    
    try {
        console.log('🧪 调用 leaveRoom 方法...');
        await firebaseManager.leaveRoom();
        console.log('✅ leaveRoom 方法执行完成');
    } catch (error) {
        console.error('❌ leaveRoom 方法执行失败:', error);
        console.error('错误详情:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }
}

// 4. 检查 Firebase 连接状态
function checkFirebaseConnection() {
    console.log('4. 检查 Firebase 连接状态...');
    
    if (window.firebaseApp && window.firebaseDatabase) {
        console.log('✅ Firebase 已初始化');
        console.log('Firebase 对象:', {
            app: !!window.firebaseApp,
            database: !!window.firebaseDatabase,
            auth: !!window.firebaseAuth,
            utils: !!window.firebaseUtils
        });
        return true;
    } else {
        console.log('❌ Firebase 未正确初始化');
        return false;
    }
}

// 5. 检查网络连接
function checkNetworkConnection() {
    console.log('5. 检查网络连接...');
    
    if (navigator.onLine) {
        console.log('✅ 网络连接正常');
        return true;
    } else {
        console.log('❌ 网络连接断开');
        return false;
    }
}

// 6. 监听错误事件
function setupErrorListeners() {
    console.log('6. 设置错误监听器...');
    
    window.addEventListener('error', (event) => {
        console.error('🚨 JavaScript 错误:', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('🚨 未处理的 Promise 拒绝:', {
            reason: event.reason,
            promise: event.promise
        });
    });
    
    console.log('✅ 错误监听器已设置');
}

// 运行所有诊断
async function runDiagnostics() {
    console.log('🚀 开始运行离开房间诊断...');
    
    // 设置错误监听器
    setupErrorListeners();
    
    // 检查各项组件
    const firebaseManager = checkFirebaseManager();
    const leaveButton = checkLeaveButton();
    const firebaseConnected = checkFirebaseConnection();
    const networkConnected = checkNetworkConnection();
    
    // 如果所有检查都通过，测试 leaveRoom 方法
    if (firebaseManager && firebaseConnected && networkConnected) {
        console.log('✅ 所有检查通过，测试 leaveRoom 方法...');
        await testLeaveRoom(firebaseManager);
    } else {
        console.log('❌ 某些检查未通过，跳过 leaveRoom 测试');
    }
    
    console.log('🏁 诊断完成');
}

// 提供手动触发按钮点击的方法
window.triggerLeaveRoom = function() {
    console.log('🖱️ 手动触发离开房间...');
    
    const leaveBtn = document.getElementById('leave-room-btn');
    if (leaveBtn) {
        // 模拟真实的用户点击
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 0,
            buttons: 1,
            clientX: leaveBtn.getBoundingClientRect().left + leaveBtn.offsetWidth / 2,
            clientY: leaveBtn.getBoundingClientRect().top + leaveBtn.offsetHeight / 2
        });
        
        leaveBtn.dispatchEvent(clickEvent);
        console.log('✅ 点击事件已触发');
    } else {
        console.log('❌ 未找到离开房间按钮');
    }
};

// 自动运行诊断
runDiagnostics();

console.log('💡 提示：如果问题仍然存在，可以手动调用 triggerLeaveRoom() 来测试按钮点击');
