// 双向同步测试脚本
console.log('🧪 加载双向同步测试脚本...');

function testBidirectionalSync() {
    const manager = window.goldPigApp?.firebaseCollaborationManager;
    
    if (!manager) {
        console.error('❌ FirebaseCollaborationManager未找到');
        return;
    }
    
    if (!manager.roomId) {
        console.warn('⚠️ 当前未加入任何房间');
        return;
    }
    
    console.log('🚀 开始双向同步测试...');
    console.log('👤 当前用户信息:');
    console.log('  - 用户ID:', manager.userId);
    console.log('  - 用户名:', manager.userName);
    console.log('  - 是否房主:', manager.isHost);
    console.log('  - 房间ID:', manager.roomId);
    
    // 监听Firebase数据变化
    let changeCount = 0;
    const originalHandleGameStateChange = manager.handleGameStateChange.bind(manager);
    
    manager.handleGameStateChange = function(gameState) {
        changeCount++;
        console.log(`📥 第${changeCount}次接收到游戏状态变化:`, gameState);
        
        if (gameState && gameState.lineStates) {
            Object.entries(gameState.lineStates).forEach(([line, data]) => {
                console.log(`  线路${line}: 状态=${data.state}, 用户=${data.userName}(${data.userId}), 是否是我=${data.userId === this.userId}`);
            });
        }
        
        // 调用原始方法
        return originalHandleGameStateChange(gameState);
    };
    
    // 测试发送操作
    let testLineNumber = 1;
    
    function sendTestOperation() {
        const killTime = Date.now();
        console.log(`📤 发送测试操作: 线路${testLineNumber}, 用户${manager.userName}(${manager.isHost ? '房主' : '成员'})`);
        
        manager.syncLineStateChange(testLineNumber, 'killed', killTime)
            .then(() => {
                console.log('✅ 测试操作发送成功');
            })
            .catch(error => {
                console.error('❌ 测试操作发送失败:', error);
            });
        
        testLineNumber++;
        if (testLineNumber > 5) testLineNumber = 1; // 循环使用1-5号线路
    }
    
    // 每5秒发送一次测试操作
    const testInterval = setInterval(sendTestOperation, 5000);
    
    // 立即发送一次
    sendTestOperation();
    
    console.log('🏃 测试已启动，每5秒发送一次操作');
    console.log('👀 监听所有游戏状态变化');
    
    // 返回停止函数
    return () => {
        clearInterval(testInterval);
        manager.handleGameStateChange = originalHandleGameStateChange;
        console.log('🛑 双向同步测试已停止');
    };
}

// 快速测试函数
function quickSyncTest() {
    const manager = window.goldPigApp?.firebaseCollaborationManager;
    
    if (!manager || !manager.roomId) {
        console.warn('⚠️ 无法进行测试：管理器或房间不可用');
        return;
    }
    
    const testLine = Math.floor(Math.random() * 10) + 1;
    const killTime = Date.now();
    
    console.log(`🎯 快速测试: 线路${testLine}, 用户${manager.userName}`);
    
    return manager.syncLineStateChange(testLine, 'killed', killTime);
}

// 检查当前同步状态
function checkSyncStatus() {
    const manager = window.goldPigApp?.firebaseCollaborationManager;
    
    if (!manager) {
        console.error('❌ FirebaseCollaborationManager未找到');
        return;
    }
    
    console.log('🔍 当前同步状态检查:');
    console.log('  - 初始化状态:', manager.isInitialized);
    console.log('  - 连接状态:', manager.isConnected);
    console.log('  - 房间ID:', manager.roomId);
    console.log('  - 是否房主:', manager.isHost);
    console.log('  - 用户ID:', manager.userId);
    console.log('  - 用户名:', manager.userName);
    console.log('  - 监听器数量:', manager.listeners.size);
    console.log('  - 游戏状态引用:', !!manager.gameStateRef);
    
    if (manager.gameStateRef) {
        // 获取当前Firebase数据
        manager.firebaseUtils.get(manager.gameStateRef)
            .then(snapshot => {
                const data = snapshot.val();
                console.log('  - Firebase游戏状态:', data);
                
                if (data && data.lineStates) {
                    const lineCount = Object.keys(data.lineStates).length;
                    console.log(`  - Firebase中共有${lineCount}个线路状态`);
                }
            })
            .catch(error => {
                console.error('  - 获取Firebase数据失败:', error);
            });
    }
}

// 导出到全局
window.syncTest = {
    bidirectional: testBidirectionalSync,
    quick: quickSyncTest,
    status: checkSyncStatus
};

console.log('✅ 双向同步测试脚本已加载');
console.log('💡 使用 syncTest.bidirectional() 开始持续测试');
console.log('💡 使用 syncTest.quick() 进行快速测试');
console.log('💡 使用 syncTest.status() 检查当前状态');

// 自动检查状态
checkSyncStatus();
