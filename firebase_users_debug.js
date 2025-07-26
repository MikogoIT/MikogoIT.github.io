// Firebase房间用户显示问题诊断脚本
console.log('🔍 开始诊断Firebase房间用户显示问题...');

// 检查当前Firebase连接状态
if (window.goldPigApp && window.goldPigApp.firebaseCollaborationManager) {
    const manager = window.goldPigApp.firebaseCollaborationManager;
    
    console.log('🔥 Firebase协作管理器状态:');
    console.log('- 已初始化:', manager.isInitialized);
    console.log('- 已连接:', manager.isConnected);
    console.log('- 房间ID:', manager.roomId);
    console.log('- 用户ID:', manager.userId);
    console.log('- 用户名:', manager.userName);
    console.log('- 是否房主:', manager.isHost);
    
    if (manager.roomId && manager.database) {
        console.log('🔥 检查Firebase中的房间数据...');
        
        // 检查用户数据
        const usersRef = manager.firebaseUtils.ref(manager.database, `rooms/${manager.roomId}/users`);
        manager.firebaseUtils.get(usersRef).then(snapshot => {
            const users = snapshot.val();
            console.log('🔥 Firebase中的用户数据:', users);
            
            if (users) {
                const userCount = Object.keys(users).length;
                console.log('🔥 用户总数:', userCount);
                
                Object.entries(users).forEach(([userId, userData]) => {
                    console.log(`🔥 用户 ${userId}:`, {
                        userName: userData.userName,
                        userColor: userData.userColor,
                        isHost: userData.isHost,
                        isOnline: userData.isOnline,
                        lastSeen: userData.lastSeen ? new Date(userData.lastSeen) : 'N/A'
                    });
                });
            } else {
                console.log('🔥 Firebase中没有用户数据');
            }
        }).catch(error => {
            console.error('🔥 读取Firebase用户数据失败:', error);
        });
        
        // 检查监听器状态
        console.log('🔥 当前监听器:', manager.listeners);
        
        // 手动触发用户列表更新
        window.manualUpdateUsersList = function() {
            console.log('🔧 手动触发用户列表更新...');
            const usersRef = manager.firebaseUtils.ref(manager.database, `rooms/${manager.roomId}/users`);
            manager.firebaseUtils.get(usersRef).then(snapshot => {
                const users = snapshot.val();
                console.log('🔧 手动获取的用户数据:', users);
                manager.handleUsersChange(users);
            });
        };
        
        // 手动测试添加虚拟用户
        window.addTestUser = function() {
            console.log('🔧 添加测试用户...');
            const testUserId = 'test_' + Date.now();
            const testUserRef = manager.firebaseUtils.ref(manager.database, `rooms/${manager.roomId}/users/${testUserId}`);
            const testUserData = {
                userName: '测试用户',
                userColor: '#ff0000',
                isHost: false,
                isOnline: true,
                lastSeen: manager.firebaseUtils.serverTimestamp()
            };
            
            manager.firebaseUtils.set(testUserRef, testUserData).then(() => {
                console.log('✅ 测试用户已添加');
            }).catch(error => {
                console.error('❌ 添加测试用户失败:', error);
            });
        };
        
        // 检查数据库权限
        window.checkDatabasePermissions = function() {
            console.log('🔧 检查数据库权限...');
            const roomRef = manager.firebaseUtils.ref(manager.database, `rooms/${manager.roomId}`);
            manager.firebaseUtils.get(roomRef).then(snapshot => {
                console.log('✅ 房间数据读取成功，权限正常');
                console.log('房间完整数据:', snapshot.val());
            }).catch(error => {
                console.error('❌ 房间数据读取失败，可能权限问题:', error);
            });
        };
        
    } else {
        console.log('❌ 没有房间ID或数据库连接');
    }
    
} else {
    console.log('❌ Firebase协作管理器未初始化');
}

// 检查DOM中的用户列表
const panel = document.getElementById('firebase-collaboration-panel');
if (panel) {
    const usersList = panel.querySelector('#users-list');
    const connectionCount = panel.querySelector('#connection-count');
    
    console.log('📱 DOM状态:');
    console.log('- 协作面板存在:', !!panel);
    console.log('- 用户列表容器存在:', !!usersList);
    console.log('- 连接数容器存在:', !!connectionCount);
    
    if (usersList) {
        console.log('- 用户列表HTML:', usersList.innerHTML);
    }
    if (connectionCount) {
        console.log('- 连接数显示:', connectionCount.textContent);
    }
} else {
    console.log('📱 协作面板不存在');
}

console.log('✅ 诊断完成');
console.log('💡 可用测试命令:');
console.log('- manualUpdateUsersList() - 手动更新用户列表');
console.log('- addTestUser() - 添加测试用户');
console.log('- checkDatabasePermissions() - 检查数据库权限');
