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
                            
                            // 显示房间信息
                            this.showRoomInfo();
                            
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
            
            // 显示房间信息组件
            this.showRoomInfo();
            
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
            
            // 显示房间信息组件
            this.showRoomInfo();
            
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
            
            // 隐藏房间信息
            console.log('🏠 隐藏房间信息组件');
            this.hideRoomInfo();
            
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
        
        this.listeners.forEach((listener, key) => {
            if (key === 'users' && this.usersRef) {
                this.usersRef.off('value', listener);
            } else if (key === 'gameState' && this.gameStateRef) {
                this.gameStateRef.off('value', listener);
            } else if (key === 'roomInfo' && this.roomRef) {
                this.database.ref(`rooms/${this.roomId}/info`).off('value', listener);
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
            await this.gameStateRef.update({
                lineStates: lineStates,
                statistics: statistics
            });
            
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
        const modal = document.createElement('div');
        modal.className = 'collaboration-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔥 Firebase多人协作</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="connection-status">
                        <p>连接模式: <span style="color: #e74c3c; font-weight: bold;">Firebase实时数据库</span></p>
                        <p>初始化状态: <span id="firebase-init-status">${this.isInitialized ? '✅ 已初始化' : '❌ 未初始化'}</span></p>
                        <p>连接状态: <span id="firebase-connection-status">${this.isConnected ? '✅ 已连接' : '❌ 已断开'}</span></p>
                        ${this.roomId ? `<p>当前房间: <strong>${this.roomId}</strong> ${this.isHost ? '(房主)' : '(成员)'}</p>` : ''}
                    </div>
                    
                    <div class="room-actions">
                        <h4>房间操作</h4>
                        ${!this.roomId ? `
                            <button id="firebase-create-room-btn" class="action-btn" ${!this.isInitialized ? 'disabled' : ''}>
                                🏠 创建房间
                            </button>
                            
                            <div class="join-room-section">
                                <input type="text" id="firebase-room-id-input" placeholder="输入房间号" />
                                <button id="firebase-join-room-btn" class="action-btn" ${!this.isInitialized ? 'disabled' : ''}>
                                    🚪 加入房间
                                </button>
                            </div>
                        ` : `
                            <button id="firebase-leave-room-btn" class="action-btn">
                                🚪 离开房间
                            </button>
                            <div class="room-info">
                                <p><strong>房间号:</strong> ${this.roomId}</p>
                                <p><strong>角色:</strong> ${this.isHost ? '房主' : '成员'}</p>
                            </div>
                        `}
                        
                        <div class="firebase-info">
                            <h4>🔥 Firebase协作说明</h4>
                            <ul>
                                <li><strong>跨设备支持:</strong> 支持不同设备和浏览器间的实时协作</li>
                                <li><strong>实时同步:</strong> 所有操作实时同步到所有用户</li>
                                <li><strong>断线重连:</strong> 自动处理网络断开和重连</li>
                                <li><strong>数据持久化:</strong> 状态数据保存在云端</li>
                            </ul>
                            ${!this.isInitialized ? `
                                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 10px; margin-top: 10px;">
                                    <strong>⚠️ 需要配置:</strong> 请先配置Firebase项目，详见FIREBASE_SETUP.md
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="user-settings">
                        <h4>个人设置</h4>
                        <label>用户名: <input type="text" id="firebase-username-input" value="${this.userName || ''}" /></label>
                        <label>颜色: <input type="color" id="firebase-color-input" value="${this.userColor || '#e74c3c'}" /></label>
                        <button id="firebase-save-settings-btn" class="action-btn">保存设置</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.bindFirebaseCollaborationEvents(modal);
        
        // 显示动画
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    // 绑定Firebase协作对话框事件
    bindFirebaseCollaborationEvents(modal) {
        // 关闭按钮
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // 创建房间
        const createBtn = modal.querySelector('#firebase-create-room-btn');
        if (createBtn) {
            createBtn.addEventListener('click', async () => {
                const roomId = await this.createRoom();
                if (roomId) {
                    modal.remove();
                    alert(`房间创建成功！\n房间号: ${roomId}\n请将房间号分享给其他用户`);
                }
            });
        }
        
        // 加入房间
        const joinBtn = modal.querySelector('#firebase-join-room-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', async () => {
                const roomIdInput = modal.querySelector('#firebase-room-id-input');
                const roomId = roomIdInput.value.trim();
                if (!roomId) {
                    alert('请输入房间号');
                    return;
                }
                
                const success = await this.joinRoom(roomId);
                if (success) {
                    modal.remove();
                    alert(`成功加入房间: ${roomId}`);
                }
            });
        }
        
        // 离开房间
        const leaveBtn = modal.querySelector('#firebase-leave-room-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', async () => {
                await this.leaveRoom();
                modal.remove();
                alert('已离开房间');
            });
        }
        
        // 保存设置
        const saveBtn = modal.querySelector('#firebase-save-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const nameInput = modal.querySelector('#firebase-username-input');
                const colorInput = modal.querySelector('#firebase-color-input');
                
                this.userName = nameInput.value.trim() || this.userName;
                this.userColor = colorInput.value || this.userColor;
                
                localStorage.setItem('firebase_collaboration_userName', this.userName);
                localStorage.setItem('firebase_collaboration_userColor', this.userColor);
                
                alert('设置已保存');
            });
        }
    }
    
    // 显示房间信息
    showRoomInfo() {
        // 移除已存在的房间信息
        const existingRoomInfo = document.getElementById('room-info');
        if (existingRoomInfo) {
            existingRoomInfo.remove();
        }

        const roomInfo = document.createElement('div');
        roomInfo.id = 'room-info';
        roomInfo.className = 'room-info';
        roomInfo.innerHTML = `
            <div class="room-header">
                <h3>🏠 Firebase协作房间</h3>
                <span class="connection-status ${this.isConnected ? 'connected' : 'disconnected'}">${this.isConnected ? '已连接' : '连接中断'}</span>
                <button id="leave-room-btn" class="leave-room-btn" type="button">离开房间</button>
            </div>
            <div class="room-details">
                <p><strong>房间号:</strong> <span id="room-id-display">${this.roomId}</span> 
                   <button id="copy-room-id" class="copy-btn" title="复制房间号">📋</button></p>
                <p><strong>模式:</strong> ${this.isHost ? '🛡️ 房主模式' : '👥 成员模式'}</p>
                <p><strong>连接数:</strong> <span id="connection-count">1 人在线</span></p>
                <div id="users-list" class="users-list"></div>
            </div>
        `;
        
        // 添加样式
        roomInfo.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 2px solid ${this.isHost ? '#e74c3c' : '#3498db'};
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 300px;
            max-width: 380px;
        `;
        
        document.body.appendChild(roomInfo);
        
        console.log('🏠 房间信息组件已添加到DOM');
        
        // 在全局设置离开房间函数
        window.globalLeaveRoom = () => {
            console.log('🌐 全局离开房间函数被调用');
            this.leaveRoom().catch(error => {
                console.error('❌ 全局离开房间失败:', error);
                this.showTemporaryMessage('离开房间失败，请查看控制台获取详细信息', 'error');
            });
        };
        
        // 添加调试用的安全离开函数
        window.debugLeaveRoom = () => {
            console.log('🔧 调试离开房间函数被调用');
            console.log('🔍 Firebase Manager 状态:', {
                isInitialized: this.isInitialized,
                isConnected: this.isConnected,
                roomId: this.roomId,
                userId: this.userId,
                isHost: this.isHost,
                hasDatabase: !!this.database,
                hasFirebaseUtils: !!this.firebaseUtils
            });
            
            // 强制离开（忽略错误）
            this.forceLeaveRoom();
        };
        
        // 强制离开房间方法（用于调试）
        this.forceLeaveRoom = () => {
            console.log('⚡ 强制离开房间（调试模式）');
            
            try {
                this.stopHeartbeat();
                this.removeRoomListeners();
                this.roomId = null;
                this.isHost = false;
                this.roomRef = null;
                this.usersRef = null;
                this.gameStateRef = null;
                this.hideRoomInfo();
                this.clearSavedRoomState();
                
                console.log('✅ 强制离开完成');
                this.showTemporaryMessage('强制离开完成', 'success');
            } catch (error) {
                console.error('❌ 强制离开也失败了:', error);
                this.showTemporaryMessage('强制离开失败', 'error');
            }
        };
        
        // 等待一个微任务周期，确保DOM已经渲染
        setTimeout(() => {
            // 绑定事件
            const leaveBtn = document.getElementById('leave-room-btn');
            const copyBtn = document.getElementById('copy-room-id');
            
            console.log('🔍 查找按钮元素:', {
                leaveBtn: !!leaveBtn,
                copyBtn: !!copyBtn,
                leaveBtnElement: leaveBtn,
                copyBtnElement: copyBtn
            });
            
            if (leaveBtn) {
                console.log('🔧 开始绑定离开房间按钮事件');
                console.log('🔍 按钮详细信息:', {
                    tagName: leaveBtn.tagName,
                    id: leaveBtn.id,
                    className: leaveBtn.className,
                    style: leaveBtn.style.cssText,
                    disabled: leaveBtn.disabled,
                    offsetParent: leaveBtn.offsetParent,
                    parentElement: leaveBtn.parentElement
                });
                
                // 创建安全的离开房间处理函数
                const handleLeaveRoom = async (e) => {
                    console.log('🚪 离开房间按钮被点击');
                    e.preventDefault();
                    e.stopPropagation();
                    
                    try {
                        // 添加确认对话框
                        const confirmed = confirm('确定要离开房间吗？');
                        
                        if (confirmed) {
                            console.log('✅ 用户确认离开房间');
                            
                            // 禁用按钮防止重复点击
                            leaveBtn.disabled = true;
                            leaveBtn.style.opacity = '0.6';
                            leaveBtn.textContent = '离开中...';
                            
                            try {
                                await this.leaveRoom();
                                console.log('✅ 成功离开房间');
                            } catch (error) {
                                console.error('❌ 离开房间时发生错误:', error);
                                this.showTemporaryMessage('离开房间失败，请重试', 'error');
                                
                                // 恢复按钮状态
                                leaveBtn.disabled = false;
                                leaveBtn.style.opacity = '1';
                                leaveBtn.textContent = '离开房间';
                            }
                        } else {
                            console.log('❌ 用户取消离开房间');
                        }
                    } catch (error) {
                        console.error('❌ 离开房间处理函数出错:', error);
                        this.showTemporaryMessage('操作失败，请重试', 'error');
                    }
                };
                
                // 移除现有的事件监听器（如果有的话）
                const newLeaveBtn = leaveBtn.cloneNode(true);
                leaveBtn.parentNode.replaceChild(newLeaveBtn, leaveBtn);
                
                // 绑定事件监听器
                newLeaveBtn.addEventListener('click', handleLeaveRoom.bind(this));
                
                // 设置按钮样式确保可点击
                newLeaveBtn.style.cursor = 'pointer';
                newLeaveBtn.style.pointerEvents = 'auto';
                newLeaveBtn.style.opacity = '1';
                newLeaveBtn.style.zIndex = '10001';
                
                // 添加调试事件监听器
                newLeaveBtn.addEventListener('mousedown', () => {
                    console.log('🖱️ 离开按钮mousedown事件');
                });
                
                newLeaveBtn.addEventListener('mouseup', () => {
                    console.log('🖱️ 离开按钮mouseup事件');
                });
                
                newLeaveBtn.addEventListener('mouseover', () => {
                    console.log('🖱️ 离开按钮mouseover事件');
                });
                
                console.log('✅ 离开房间按钮事件已绑定');
            } else {
                console.error('❌ 找不到离开房间按钮');
            }
            
            if (copyBtn) {
                copyBtn.addEventListener('click', async (e) => {
                    console.log('📋 复制按钮被点击');
                    e.preventDefault();
                    e.stopPropagation();
                    await this.copyRoomId();
                });
                
                // 测试按钮是否可点击
                copyBtn.style.cursor = 'pointer';
                copyBtn.style.pointerEvents = 'auto';
                
                console.log('✅ 复制按钮事件已绑定');
            } else {
                console.error('❌ 找不到复制按钮');
            }
        }, 100);
        
        // 更新用户列表
        this.updateRoomInfoUsersList();
        
        // 调试：检查房间用户数据
        setTimeout(() => {
            this.debugRoomUsers();
        }, 1000);
    }

    // 复制房间号
    async copyRoomId() {
        const copyBtn = document.getElementById('copy-room-id');
        
        if (!this.roomId) {
            this.showTemporaryMessage('没有房间号可复制', 'error');
            return;
        }
        
        try {
            // 优先使用现代Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(this.roomId);
            } else {
                // 降级使用传统方法
                const textArea = document.createElement('textarea');
                textArea.value = this.roomId;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                textArea.setSelectionRange(0, 99999); // 移动端兼容
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (!success) {
                    throw new Error('execCommand failed');
                }
            }
            
            // 显示复制成功动画
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅';
                copyBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.background = '';
                }, 1000);
            }
            
            this.showTemporaryMessage(`房间号已复制到剪贴板: ${this.roomId}`, 'success');
            
        } catch (err) {
            console.error('复制失败:', err);
            
            // 显示房间号给用户手动复制
            const roomIdSpan = document.getElementById('room-id-display');
            if (roomIdSpan) {
                // 创建临时选择
                const range = document.createRange();
                range.selectNode(roomIdSpan);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                this.showTemporaryMessage('自动复制失败，房间号已选中，请使用 Ctrl+C 手动复制', 'warning');
            } else {
                this.showTemporaryMessage(`复制失败，房间号: ${this.roomId}`, 'error');
            }
        }
    }

    // 更新房间信息用户列表
    updateRoomInfoUsersList(users = null) {
        const usersList = document.getElementById('users-list');
        const connectionCount = document.getElementById('connection-count');
        
        if (!usersList || !connectionCount) {
            return;
        }
        
        // 清空现有列表
        usersList.innerHTML = '';
        
        if (!users) {
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
            return;
        }
        
        // 分析用户数据
        const userEntries = Object.entries(users);
        const currentTime = Date.now();
        let onlineCount = 0;
        
        // 按在线状态和是否为房主排序
        userEntries.sort(([aId, aData], [bId, bData]) => {
            // 房主优先
            if (aData.isHost && !bData.isHost) return -1;
            if (!aData.isHost && bData.isHost) return 1;
            
            // 在线用户优先
            const aOnline = this.isUserOnline(aData, currentTime);
            const bOnline = this.isUserOnline(bData, currentTime);
            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;
            
            // 当前用户优先
            if (aId === this.userId) return -1;
            if (bId === this.userId) return 1;
            
            return 0;
        });
        
        userEntries.forEach(([userId, userData]) => {
            const userDiv = document.createElement('div');
            const isCurrentUser = userId === this.userId;
            const isOnline = this.isUserOnline(userData, currentTime);
            const userName = userData.userName || (isCurrentUser ? '我' : '用户');
            const userColor = userData.userColor || '#3498db';
            const hostIndicator = userData.isHost ? ' (房主)' : '';
            
            if (isOnline) onlineCount++;
            
            userDiv.className = `user-item ${isCurrentUser ? 'current-user' : ''} ${isOnline ? 'online' : 'offline'}`;
            
            // 计算最后活跃时间
            const lastSeenText = this.getLastSeenText(userData.lastSeen, isOnline);
            
            userDiv.innerHTML = `
                <div class="user-color" style="background-color: ${userColor}"></div>
                <div class="user-info">
                    <span class="user-name">${userName}${isCurrentUser ? ' (我)' : ''}${hostIndicator}</span>
                    <span class="user-last-seen">${lastSeenText}</span>
                </div>
                <span class="user-status ${isOnline ? 'connected' : 'disconnected'}">${isOnline ? '在线' : '离线'}</span>
            `;
            
            usersList.appendChild(userDiv);
        });
        
        const totalUsers = userEntries.length;
        connectionCount.textContent = `${onlineCount}/${totalUsers} 人在线`;
        
        console.log(`✅ 用户列表已更新: ${onlineCount}/${totalUsers} 在线`);
    }

    // 判断用户是否在线
    isUserOnline(userData, currentTime) {
        if (userData.isOnline === false) return false;
        
        // 如果有心跳时间，检查心跳是否超时（2分钟）
        if (userData.lastHeartbeat) {
            const heartbeatTime = typeof userData.lastHeartbeat === 'object' 
                ? new Date().getTime() // 服务器时间戳，使用当前时间近似
                : userData.lastHeartbeat;
            return (currentTime - heartbeatTime) < 120000; // 2分钟
        }
        
        // 如果没有心跳但有lastSeen，检查是否超时（5分钟）
        if (userData.lastSeen) {
            const lastSeenTime = typeof userData.lastSeen === 'object' 
                ? new Date().getTime() 
                : userData.lastSeen;
            return (currentTime - lastSeenTime) < 300000; // 5分钟
        }
        
        // 默认认为在线
        return userData.isOnline !== false;
    }

    // 获取最后活跃时间文本
    getLastSeenText(lastSeen, isOnline) {
        if (isOnline) return '刚刚活跃';
        
        if (!lastSeen) return '未知';
        
        const lastSeenTime = typeof lastSeen === 'object' ? new Date().getTime() : lastSeen;
        const diff = Date.now() - lastSeenTime;
        
        if (diff < 60000) return '1分钟前';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return `${Math.floor(diff / 86400000)}天前`;
    }

    // 显示临时消息
    showTemporaryMessage(message, type = 'info') {
        // 创建消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `temporary-message ${type}`;
        messageDiv.textContent = message;
        
        // 设置样式
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10001;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // 添加到页面
        document.body.appendChild(messageDiv);
        
        // 3秒后自动移除
        setTimeout(() => {
            messageDiv.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    // 隐藏房间信息
    hideRoomInfo() {
        const roomInfo = document.getElementById('room-info');
        if (roomInfo) {
            roomInfo.remove();
        }
    }

    // 调试：检查房间用户数据
    async debugRoomUsers() {
        if (!this.roomId || !this.usersRef) {
            console.log('🔍 调试：没有房间ID或用户引用');
            return;
        }
        
        try {
            const snapshot = await this.firebaseUtils.get(this.usersRef);
            const users = snapshot.val();
            console.log('🔍 调试：Firebase房间用户数据:', users);
            
            if (users) {
                const userCount = Object.keys(users).length;
                console.log(`🔍 调试：发现 ${userCount} 个用户`);
                Object.entries(users).forEach(([userId, userData]) => {
                    console.log(`🔍 调试：用户 ${userId}:`, userData);
                });
            } else {
                console.log('🔍 调试：没有用户数据');
            }
        } catch (error) {
            console.error('🔍 调试：获取用户数据失败:', error);
        }
    }
}
