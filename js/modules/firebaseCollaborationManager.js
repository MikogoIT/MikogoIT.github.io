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
        
        // 初始化Firebase
        this.initFirebase();
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
            this.isConnected = snapshot.val() === true;
            console.log('Firebase连接状态:', this.isConnected ? '已连接' : '已断开');
            
            // 更新房间状态组件中的连接状态
            if (typeof window.updateConnectionStatus === 'function') {
                window.updateConnectionStatus(this.isConnected);
            }
            
            if (this.isConnected && this.roomId) {
                // 重新连接后更新用户在线状态
                this.updateUserPresence();
            }
        });
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
                        name: this.userName,
                        color: this.userColor,
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
                name: this.userName,
                color: this.userColor,
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
        if (!this.roomId) return;
        
        try {
            console.log('离开房间:', this.roomId);
            
            // 移除事件监听器
            this.removeRoomListeners();
            
            if (this.isHost) {
                // 如果是房主，关闭房间
                const activeRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/info/isActive`);
                await this.firebaseUtils.set(activeRef, false);
                console.log('房主离开，房间已关闭');
            } else {
                // 移除用户
                const userRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/users/${this.userId}`);
                await this.firebaseUtils.remove(userRef);
            }
            
            // 重置状态
            this.roomId = null;
            this.isHost = false;
            this.roomRef = null;
            this.usersRef = null;
            this.gameStateRef = null;
            
            // 隐藏房间信息
            this.hideRoomInfo();
            
            console.log('✅ 已离开房间');
            
        } catch (error) {
            console.error('❌ 离开房间失败:', error);
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
        if (!this.roomId || !this.userId) return;
        
        const userRef = this.firebaseUtils.ref(this.database, `rooms/${this.roomId}/users/${this.userId}`);
        
        // 设置在线状态
        const updateData = {
            isOnline: true,
            lastSeen: this.firebaseUtils.serverTimestamp()
        };
        this.firebaseUtils.update(userRef, updateData);
        
        // 设置离线时自动清理
        const disconnectRef = this.firebaseUtils.onDisconnect(userRef);
        const offlineData = {
            isOnline: false,
            lastSeen: this.firebaseUtils.serverTimestamp()
        };
        disconnectRef.update(offlineData);
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
            } else if (state === 'refreshed') {
                updates[`lineStates/${lineNumber}`] = {
                    state: state,
                    killTime: null,
                    userId: this.userId,
                    userName: this.userName
                };
            } else {
                // 清除状态
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
        if (!users) return;
        
        const userCount = Object.keys(users).length;
        console.log('用户列表更新:', userCount, '个用户');
        
        // 更新房间状态组件中的用户数量
        if (typeof window.updateRoomUserCount === 'function') {
            window.updateRoomUserCount(userCount);
        }
        
        // 更新用户列表显示（如果有UI组件的话）
        // this.updateUserListUI(users);
        
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
        
        console.log('游戏状态更新');
        
        // 防止自己的操作触发重复更新
        if (this._isLocalUpdate) {
            this._isLocalUpdate = false;
            return;
        }
        
        // 更新本地状态
        this.updateLocalStateFromRemote(gameState);
        
        // 更新统计信息
        if (gameState.statistics && this.statsManager) {
            // 可以更新统计显示
            console.log('统计数据:', gameState.statistics);
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
            }
            
        } catch (error) {
            console.error('❌ 更新本地状态失败:', error);
        }
    }
    
    // 更新单元格显示
    updateCellDisplay(lineNumber, data) {
        const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
        if (!cell) return;
        
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
                tooltip.textContent = `${data.userName}标记击杀 - 双击取消`;
            } else if (data.state === 'refreshed') {
                tooltip.textContent = `${data.userName}标记刷新 - 点击击杀`;
            }
        }
        
        // 如果是击杀状态且有时间，启动倒计时
        if (data.state === 'killed' && data.killTime && window.app && window.app.timerManager) {
            const currentTime = new Date().getTime();
            const elapsed = currentTime - data.killTime;
            const timerDuration = window.app.testMode ? 10000 : (24 * 60 * 60 * 1000);
            
            if (elapsed < timerDuration) {
                const remaining = timerDuration - elapsed;
                window.app.timerManager.startTimer(lineNumber, data.killTime, remaining, cell, 
                    (completedLine) => {
                        if (window.app && window.app.eventManager) {
                            window.app.eventManager.onTimerComplete(completedLine);
                        }
                    });
            }
        }
    }
    
    // 清除单元格显示
    clearCellDisplay(lineNumber) {
        const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
        if (!cell) return;
        
        // 清除状态类
        cell.classList.remove('killed', 'killed-unknown', 'refreshed');
        
        // 重置tooltip
        const tooltip = cell.querySelector('.tooltip');
        if (tooltip) {
            tooltip.textContent = '左键击杀开始倒计时，右键击杀但不知时间';
        }
        
        // 清除倒计时
        const timerElement = cell.querySelector('.timer-display');
        if (timerElement) {
            timerElement.textContent = '';
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
                <button id="leave-room-btn" class="leave-room-btn">离开房间</button>
            </div>
            <div class="room-details">
                <p><strong>房间号:</strong> <span id="room-id-display">${this.roomId}</span> 
                   <button id="copy-room-id" class="copy-btn" title="复制房间号">📋</button></p>
                <p><strong>状态:</strong> <span id="connection-status">${this.isConnected ? '🟢 在线' : '🔴 离线'}</span></p>
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
            min-width: 280px;
            max-width: 350px;
        `;
        
        document.body.appendChild(roomInfo);
        
        // 绑定事件
        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        document.getElementById('copy-room-id').addEventListener('click', async () => {
            await this.copyRoomId();
        });
        
        // 更新用户列表
        this.updateRoomInfoUsersList();
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
    updateRoomInfoUsersList() {
        const usersList = document.getElementById('users-list');
        const connectionCount = document.getElementById('connection-count');
        
        if (!usersList || !connectionCount) {
            return;
        }
        
        // 清空现有列表
        usersList.innerHTML = '';
        
        // 添加当前用户
        const currentUserDiv = document.createElement('div');
        currentUserDiv.className = 'user-item';
        currentUserDiv.innerHTML = `
            <div class="user-color" style="background-color: ${this.userColor || '#3498db'}"></div>
            <span class="user-name">${this.userName || '我'} ${this.isHost ? '(房主)' : ''}</span>
            <span class="user-status connected">在线</span>
        `;
        usersList.appendChild(currentUserDiv);
        
        // 更新连接数（这里可以后续扩展来显示真实的用户数）
        connectionCount.textContent = '1 人在线';
    }

    // 显示临时消息
    showTemporaryMessage(message, type = 'success') {
        // 移除已存在的消息
        const existingMessage = document.querySelector('.temporary-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `temporary-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10001;
            max-width: 300px;
            word-wrap: break-word;
            animation: messageSlideIn 0.3s ease;
        `;
        
        // 设置背景颜色
        switch (type) {
            case 'success':
                messageDiv.style.background = '#28a745';
                break;
            case 'warning':
                messageDiv.style.background = '#ffc107';
                messageDiv.style.color = '#212529';
                break;
            case 'error':
                messageDiv.style.background = '#dc3545';
                break;
            default:
                messageDiv.style.background = '#17a2b8';
        }
        
        document.body.appendChild(messageDiv);
        
        // 自动隐藏
        setTimeout(() => {
            messageDiv.style.animation = 'messageSlideOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
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

    // ...existing code...
}
