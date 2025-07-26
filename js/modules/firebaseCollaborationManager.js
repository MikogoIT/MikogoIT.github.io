// Firebase多人协作管理器
export class FirebaseCollaborationManager {
    constructor(storageManager, uiManager, statsManager) {
        console.log('FirebaseCollaborationManager构造函数开始');
        
        this.storageManager = storageManager;
        this.uiManager = uiManager;
        this.statsManager = statsManager;
        
        // Firebase配置 - 你的真实Firebase项目配置
        this.firebaseConfig = {
            apiKey: "AIzaSyBgbodFry-hFl_tiWK9CAYzZ_4FFizc3kE",
            authDomain: "pig-timer-collaboration.firebaseapp.com",
            databaseURL: "https://pig-timer-collaboration-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "pig-timer-collaboration",
            storageBucket: "pig-timer-collaboration.firebasestorage.app",
            messagingSenderId: "629352460916",
            appId: "1:629352460916:web:248d4051b64d8cb4e51721",
            measurementId: "G-5RMRLLTTRP"
        };
        
        // 状态变量
        this.isInitialized = false;
        this.isConnected = false;
        this.userId = null;
        this.userName = null;
        this.userColor = null;
        this.roomId = null;
        this.isHost = false;
        this.roomRef = null;
        this.usersRef = null;
        this.gameStateRef = null;
        
        // Firebase实例
        this.app = null;
        this.auth = null;
        this.database = null;
        this.user = null;
        
        // 事件监听器
        this.listeners = new Map();
        
        // 心跳机制
        this.heartbeatInterval = null;
        
        // 初始化Firebase
        this.initFirebase();
        
        // 页面加载后尝试恢复房间状态
        this.attemptRoomRestore();
    }
    
