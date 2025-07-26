// Firebase协作双向同步诊断脚本
console.log('🔍 开始Firebase协作同步诊断...');

// 检查当前用户状态
function checkCurrentUser() {
    const manager = window.goldPigApp?.firebaseCollaborationManager;
    if (!manager) {
        console.error('❌ FirebaseCollaborationManager未找到');
        return null;
    }
    
    console.log('👤 当前用户状态:');
    console.log('  - 用户ID:', manager.userId);
    console.log('  - 用户名:', manager.userName);
    console.log('  - 房间ID:', manager.roomId);
    console.log('  - 是否房主:', manager.isHost);
    console.log('  - 连接状态:', manager.isConnected);
    console.log('  - 初始化状态:', manager.isInitialized);
    
    return manager;
}

// 监听Firebase操作
function monitorFirebaseOperations(manager) {
    if (!manager || !manager.gameStateRef) {
        console.warn('⚠️ 无法监听Firebase操作：管理器或引用不可用');
        return;
    }
    
    console.log('👀 开始监听Firebase操作...');
    
    // 监听游戏状态变化
    const gameStateRef = manager.gameStateRef;
    const listener = manager.firebaseUtils.onValue(gameStateRef, (snapshot) => {
        const data = snapshot.val();
        console.log('🔥 Firebase游戏状态变化:', data);
        
        if (data && data.operations) {
            const operations = Object.entries(data.operations);
            console.log(`📝 共有 ${operations.length} 个操作记录:`);
            
            operations.forEach(([opId, op]) => {
                console.log(`  - ${opId}:`, {
                    type: op.type,
                    lineNumber: op.lineNumber,
                    newState: op.newState,
                    userId: op.userId,
                    userName: op.userName,
                    timestamp: op.timestamp
                });
            });
        }
    });
    
    return listener;
}

// 测试同步功能
function testSync(manager) {
    if (!manager) return;
    
    console.log('🧪 测试同步功能...');
    
    // 模拟点击一个格子
    const testLine = 1;
    const testKillTime = Date.now();
    
    console.log(`📤 模拟发送线路${testLine}的击杀操作...`);
    
    // 直接调用同步方法
    manager.syncLineStateChange(testLine, 'killed', testKillTime)
        .then(() => {
            console.log('✅ 同步操作发送成功');
        })
        .catch(error => {
            console.error('❌ 同步操作失败:', error);
        });
}

// 检查权限
function checkPermissions(manager) {
    if (!manager || !manager.database) {
        console.warn('⚠️ 无法检查权限：数据库不可用');
        return;
    }
    
    console.log('🔒 检查Firebase权限...');
    
    // 尝试读取房间数据
    const roomRef = manager.firebaseUtils.ref(manager.database, `rooms/${manager.roomId}`);
    manager.firebaseUtils.get(roomRef)
        .then(snapshot => {
            if (snapshot.exists()) {
                console.log('✅ 房间数据读取权限正常');
                const data = snapshot.val();
                console.log('📊 房间数据:', data);
            } else {
                console.warn('⚠️ 房间数据不存在');
            }
        })
        .catch(error => {
            console.error('❌ 房间数据读取失败:', error);
        });
    
    // 尝试写入测试数据
    const testRef = manager.firebaseUtils.ref(manager.database, `rooms/${manager.roomId}/test/${manager.userId}`);
    const testData = {
        message: 'permission test',
        timestamp: manager.firebaseUtils.serverTimestamp()
    };
    
    manager.firebaseUtils.set(testRef, testData)
        .then(() => {
            console.log('✅ 写入权限正常');
            // 清理测试数据
            return manager.firebaseUtils.remove(testRef);
        })
        .then(() => {
            console.log('✅ 删除权限正常');
        })
        .catch(error => {
            console.error('❌ 写入/删除权限失败:', error);
        });
}

// 主函数
function runDiagnostics() {
    console.log('🚀 开始运行Firebase协作同步诊断...');
    
    const manager = checkCurrentUser();
    if (!manager) return;
    
    if (!manager.roomId) {
        console.warn('⚠️ 当前未加入任何房间，无法进行同步测试');
        return;
    }
    
    // 检查权限
    checkPermissions(manager);
    
    // 监听操作
    const listener = monitorFirebaseOperations(manager);
    
    // 等待几秒后测试同步
    setTimeout(() => {
        testSync(manager);
    }, 2000);
    
    // 返回清理函数
    return () => {
        if (listener && typeof listener === 'function') {
            listener();
            console.log('🧹 监听器已清理');
        }
    };
}

// 导出到全局
window.firebaseSyncDiagnostics = {
    run: runDiagnostics,
    checkUser: checkCurrentUser,
    monitor: monitorFirebaseOperations,
    test: testSync,
    checkPermissions: checkPermissions
};

console.log('✅ Firebase协作同步诊断脚本已加载');
console.log('💡 使用 firebaseSyncDiagnostics.run() 运行完整诊断');
console.log('💡 使用 firebaseSyncDiagnostics.test() 测试同步功能');

// 自动运行一次
runDiagnostics();