    // 尝试恢复房间状态
    async attemptRoomRestore() {
        // 等待Firebase初始化完成
        setTimeout(async () => {
            try {
                const savedRoomId = localStorage.getItem('firebase_collaboration_roomId');
                const savedIsHost = localStorage.getItem('firebase_collaboration_isHost') === 'true';
                
                if (savedRoomId && this.isInitialized) {
                    console.log('🔄 检测到之前的房间状态，尝试恢复...', savedRoomId);
                    
                    // 验证房间是否仍然存在和活跃
                    const roomRef = this.firebaseUtils.ref(this.database, `rooms/${savedRoomId}`);
                    const roomSnapshot = await this.firebaseUtils.get(roomRef);
                    
                    if (roomSnapshot.exists()) {
                        const roomData = roomSnapshot.val();
                        if (roomData.info && roomData.info.isActive) {
                            console.log('✅ 房间仍然活跃，恢复连接...');
                            
                            // 恢复房间状态
                            this.roomId = savedRoomId;
                            this.isHost = savedIsHost;
                            
                            // 重新设置引用
                            this.setupRoomReferences();
                            
                            // 重新加入房间
                            if (this.isHost) {
                                // 房主重新设置在线状态
                                const userRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/users/${this.userId}`);
                                await this.firebaseUtils.update(userRef, {
                                    userName: this.userName,
                                    userColor: this.userColor,
                                    isHost: true,
                                    isOnline: true,
                                    lastSeen: this.firebaseUtils.serverTimestamp(),
                                    lastHeartbeat: this.firebaseUtils.serverTimestamp()
                                });
                            } else {
                                // 成员重新加入
                                const userRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/users/${this.userId}`);
                                await this.firebaseUtils.update(userRef, {
                                    userName: this.userName,
                                    userColor: this.userColor,
                                    isHost: false,
                                    isOnline: true,
                                    lastSeen: this.firebaseUtils.serverTimestamp(),
                                    lastHeartbeat: this.firebaseUtils.serverTimestamp()
                                });
                            }
                            
                            // 重新设置事件监听
                            this.setupRoomListeners();
                            
                            // 更新用户在线状态
                            this.updateUserPresence();
                            
                            // 显示悬浮协作面板
                            this.showFloatingCollaborationPanel();
                            
                            // 同步当前游戏状态
                            await this.syncCurrentGameState();
                            
                            console.log('✅ 房间状态恢复成功');
                            this.showTemporaryMessage('房间状态已恢复', 'success');
                            
                        } else {
                            console.log('❌ 房间已关闭，清理本地存储');
                            this.clearSavedRoomState();
                        }
                    } else {
                        console.log('❌ 房间不存在，清理本地存储');
                        this.clearSavedRoomState();
                    }
                }
            } catch (error) {
                console.error('❌ 恢复房间状态失败:', error);
                this.clearSavedRoomState();
            }
        }, 2000); // 等待2秒确保Firebase完全初始化
    }
    
    // 清理保存的房间状态
    clearSavedRoomState() {
        localStorage.removeItem('firebase_collaboration_roomId');
        localStorage.removeItem('firebase_collaboration_isHost');
    }
    
    // 保存房间状态到本地存储
    saveRoomStateToLocal() {
        if (this.roomId) {
            localStorage.setItem('firebase_collaboration_roomId', this.roomId);
            localStorage.setItem('firebase_collaboration_isHost', this.isHost.toString());
        }
    }
    
    // 初始化Firebase
    async initFirebase() {
        try {
            console.log('开始初始化Firebase...');
            
            // 检查Firebase是否已在全局初始化
            if (typeof window.firebaseApp === 'undefined') {
                console.warn('Firebase SDK未加载，启用模拟模式');
                this.enableDemoMode();
                return;
            }
            
            // 使用全局Firebase实例
            this.app = window.firebaseApp;
            this.auth = window.firebaseAuth;
            this.database = window.firebaseDatabase;
            this.firebaseUtils = window.firebaseUtils;
            
            // 匿名登录
            await this.authenticateUser();
            
            // 初始化用户信息
            this.initUserInfo();
            
            // 设置连接状态监听
            this.setupConnectionMonitoring();
            
            this.isInitialized = true;
            console.log('✅ Firebase初始化成功');
            
        } catch (error) {
            console.error('❌ Firebase初始化失败:', error);
            this.handleInitError(error);
        }
    }
    
    // 用户认证（匿名登录）
    async authenticateUser() {
        try {
            console.log('开始用户认证...');
            
            // 如果已经登录，直接返回
            if (this.auth.currentUser) {
                this.user = this.auth.currentUser;
                this.userId = this.user.uid;
                console.log('用户已登录:', this.userId);
                return;
            }
            
            // 匿名登录
            const userCredential = await this.firebaseUtils.signInAnonymously(this.auth);
            this.user = userCredential.user;
            this.userId = this.user.uid;
            
            console.log('✅ 匿名登录成功:', this.userId);
            
        } catch (error) {
            console.error('❌ 用户认证失败:', error);
            throw error;
        }
    }
    
    // 初始化用户信息
    initUserInfo() {
        // 生成或获取用户信息
        this.userName = this.getUserName();
        this.userColor = this.getUserColor();
        
        console.log('用户信息:', {
            userId: this.userId,
            userName: this.userName,
            userColor: this.userColor
        });
    }
    
    // 获取用户名
    getUserName() {
        let userName = localStorage.getItem('firebase_collaboration_userName');
        if (!userName) {
            userName = prompt('请输入您的用户名（用于多人协作）:') || `用户${Math.floor(Math.random() * 1000)}`;
            localStorage.setItem('firebase_collaboration_userName', userName);
        }
        return userName;
    }
    
    // 获取用户颜色
    getUserColor() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        let userColor = localStorage.getItem('firebase_collaboration_userColor');
        if (!userColor) {
            userColor = colors[Math.floor(Math.random() * colors.length)];
            localStorage.setItem('firebase_collaboration_userColor', userColor);
        }
        return userColor;
    }
    
    // 设置连接状态监听
    setupConnectionMonitoring() {
        const connectedRef = this.firebaseUtils.ref(this.database, '.info/connected');
        this.firebaseUtils.onValue(connectedRef, (snapshot) => {
            const wasConnected = this.isConnected;
            this.isConnected = snapshot.val() === true;
            
            console.log('Firebase连接状态:', this.isConnected ? '✅ 已连接' : '❌ 已断开');
            
            // 更新房间状态组件中的连接状态
            this.updateRoomConnectionStatus(this.isConnected);
            
            if (this.isConnected && this.roomId) {
                // 重新连接后的处理
                if (!wasConnected) {
                    console.log('🔄 网络重连，正在恢复用户状态...');
                    this.handleReconnection();
                }
                // 更新用户在线状态
                this.updateUserPresence();
            }
        });
    }

    // 处理重连逻辑
    async handleReconnection() {
        try {
            // 重新设置用户在线状态
            await this.updateUserPresence();
            
            // 重新获取房间数据，确保同步
            if (this.usersRef) {
                console.log('🔄 重连后刷新用户数据...');
                const usersSnapshot = await this.firebaseUtils.get(this.usersRef);
                const users = usersSnapshot.val();
                if (users) {
                    this.handleUsersChange(users);
                }
            }
            
            // 显示重连成功消息
            this.showTemporaryMessage('网络已重连，数据已同步', 'success');
            
        } catch (error) {
            console.error('❌ 重连处理失败:', error);
        }
    }

    // 更新房间连接状态显示
    updateRoomConnectionStatus(isConnected) {
        const connectionStatus = document.querySelector('.room-info .connection-status');
        if (connectionStatus) {
            connectionStatus.textContent = isConnected ? '已连接' : '连接中断';
            connectionStatus.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
        }
        
        // 如果有全局状态更新函数，也调用它
        if (typeof window.updateConnectionStatus === 'function') {
            window.updateConnectionStatus(isConnected);
        }
    }
    
    // 创建房间
    async createRoom() {
        if (!this.isInitialized) {
            alert('Firebase未初始化，请稍后重试');
            return null;
        }
        
        // 模拟模式处理
        if (this.isDemoMode) {
            return this.createDemoRoom();
        }
        
        try {
            console.log('开始创建房间...');
            
            // 生成房间ID
            const roomId = this.generateRoomId();
            this.roomId = roomId;
            this.isHost = true;
            
            // 房间数据
            const roomData = {
                info: {
                    hostId: this.userId,
                    hostName: this.userName,
                    created: this.firebaseUtils.serverTimestamp(),
                    lastActivity: this.firebaseUtils.serverTimestamp(),
                    isActive: true
                },
                users: {
                    [this.userId]: {
                        userName: this.userName,
                        userColor: this.userColor,
                        isHost: true,
                        lastSeen: this.firebaseUtils.serverTimestamp(),
                        isOnline: true
                    }
                },
                gameState: {
                    lineStates: {},
                    statistics: {
                        total: 0,
                        byUser: {}
                    }
                },
                operations: {}
            };
            
            // 创建房间
            const roomRef = this.firebaseUtils.ref(this.database, `rooms/${roomId}`);
            await this.firebaseUtils.set(roomRef, roomData);
            
            // 设置引用
            this.setupRoomReferences();
            
            // 设置事件监听
            this.setupRoomListeners();
            
            // 同步当前游戏状态到Firebase
            await this.syncCurrentGameState();
            
            // 显示悬浮协作面板
            this.showFloatingCollaborationPanel();
            
            // 保存房间状态到本地
            this.saveRoomStateToLocal();
            
            console.log('✅ 房间创建成功:', roomId);
            
            return roomId;
            
        } catch (error) {
            console.error('❌ 创建房间失败:', error);
            alert('创建房间失败: ' + error.message);
            return null;
        }
    }
    
    // 创建模拟房间
    createDemoRoom() {
        console.log('🎭 创建模拟房间');
        this.roomId = 'demo_room_' + Math.random().toString(36).substring(7);
        this.isHost = true;
        
        alert(`模拟模式下创建房间成功！\n房间ID: ${this.roomId}\n\n注意：这是演示模式，无法与其他用户实际协作。\n要使用真实的多人协作功能，请配置Firebase项目。`);
        
        return this.roomId;
    }

    // 加入房间
    async joinRoom(roomId) {
        if (!this.isInitialized) {
            alert('Firebase未初始化，请稍后重试');
            return false;
        }
        
        // 模拟模式处理
        if (this.isDemoMode) {
            return this.joinDemoRoom(roomId);
        }
        
        try {
            console.log('开始加入房间:', roomId);
            
            // 检查房间是否存在
            const roomRef = this.firebaseUtils.ref(this.database, `rooms/${roomId}`);
            const roomSnapshot = await this.firebaseUtils.get(roomRef);
            if (!roomSnapshot.exists()) {
                alert('房间不存在');
                return false;
            }
            
            const roomData = roomSnapshot.val();
            if (!roomData.info.isActive) {
                alert('房间已关闭');
                return false;
            }
            
            this.roomId = roomId;
            this.isHost = false;
            
            // 添加用户到房间
            const userRef = this.firebaseUtils.ref(this.database, `rooms/${roomId}/users/${this.userId}`);
            await this.firebaseUtils.set(userRef, {
                userName: this.userName,
                userColor: this.userColor,
                isHost: false,
                lastSeen: this.firebaseUtils.serverTimestamp(),
                isOnline: true
            });
            
            // 更新房间最后活动时间
            // 更新房间最后活动时间
            const activityRef = this.firebaseUtils.ref(this.database, `rooms/${roomId}/info/lastActivity`);
            await this.firebaseUtils.set(activityRef, this.firebaseUtils.serverTimestamp());
            
            // 设置引用
            this.setupRoomReferences();
            
            // 设置事件监听
            this.setupRoomListeners();
            
            // 同步房间状态到本地
            await this.syncRoomStateToLocal(roomData.gameState);
            
            // 显示悬浮协作面板
            this.showFloatingCollaborationPanel();
            
            // 保存房间状态到本地
            this.saveRoomStateToLocal();
            
            console.log('✅ 成功加入房间:', roomId);
            
            return true;
            
        } catch (error) {
            console.error('❌ 加入房间失败:', error);
            alert('加入房间失败: ' + error.message);
            return false;
        }
    }
    
    // 加入模拟房间
    joinDemoRoom(roomId) {
        console.log('🎭 加入模拟房间:', roomId);
        this.roomId = roomId;
        this.isHost = false;
        
        alert(`模拟模式下加入房间成功！\n房间ID: ${roomId}\n\n注意：这是演示模式，无法与其他用户实际协作。\n要使用真实的多人协作功能，请配置Firebase项目。`);
        
        return true;
    }
    
    // 离开房间
    async leaveRoom() {
        console.log('🚪 leaveRoom函数被调用');
        console.log('🔍 当前状态:', {
            roomId: this.roomId,
            isHost: this.isHost,
            userId: this.userId,
            isInitialized: this.isInitialized,
            isConnected: this.isConnected
        });
        
        if (!this.roomId) {
            console.log('❌ 没有房间ID，无法离开房间');
            this.showTemporaryMessage('当前没有加入任何房间', 'warning');
            return;
        }
        
        if (!this.isInitialized) {
            console.log('❌ Firebase未初始化，无法离开房间');
            this.showTemporaryMessage('Firebase未初始化，请重试', 'error');
            return;
        }
        
        try {
            console.log('🚪 开始离开房间:', this.roomId);
            
            // 显示离开中的提示
            this.showTemporaryMessage('正在离开房间...', 'info');
            
            // 停止心跳机制
            console.log('💓 停止心跳机制');
            this.stopHeartbeat();
            
            // 移除事件监听器
            console.log('👂 移除事件监听器');
            this.removeRoomListeners();
            
            // 检查Firebase连接状态和引用
            if (!this.database || !this.firebaseUtils) {
                console.warn('⚠️ Firebase数据库或工具未初始化，跳过远程清理');
            } else {
                // 尝试进行远程清理
                if (this.isHost) {
                    console.log('👑 房主离开，关闭房间');
                    try {
                        const activeRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/info/isActive`);
                        await this.firebaseUtils.set(activeRef, false);
                        console.log('✅ 房间已关闭');
                    } catch (error) {
                        console.warn('⚠️ 关闭房间失败，可能是网络问题:', error);
                    }
                } else {
                    console.log('👤 成员离开，更新用户状态');
                    try {
                        const userRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/users/${this.userId}`);
                        
                        // 标记用户离线
                        await this.firebaseUtils.update(userRef, {
                            isOnline: false,
                            lastSeen: this.firebaseUtils.serverTimestamp()
                        });
                        console.log('✅ 用户状态已更新为离线');
                        
                        // 延迟移除用户数据
                        setTimeout(async () => {
                            try {
                                await this.firebaseUtils.remove(userRef);
                                console.log('✅ 用户数据已移除');
                            } catch (error) {
                                console.warn('⚠️ 移除用户数据失败:', error);
                            }
                        }, 2000);
                    } catch (error) {
                        console.warn('⚠️ 更新用户状态失败，可能是网络问题:', error);
                    }
                }
            }
            
            // 重置本地状态（这个必须执行，即使远程操作失败）
            console.log('🔄 重置本地状态');
            this.roomId = null;
            this.isHost = false;
            this.roomRef = null;
            this.usersRef = null;
            this.gameStateRef = null;
            
            // 隐藏悬浮协作面板
            console.log('🏠 隐藏悬浮协作面板');
            this.hideFloatingCollaborationPanel();
            
            // 清理保存的房间状态
            console.log('🧹 清理保存的房间状态');
            this.clearSavedRoomState();
            
            console.log('✅ 已成功离开房间');
            this.showTemporaryMessage('已成功离开房间', 'success');
            
        } catch (error) {
            console.error('❌ 离开房间失败:', error);
            
            // 即使出错，也要执行基本的清理
            console.log('🔄 执行强制清理...');
            this.stopHeartbeat();
            this.removeRoomListeners();
            this.roomId = null;
            this.isHost = false;
            this.roomRef = null;
            this.usersRef = null;
            this.gameStateRef = null;
            this.hideRoomInfo();
            this.clearSavedRoomState();
            
            this.showTemporaryMessage(`离开房间时出现问题: ${error.message}`, 'error');
            
            // 重新抛出错误以便上层处理
            throw error;
        }
    }
    
    // 设置房间引用
    setupRoomReferences() {
        if (!this.roomId) return;
        
        this.roomRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}`);
        this.usersRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/users`);
        this.gameStateRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/gameState`);
    }
    
    // 设置房间事件监听
    setupRoomListeners() {
        if (!this.roomId) return;
        
        console.log('设置房间事件监听...');
        
        // 监听用户变化
        const usersListener = this.firebaseUtils.onValue(this.usersRef, (snapshot) => {
            this.handleUsersChange(snapshot.val());
        });
        this.listeners.set('users', usersListener);
        
        // 监听游戏状态变化
        const gameStateListener = this.firebaseUtils.onValue(this.gameStateRef, (snapshot) => {
            this.handleGameStateChange(snapshot.val());
        });
        this.listeners.set('gameState', gameStateListener);
        
        // 监听房间信息变化
        const roomInfoRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/info`);
        const roomInfoListener = this.firebaseUtils.onValue(roomInfoRef, (snapshot) => {
            this.handleRoomInfoChange(snapshot.val());
        });
        this.listeners.set('roomInfo', roomInfoListener);
        
        console.log('✅ 房间事件监听设置完成');
    }
    
    // 移除房间事件监听器
    removeRoomListeners() {
        console.log('移除房间事件监听器...');
        
        this.listeners.forEach((unsubscribe, key) => {
            try {
                if (typeof unsubscribe === 'function') {
                    console.log(`移除监听器: ${key}`);
                    unsubscribe(); // 在Firebase v9+中，onValue返回的是unsubscribe函数
                } else {
                    console.warn(`监听器 ${key} 不是有效的取消订阅函数`);
                }
            } catch (error) {
                console.warn(`移除监听器 ${key} 时出错:`, error);
            }
        });
        
        this.listeners.clear();
        console.log('✅ 事件监听器已清理');
    }
    
    // 生成房间ID
    generateRoomId() {
        return 'room_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    }
    
    // 更新用户在线状态
    updateUserPresence() {
        if (!this.roomId || !this.userId) {
            console.log('❌ 无法更新用户状态：缺少房间ID或用户ID');
            return;
        }
        
        const userRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/users/${this.userId}`);
        
        // 设置在线状态和心跳时间
        const updateData = {
            isOnline: true,
            lastSeen: this.firebaseUtils.serverTimestamp(),
            lastHeartbeat: this.firebaseUtils.serverTimestamp()
        };
        this.firebaseUtils.update(userRef, updateData);
        
        // 设置离线时自动清理
        const disconnectRef = this.firebaseUtils.onDisconnect(userRef);
        const offlineData = {
            isOnline: false,
            lastSeen: this.firebaseUtils.serverTimestamp()
        };
        disconnectRef.update(offlineData);
        
        // 启动心跳机制
        this.startHeartbeat();
    }

    // 启动心跳机制
    startHeartbeat() {
        // 清除已有的心跳定时器
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // 每30秒发送一次心跳
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.roomId && this.userId) {
                const userRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/users/${this.userId}/lastHeartbeat`);
                this.firebaseUtils.set(userRef, this.firebaseUtils.serverTimestamp());
                console.log('💓 发送心跳');
            }
        }, 30000);
        
        console.log('💓 心跳机制已启动');
    }

    // 停止心跳机制
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('💓 心跳机制已停止');
        }
    }
    
    // 同步当前游戏状态到Firebase
    async syncCurrentGameState() {
        if (!this.gameStateRef || !this.statsManager) return;
        
        try {
            console.log('同步当前游戏状态到Firebase...');
            
            // 获取当前所有线路状态
            const lineStates = {};
            for (let i = 1; i <= 400; i++) {
                const state = localStorage.getItem(`pigTimer_line_${i}_state`);
                const killTime = localStorage.getItem(`pigTimer_line_${i}_killTime`);
                
                if (state) {
                    lineStates[i] = {
                        state: state,
                        killTime: killTime ? parseInt(killTime) : null,
                        userId: this.userId,
                        userName: this.userName
                    };
                }
            }
            
            // 获取统计数据
            const statistics = {
                total: this.statsManager.killEvents.length,
                byUser: {
                    [this.userId]: this.statsManager.killEvents.length
                }
            };
            
            // 更新Firebase
            const updateData = {
                lineStates: lineStates,
                statistics: statistics
            };
            
            if (this.firebaseUtils && this.firebaseUtils.update && this.gameStateRef) {
                await this.firebaseUtils.update(this.gameStateRef, updateData);
            } else {
                console.warn('Firebase更新功能不可用，跳过同步');
                return;
            }
            
            console.log('✅ 游戏状态同步完成，同步了', Object.keys(lineStates).length, '个线路状态');
            
        } catch (error) {
            console.error('❌ 同步游戏状态失败:', error);
        }
    }
    
    // 同步房间状态到本地
    async syncRoomStateToLocal(gameState) {
        if (!gameState) return;
        
        try {
            console.log('同步房间状态到本地...');
            
            // 清除本地状态
            for (let i = 1; i <= 400; i++) {
                localStorage.removeItem(`pigTimer_line_${i}_state`);
                localStorage.removeItem(`pigTimer_line_${i}_killTime`);
            }
            
            // 应用房间状态
            if (gameState.lineStates) {
                Object.entries(gameState.lineStates).forEach(([line, data]) => {
                    localStorage.setItem(`pigTimer_line_${line}_state`, data.state);
                    if (data.killTime) {
                        localStorage.setItem(`pigTimer_line_${line}_killTime`, data.killTime.toString());
                    }
                });
            }
            
            // 触发本地状态恢复
            if (window.app && window.app.restoreTableState) {
                setTimeout(() => {
                    window.app.restoreTableState();
                    console.log('✅ 本地状态恢复完成');
                }, 500);
            }
            
            console.log('✅ 房间状态同步到本地完成');
            
        } catch (error) {
            console.error('❌ 同步房间状态到本地失败:', error);
        }
    }
    
    // 同步线路状态变化
    async syncLineStateChange(lineNumber, state, killTime = null) {
        if (!this.roomId || !this.gameStateRef) {
            console.log('未在房间中，跳过同步');
            return;
        }
        
        try {
            console.log(`同步线路${lineNumber}状态变化:`, state);
            
            // 创建操作记录
            const operation = {
                type: 'line_state_change',
                lineNumber: lineNumber,
                newState: state,
                killTime: killTime,
                userId: this.userId,
                userName: this.userName,
                timestamp: this.firebaseUtils.serverTimestamp()
            };
            
            // 更新游戏状态
            const updates = {};
            
            if (state === 'killed' && killTime) {
                updates[`lineStates/${lineNumber}`] = {
                    state: state,
                    killTime: killTime,
                    userId: this.userId,
                    userName: this.userName
                };
            } else if (state === 'killed-unknown') {
                updates[`lineStates/${lineNumber}`] = {
                    state: state,
                    killTime: null,
                    userId: this.userId,
                    userName: this.userName
                };
            } else if (state === 'refreshed') {
                updates[`lineStates/${lineNumber}`] = {
                    state: state,
                    killTime: null,
                    userId: this.userId,
                    userName: this.userName
                };
            } else if (state === 'cancelled' || !state) {
                // 清除状态（取消或清空）
                updates[`lineStates/${lineNumber}`] = null;
            } else {
                // 其他未知状态，也清除
                updates[`lineStates/${lineNumber}`] = null;
            }
            
            // 添加操作记录
            const operationId = 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            updates[`operations/${operationId}`] = operation;
            
            // 批量更新
            const gameStateRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/gameState`);
            await this.firebaseUtils.update(gameStateRef, updates);
            
            // 更新房间活动时间
            const activityRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/info/lastActivity`);
            await this.firebaseUtils.set(activityRef, this.firebaseUtils.serverTimestamp());
            
            console.log('✅ 线路状态同步完成');
            
        } catch (error) {
            console.error('❌ 同步线路状态失败:', error);
        }
    }
    
    // 处理用户变化
    handleUsersChange(users) {
        console.log('🔥 handleUsersChange 被调用，用户数据:', users);
        
        if (!users) {
            console.log('🔥 没有用户数据，退出处理');
            return;
        }
        
        const userCount = Object.keys(users).length;
        console.log('🔥 用户列表更新:', userCount, '个用户', users);
        
        // 更新房间信息组件中的用户列表和数量
        this.updateRoomInfoUsersList(users);
        
        // 检查房主是否在线
        const hostUser = Object.values(users).find(user => user.isHost);
        if (!hostUser || !hostUser.isOnline) {
            console.warn('房主已离线');
            if (!this.isHost) {
                // 如果房主离线且自己不是房主，提示用户
                setTimeout(() => {
                    alert('房主已离开，房间可能会关闭');
                }, 1000);
            }
        }
    }
    
    // 处理游戏状态变化
    handleGameStateChange(gameState) {
        if (!gameState) return;
        
        console.log('🎮 游戏状态更新:', gameState);
        
        // 防止自己的操作触发重复更新
        if (this._isLocalUpdate) {
            this._isLocalUpdate = false;
            console.log('跳过本地更新触发的状态变化');
            return;
        }
        
        // 更新本地状态
        this.updateLocalStateFromRemote(gameState);
        
        // 更新统计信息
        if (gameState.statistics && this.statsManager) {
            console.log('更新统计数据:', gameState.statistics);
            // 可以在这里更新协作统计显示
        }
    }
    
    // 处理房间信息变化
    handleRoomInfoChange(roomInfo) {
        if (!roomInfo) return;
        
        console.log('房间信息更新:', roomInfo);
        
        // 检查房间是否仍然活跃
        if (!roomInfo.isActive) {
            console.log('房间已关闭');
            alert('房间已关闭');
            this.leaveRoom();
        }
    }
    
    // 从远程状态更新本地状态
    updateLocalStateFromRemote(gameState) {
        if (!gameState.lineStates) return;
        
        try {
            console.log('从远程更新本地状态...');
            
            let updatedCount = 0;
            
            // 更新每个线路状态
            Object.entries(gameState.lineStates).forEach(([line, data]) => {
                const currentState = localStorage.getItem(`pigTimer_line_${line}_state`);
                const currentKillTime = localStorage.getItem(`pigTimer_line_${line}_killTime`);
                
                // 检查是否需要更新
                const needUpdate = 
                    currentState !== data.state || 
                    (data.killTime && currentKillTime !== data.killTime.toString());
                
                if (needUpdate) {
                    // 更新localStorage
                    localStorage.setItem(`pigTimer_line_${line}_state`, data.state);
                    if (data.killTime) {
                        localStorage.setItem(`pigTimer_line_${line}_killTime`, data.killTime.toString());
                    } else {
                        localStorage.removeItem(`pigTimer_line_${line}_killTime`);
                    }
                    
                    // 更新DOM显示
                    this.updateCellDisplay(line, data);
                    
                    updatedCount++;
                }
            });
            
            // 清除本地有但远程没有的状态
            for (let i = 1; i <= 400; i++) {
                if (!gameState.lineStates[i]) {
                    const hasLocalState = localStorage.getItem(`pigTimer_line_${i}_state`);
                    if (hasLocalState) {
                        localStorage.removeItem(`pigTimer_line_${i}_state`);
                        localStorage.removeItem(`pigTimer_line_${i}_killTime`);
                        this.clearCellDisplay(i);
                        updatedCount++;
                    }
                }
            }
            
            if (updatedCount > 0) {
                console.log(`✅ 更新了${updatedCount}个线路状态`);
                
                // 更新统计
                if (this.statsManager) {
                    this.statsManager.updateStats();
                }
                
                // 更新图表
                if (window.app && window.app.chartManager) {
                    window.app.chartManager.updateChart();
                }
                
                // 显示远程更新提示
                this.showTemporaryMessage(`从协作者同步了${updatedCount}个状态变化`, 'info');
            }
            
        } catch (error) {
            console.error('❌ 更新本地状态失败:', error);
        }
    }
    
    // 更新单元格显示
    updateCellDisplay(lineNumber, data) {
        const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
        if (!cell) {
            console.warn(`找不到线路${lineNumber}的单元格`);
            return;
        }
        
        console.log(`更新单元格显示: 线路${lineNumber}, 状态:${data.state}, 用户:${data.userName}`);
        
        // 清除现有状态类
        cell.classList.remove('killed', 'killed-unknown', 'refreshed');
        
        // 添加新状态类
        if (data.state) {
            cell.classList.add(data.state);
        }
        
        // 更新tooltip
        const tooltip = cell.querySelector('.tooltip');
        if (tooltip) {
            if (data.state === 'killed' || data.state === 'killed-unknown') {
                tooltip.textContent = `${data.userName || '其他用户'}标记击杀 - 双击取消`;
            } else if (data.state === 'refreshed') {
                tooltip.textContent = `${data.userName || '其他用户'}标记刷新 - 点击击杀`;
            } else {
                tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
            }
        }
        
        // 如果是击杀状态且有时间，启动倒计时
        if (data.state === 'killed' && data.killTime && window.app && window.app.timerManager) {
            const currentTime = new Date().getTime();
            const elapsed = currentTime - data.killTime;
            const timerDuration = window.app.testMode ? 10000 : (24 * 60 * 60 * 1000);
            
            if (elapsed < timerDuration) {
                const remaining = timerDuration - elapsed;
                console.log(`启动远程同步的倒计时: 线路${lineNumber}, 剩余时间:${remaining}ms`);
                
                window.app.timerManager.startTimer(lineNumber, data.killTime, remaining, cell, 
                    (completedLine) => {
                        console.log(`远程同步的倒计时完成: 线路${completedLine}`);
                        if (window.app && window.app.eventManager) {
                            window.app.eventManager.onTimerComplete(completedLine);
                        }
                    });
            } else {
                // 时间已过，直接设置为刷新状态
                console.log(`远程同步的击杀时间已过期，设置为刷新状态: 线路${lineNumber}`);
                setTimeout(() => {
                    cell.classList.remove('killed');
                    cell.classList.add('refreshed');
                    localStorage.setItem(`pigTimer_line_${lineNumber}_state`, 'refreshed');
                    localStorage.removeItem(`pigTimer_line_${lineNumber}_killTime`);
                }, 100);
            }
        }
    }
    
    // 清除单元格显示
    clearCellDisplay(lineNumber) {
        const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
        if (!cell) {
            console.warn(`找不到线路${lineNumber}的单元格`);
            return;
        }
        
        console.log(`清除单元格显示: 线路${lineNumber}`);
        
        // 清除状态类
        cell.classList.remove('killed', 'killed-unknown', 'refreshed');
        
        // 恢复默认tooltip
        const tooltip = cell.querySelector('.tooltip');
        if (tooltip) {
            tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
        }
        
        // 清除倒计时
        if (window.app && window.app.timerManager) {
            window.app.timerManager.clearTimer(lineNumber);
        }
        
        // 清除计时器显示
        const timerCell = document.getElementById(`timer-${lineNumber}`);
        if (timerCell) {
            timerCell.textContent = '';
        }
    }
    
    // 显示Firebase协作对话框
    showCollaborationDialog() {
        // 移除已存在的协作框
        const existingDialog = document.getElementById('firebase-collaboration-panel');
        if (existingDialog) {
            existingDialog.remove();
        }

        // 创建悬浮协作面板
        this.showFloatingCollaborationPanel();
    }

    // 显示悬浮协作面板（统一的悬浮框）
    showFloatingCollaborationPanel() {
        console.log('🏠 显示Firebase协作悬浮面板');
        
        const panel = document.createElement('div');
        panel.id = 'firebase-collaboration-panel';
        panel.className = 'firebase-collaboration-panel';
        
        if (this.roomId) {
            // 用户在房间中 - 显示房间信息
            panel.innerHTML = this.getRoomInfoContent();
        } else {
            // 用户不在房间中 - 显示创建/加入界面
            panel.innerHTML = this.getCreateJoinContent();
        }
        
        // 添加悬浮框样式
        panel.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            background: white !important;
            border: 2px solid ${this.roomId ? (this.isHost ? '#e74c3c' : '#3498db') : '#2ecc71'} !important;
            border-radius: 10px !important;
            padding: 15px !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
            z-index: 10000 !important;
            min-width: 320px !important;
            max-width: 400px !important;
            font-family: Arial, sans-serif !important;
            color: #333 !important;
        `;
        
        document.body.appendChild(panel);
        console.log('✅ Firebase协作悬浮面板已添加到DOM');
        
        // 绑定事件
        setTimeout(() => {
            this.bindFloatingPanelEvents(panel);
        }, 100);
    }

    // 获取房间信息内容
    getRoomInfoContent() {
        return `
            <div class="panel-header">
                <h3>🏠 Firebase协作房间</h3>
                <button id="close-panel-btn" class="close-panel-btn" title="关闭">✕</button>
            </div>
            <div class="connection-status">
                <span class="status-badge ${this.isConnected ? 'connected' : 'disconnected'}">
                    ${this.isConnected ? '✅ 已连接' : '❌ 连接中断'}
                </span>
            </div>
            <div class="room-details">
                <p><strong>房间号:</strong> 
                   <span id="room-id-display">${this.roomId}</span> 
                   <button id="copy-room-id" class="copy-btn" title="复制房间号">📋</button>
                </p>
                <p><strong>模式:</strong> ${this.isHost ? '🛡️ 房主模式' : '👥 成员模式'}</p>
                <p><strong>连接数:</strong> <span id="connection-count">1 人在线</span></p>
                <div id="users-list" class="users-list"></div>
            </div>
            <div class="room-actions">
                <button id="leave-room-btn" class="action-btn danger">🚪 离开房间</button>
            </div>
        `;
    }

    // 获取创建/加入房间内容
    getCreateJoinContent() {
        return `
            <div class="panel-header">
                <h3>🔥 Firebase多人协作</h3>
                <button id="close-panel-btn" class="close-panel-btn" title="关闭">✕</button>
            </div>
            <div class="connection-status">
                <p><strong>连接模式:</strong> Firebase实时数据库</p>
                <p><strong>初始化:</strong> <span id="firebase-init-status">${this.isInitialized ? '✅ 已初始化' : '❌ 未初始化'}</span></p>
                <p><strong>连接状态:</strong> <span id="firebase-connection-status">${this.isConnected ? '✅ 已连接' : '❌ 已断开'}</span></p>
            </div>
            <div class="room-actions">
                <h4>🏠 房间操作</h4>
                <button id="firebase-create-room-btn" class="action-btn primary" ${!this.isInitialized ? 'disabled' : ''}>
                    🏠 创建房间
                </button>
                
                <div class="join-room-section">
                    <h4>🚪 加入房间</h4>
                    <input type="text" id="firebase-room-id-input" placeholder="输入房间号" class="room-input" />
                    <button id="firebase-join-room-btn" class="action-btn primary" ${!this.isInitialized ? 'disabled' : ''}>
                        🚪 加入房间
                    </button>
                </div>
                
                <div class="user-settings">
                    <h4>⚙️ 用户设置</h4>
                    <input type="text" id="firebase-username-input" placeholder="用户名" value="${this.userName || ''}" class="settings-input" />
                    <input type="color" id="firebase-color-input" value="${this.userColor || '#3498db'}" class="color-input" />
                    <button id="firebase-save-settings-btn" class="action-btn secondary">💾 保存设置</button>
                </div>
            </div>
            
            <div class="firebase-info">
                <h4>ℹ️ 功能说明</h4>
                <ul>
                    <li>🌐 <strong>跨设备支持:</strong> 不同设备间实时协作</li>
                    <li>⚡ <strong>实时同步:</strong> 操作实时同步到所有用户</li>
                    <li>🔄 <strong>断线重连:</strong> 自动处理网络问题</li>
                    <li>💾 <strong>数据持久化:</strong> 状态保存在云端</li>
                </ul>
                ${!this.isInitialized ? `
                    <div class="warning-box">
                        <strong>⚠️ 需要配置:</strong> 请先配置Firebase项目
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 绑定悬浮面板事件
    bindFloatingPanelEvents(panel) {
        console.log('🔧 绑定悬浮面板事件');
        
        // 关闭按钮
        const closeBtn = panel.querySelector('#close-panel-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                panel.remove();
                console.log('✅ 悬浮面板已关闭');
            });
        }

        if (this.roomId) {
            // 房间中的事件绑定
            this.bindRoomPanelEvents(panel);
        } else {
            // 创建/加入房间的事件绑定
            this.bindCreateJoinPanelEvents(panel);
        }
    }

    // 绑定房间面板事件
    bindRoomPanelEvents(panel) {
        // 离开房间按钮
        const leaveBtn = panel.querySelector('#leave-room-btn');
        if (leaveBtn) {
            const handleLeaveRoom = async (e) => {
                console.log('🚪 悬浮面板离开房间按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    const confirmed = confirm('确定要离开房间吗？');
                    
                    if (confirmed) {
                        console.log('✅ 用户确认离开房间');
                        
                        leaveBtn.disabled = true;
                        leaveBtn.textContent = '离开中...';
                        
                        try {
                            await this.leaveRoom();
                            console.log('✅ 成功离开房间');
                            panel.remove();
                            this.showTemporaryMessage('已离开房间', 'success');
                        } catch (error) {
                            console.error('❌ 离开房间时发生错误:', error);
                            this.showTemporaryMessage('离开房间失败，请重试', 'error');
                            
                            leaveBtn.disabled = false;
                            leaveBtn.textContent = '🚪 离开房间';
                        }
                    } else {
                        console.log('❌ 用户取消离开房间');
                    }
                } catch (error) {
                    console.error('❌ 离开房间处理函数出错:', error);
                    this.showTemporaryMessage('操作失败，请重试', 'error');
                }
            };
            
            leaveBtn.addEventListener('click', handleLeaveRoom.bind(this));
        }

        // 复制房间号按钮
        const copyBtn = panel.querySelector('#copy-room-id');
        if (copyBtn) {
            copyBtn.addEventListener('click', async (e) => {
                console.log('📋 复制按钮被点击');
                e.preventDefault();
                e.stopPropagation();
                await this.copyRoomId();
            });
        }
        
        // 更新用户列表
        this.updatePanelUsersList();
    }

    // 绑定创建/加入面板事件
    bindCreateJoinPanelEvents(panel) {
        // 创建房间按钮
        const createBtn = panel.querySelector('#firebase-create-room-btn');
        if (createBtn) {
            createBtn.addEventListener('click', async () => {
                console.log('🏠 创建房间按钮被点击');
                createBtn.disabled = true;
                createBtn.textContent = '创建中...';
                
                try {
                    const roomId = await this.createRoom();
                    if (roomId) {
                        console.log('✅ 房间创建成功:', roomId);
                        panel.remove();
                        this.showTemporaryMessage(`房间创建成功！房间号: ${roomId}`, 'success');
                        // 重新显示房间信息面板
                        setTimeout(() => {
                            this.showFloatingCollaborationPanel();
                        }, 1000);
                    }
                } catch (error) {
                    console.error('❌ 创建房间失败:', error);
                    this.showTemporaryMessage('创建房间失败: ' + error.message, 'error');
                } finally {
                    createBtn.disabled = false;
                    createBtn.textContent = '🏠 创建房间';
                }
            });
        }
        
        // 加入房间按钮
        const joinBtn = panel.querySelector('#firebase-join-room-btn');
        const roomInput = panel.querySelector('#firebase-room-id-input');
        if (joinBtn && roomInput) {
            const handleJoinRoom = async () => {
                const roomId = roomInput.value.trim();
                if (!roomId) {
                    this.showTemporaryMessage('请输入房间号', 'warning');
                    return;
                }
                
                console.log('🚪 加入房间按钮被点击, 房间号:', roomId);
                joinBtn.disabled = true;
                joinBtn.textContent = '加入中...';
                
                try {
                    const success = await this.joinRoom(roomId);
                    if (success) {
                        console.log('✅ 成功加入房间:', roomId);
                        panel.remove();
                        this.showTemporaryMessage(`成功加入房间: ${roomId}`, 'success');
                        // 重新显示房间信息面板
                        setTimeout(() => {
                            this.showFloatingCollaborationPanel();
                        }, 1000);
                    }
                } catch (error) {
                    console.error('❌ 加入房间失败:', error);
                    this.showTemporaryMessage('加入房间失败: ' + error.message, 'error');
                } finally {
                    joinBtn.disabled = false;
                    joinBtn.textContent = '🚪 加入房间';
                }
            };
            
            joinBtn.addEventListener('click', handleJoinRoom);
            
            // 回车键加入房间
            roomInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleJoinRoom();
                }
            });
        }
        
        // 保存设置按钮
        const saveBtn = panel.querySelector('#firebase-save-settings-btn');
        const nameInput = panel.querySelector('#firebase-username-input');
        const colorInput = panel.querySelector('#firebase-color-input');
        if (saveBtn && nameInput && colorInput) {
            saveBtn.addEventListener('click', () => {
                console.log('💾 保存设置按钮被点击');
                
                const newName = nameInput.value.trim();
                const newColor = colorInput.value;
                
                if (newName) {
                    this.userName = newName;
                    localStorage.setItem('firebase_collaboration_userName', this.userName);
                }
                
                if (newColor) {
                    this.userColor = newColor;
                    localStorage.setItem('firebase_collaboration_userColor', this.userColor);
                }
                
                this.showTemporaryMessage('设置已保存', 'success');
                console.log('✅ 用户设置已保存:', { userName: this.userName, userColor: this.userColor });
            });
        }
    }
    
    // 更新面板用户列表
    updatePanelUsersList() {
        const usersList = document.getElementById('users-list');
        const connectionCount = document.getElementById('connection-count');
        
        if (!usersList || !connectionCount) {
            return;
        }
        
        // 清空现有列表
        usersList.innerHTML = '';
        
        if (!this.roomId) {
            return;
        }
        
        // 这里复用原有的用户列表更新逻辑
        // 如果没有用户数据，只显示当前用户
        const currentUserDiv = document.createElement('div');
        currentUserDiv.className = 'user-item current-user';
        currentUserDiv.innerHTML = `
            <div class="user-color" style="background-color: ${this.userColor || '#3498db'}"></div>
            <span class="user-name">${this.userName || '我'} ${this.isHost ? '(房主)' : ''}</span>
            <span class="user-status connected">在线</span>
        `;
        usersList.appendChild(currentUserDiv);
        connectionCount.textContent = '1 人在线';
    }

    // 隐藏悬浮协作面板
    hideFloatingCollaborationPanel() {
        const panel = document.getElementById('firebase-collaboration-panel');
        if (panel) {
            panel.remove();
            console.log('✅ 悬浮协作面板已隐藏');
        }
    }

    // 显示临时消息
    showTemporaryMessage(message, type = 'info') {
        console.log(`💬 ${type.toUpperCase()}: ${message}`);
        
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `temporary-message ${type}`;
        messageDiv.textContent = message;
        
        // 添加样式
        messageDiv.style.cssText = `
            position: fixed !important;
            top: 80px !important;
            right: 20px !important;
            background: ${this.getMessageColor(type)} !important;
            color: white !important;
            padding: 12px 20px !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            z-index: 10001 !important;
            font-family: Arial, sans-serif !important;
            font-size: 14px !important;
            max-width: 300px !important;
            word-wrap: break-word !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease !important;
        `;
        
        document.body.appendChild(messageDiv);
        
        // 显示动画
        setTimeout(() => {
            messageDiv.style.opacity = '1';
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // 获取消息颜色
    getMessageColor(type) {
        switch (type) {
            case 'success': return '#27ae60';
            case 'error': return '#e74c3c';
            case 'warning': return '#f39c12';
            case 'info':
            default: return '#3498db';
        }
    }

    // 复制房间号到剪贴板
    async copyRoomId() {
        if (!this.roomId) {
            this.showTemporaryMessage('当前没有加入任何房间', 'warning');
            return false;
        }

        try {
            await navigator.clipboard.writeText(this.roomId);
            this.showTemporaryMessage('房间号已复制到剪贴板', 'success');
            console.log('📋 房间号已复制:', this.roomId);
            return true;
        } catch (error) {
            console.error('复制房间号失败:', error);
            
            // 降级方案：创建临时输入框
            const tempInput = document.createElement('input');
            tempInput.value = this.roomId;
            tempInput.style.position = 'absolute';
            tempInput.style.left = '-9999px';
            document.body.appendChild(tempInput);
            tempInput.select();
            
            try {
                document.execCommand('copy');
                this.showTemporaryMessage('房间号已复制到剪贴板', 'success');
                console.log('📋 房间号已复制（降级方案）:', this.roomId);
                return true;
            } catch (fallbackError) {
                this.showTemporaryMessage('复制失败，请手动复制房间号', 'error');
                console.error('复制房间号失败（降级方案）:', fallbackError);
                return false;
            } finally {
                document.body.removeChild(tempInput);
            }
        }
    }

    // 更新房间信息界面中的用户列表
    updateRoomInfoUsersList(users) {
        console.log('🔄 更新房间信息用户列表:', users);
        
        // 查找房间信息面板
        const panel = document.getElementById('firebase-collaboration-panel');
        if (!panel) {
            console.log('📱 房间信息面板不存在，跳过用户列表更新');
            return;
        }
        
        // 查找用户列表容器
        const usersList = panel.querySelector('#users-list');
        const connectionCount = panel.querySelector('#connection-count');
        
        if (!usersList) {
            console.log('📱 用户列表容器不存在，跳过更新');
            return;
        }
        
        // 清空现有列表
        usersList.innerHTML = '';
        
        const userCount = users ? Object.keys(users).length : 0;
        
        // 更新连接数显示
        if (connectionCount) {
            connectionCount.textContent = `${userCount} 人在线`;
        }
        
        if (!users || userCount === 0) {
            usersList.innerHTML = '<div class="no-users">暂无其他用户</div>';
            return;
        }
        
        // 添加在线用户
        Object.entries(users).forEach(([userId, userData]) => {
            if (!userData || !userData.isOnline) return;
            
            const userDiv = document.createElement('div');
            userDiv.className = `user-item ${userId === this.userId ? 'current-user' : ''}`;
            
            const userName = userData.name || `用户${userId.slice(-4)}`;
            const userColor = userData.color || '#3498db';
            const isHost = userData.isHost || false;
            const isSelf = userId === this.userId;
            
            userDiv.innerHTML = `
                <div class="user-color" style="background-color: ${userColor}"></div>
                <span class="user-name">
                    ${userName} 
                    ${isHost ? '(房主)' : ''} 
                    ${isSelf ? '(我)' : ''}
                </span>
                <span class="user-status connected">在线</span>
            `;
            
            usersList.appendChild(userDiv);
        });
        
        console.log(`✅ 用户列表已更新，显示 ${userCount} 个用户`);
    }

    // 隐藏房间信息（离开房间时调用）
    hideRoomInfo() {
        console.log('🔒 隐藏房间信息');
        
        // 隐藏悬浮协作面板
        this.hideFloatingCollaborationPanel();
        
        // 可以在这里添加其他房间信息的隐藏逻辑
        // 比如隐藏房间状态指示器等
        
        console.log('✅ 房间信息已隐藏');
    }
}
