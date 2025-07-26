// P2P协作管理器 - 基于WebRTC的点对点多人协作
export class CollaborationManager {
    constructor(storageManager, uiManager, statsManager) {
        this.storageManager = storageManager;
        this.uiManager = uiManager;
        this.statsManager = statsManager;
        
        // 用户信息
        this.userId = this.generateUserId();
        this.userName = this.getUserName();
        this.userColor = this.generateUserColor();
        
        // 房间信息
        this.roomId = null;
        this.isHost = false;
        this.connectedPeers = new Map(); // 连接的对等端
        this.pendingConnections = new Map(); // 待连接的对等端
        
        // WebRTC配置
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        // 信令服务器（简单的Firebase或免费WebSocket服务）
        this.signalingChannel = null;
        this.isSignalingConnected = false;
        
        // 房间状态
        this.roomData = {
            users: new Map(),
            gameState: {},
            lastUpdate: Date.now()
        };
        
        // 绑定事件
        this.bindEvents();
        
        // 初始化信令通道
        this.initSignalingChannel();
    }

    // 生成用户ID
    generateUserId() {
        let userId = localStorage.getItem('collaboration_userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('collaboration_userId', userId);
        }
        return userId;
    }

    // 获取用户名
    getUserName() {
        let userName = localStorage.getItem('collaboration_userName');
        if (!userName) {
            userName = prompt('请输入您的用户名（用于多人协作）:') || `用户${Math.floor(Math.random() * 1000)}`;
            localStorage.setItem('collaboration_userName', userName);
        }
        return userName;
    }

    // 生成用户颜色
    generateUserColor() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        let userColor = localStorage.getItem('collaboration_userColor');
        if (!userColor) {
            userColor = colors[Math.floor(Math.random() * colors.length)];
            localStorage.setItem('collaboration_userColor', userColor);
        }
        return userColor;
    }

    // 初始化信令通道（使用免费的信令服务）
    initSignalingChannel() {
        try {
            // 使用免费的WebSocket信令服务或者简单的轮询方式
            // 这里使用一个简化的localStorage + BroadcastChannel方案作为本地测试
            this.signalingChannel = new BroadcastChannel('spawn-timer-signaling');
            
            this.signalingChannel.onmessage = (event) => {
                this.handleSignalingMessage(event.data);
            };
            
            this.isSignalingConnected = true;
            console.log('本地信令通道已连接');
            
            // 也可以连接到免费的在线信令服务
            this.connectToOnlineSignaling();
            
        } catch (error) {
            console.error('信令通道初始化失败:', error);
            this.uiManager.showWarning('协作功能初始化失败，将使用离线模式');
        }
    }

    // 连接到在线信令服务（可选）
    connectToOnlineSignaling() {
        try {
            // 使用免费的WebSocket服务，如 wss://socketio-chat-h9jt.herokuapp.com/socket.io/
            // 或者使用 Socket.IO 的免费实例
            const signalingWs = new WebSocket('wss://ws.postman-echo.com/raw');
            
            signalingWs.onopen = () => {
                console.log('在线信令服务已连接');
                this.onlineSignaling = signalingWs;
            };
            
            signalingWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'signaling') {
                        this.handleSignalingMessage(data.payload);
                    }
                } catch (e) {
                    // 忽略非协作消息
                }
            };
            
            signalingWs.onerror = () => {
                console.log('在线信令服务连接失败，使用本地模式');
            };
            
        } catch (error) {
            console.log('在线信令服务不可用，使用本地模式');
        }
    }

    // 发送信令消息
    sendSignalingMessage(message) {
        const signalingMessage = {
            ...message,
            sender: this.userId,
            timestamp: Date.now()
        };
        
        // 本地信令
        if (this.signalingChannel) {
            this.signalingChannel.postMessage(signalingMessage);
        }
        
        // 在线信令
        if (this.onlineSignaling && this.onlineSignaling.readyState === WebSocket.OPEN) {
            this.onlineSignaling.send(JSON.stringify({
                type: 'signaling',
                payload: signalingMessage
            }));
        }
    }

    // 处理信令消息
    handleSignalingMessage(message) {
        if (message.sender === this.userId) return; // 忽略自己的消息
        
        switch (message.type) {
            case 'room-announcement':
                this.handleRoomAnnouncement(message);
                break;
            case 'join-request':
                this.handleJoinRequest(message);
                break;
            case 'ice-candidate':
                this.handleIceCandidate(message);
                break;
            case 'offer':
                this.handleOffer(message);
                break;
            case 'answer':
                this.handleAnswer(message);
                break;
        }
    }

    // 创建房间（成为房主）
    createRoom() {
        if (!this.isSignalingConnected) {
            this.uiManager.showError('信令通道未连接，无法创建房间');
            return;
        }
        
        this.roomId = 'room_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
        this.isHost = true;
        
        // 初始化房间数据
        this.roomData = {
            users: new Map(),
            gameState: this.getCurrentGameState(),
            lastUpdate: Date.now()
        };
        
        // 添加自己到房间
        this.roomData.users.set(this.userId, {
            userId: this.userId,
            userName: this.userName,
            userColor: this.userColor,
            isHost: true
        });
        
        // 广播房间信息
        this.sendSignalingMessage({
            type: 'room-announcement',
            roomId: this.roomId,
            hostId: this.userId,
            hostName: this.userName,
            action: 'created'
        });
        
        this.uiManager.showSuccess(`房间创建成功！房间号: ${this.roomId}`);
        this.showRoomInfo();
        
        console.log('房间已创建:', this.roomId);
    }

    // 加入房间
    joinRoom(roomId) {
        if (!this.isSignalingConnected) {
            this.uiManager.showError('信令通道未连接，无法加入房间');
            return;
        }
        
        this.roomId = roomId;
        this.isHost = false;
        
        // 发送加入请求
        this.sendSignalingMessage({
            type: 'join-request',
            roomId: roomId,
            userId: this.userId,
            userName: this.userName,
            userColor: this.userColor
        });
        
        this.uiManager.showInfo('正在加入房间...');
        console.log('发送加入请求:', roomId);
    }

    // 处理房间公告
    handleRoomAnnouncement(message) {
        if (message.action === 'created') {
            console.log(`发现房间: ${message.roomId} (房主: ${message.hostName})`);
        }
    }

    // 处理加入请求（房主处理）
    handleJoinRequest(message) {
        if (!this.isHost || message.roomId !== this.roomId) return;
        
        console.log(`收到加入请求: ${message.userName}`);
        
        // 创建WebRTC连接
        this.createPeerConnection(message.userId, message.userName, message.userColor, true);
    }

    // 创建P2P连接
    async createPeerConnection(peerId, peerName, peerColor, isInitiator = false) {
        try {
            const peerConnection = new RTCPeerConnection(this.rtcConfig);
            
            // 创建数据通道
            let dataChannel;
            if (isInitiator) {
                dataChannel = peerConnection.createDataChannel('collaboration', {
                    ordered: true
                });
            } else {
                peerConnection.ondatachannel = (event) => {
                    dataChannel = event.channel;
                    this.setupDataChannel(dataChannel, peerId, peerName, peerColor);
                };
            }
            
            // ICE候选处理
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendSignalingMessage({
                        type: 'ice-candidate',
                        roomId: this.roomId,
                        targetPeer: peerId,
                        candidate: event.candidate
                    });
                }
            };
            
            // 连接状态变化
            peerConnection.onconnectionstatechange = () => {
                console.log(`P2P连接状态: ${peerConnection.connectionState} (${peerName})`);
                
                if (peerConnection.connectionState === 'connected') {
                    this.uiManager.showSuccess(`${peerName} 已连接`);
                } else if (peerConnection.connectionState === 'disconnected' || 
                          peerConnection.connectionState === 'failed') {
                    this.handlePeerDisconnect(peerId);
                }
            };
            
            // 存储连接信息
            this.connectedPeers.set(peerId, {
                connection: peerConnection,
                dataChannel: null,
                userName: peerName,
                userColor: peerColor,
                isConnected: false
            });
            
            if (isInitiator) {
                // 房主发起连接
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                
                this.sendSignalingMessage({
                    type: 'offer',
                    roomId: this.roomId,
                    targetPeer: peerId,
                    offer: offer
                });
                
                // 设置数据通道
                this.setupDataChannel(dataChannel, peerId, peerName, peerColor);
            }
            
        } catch (error) {
            console.error('创建P2P连接失败:', error);
            this.uiManager.showError(`连接 ${peerName} 失败`);
        }
    }

    // 设置数据通道
    setupDataChannel(dataChannel, peerId, peerName, peerColor) {
        dataChannel.onopen = () => {
            console.log(`数据通道已开启: ${peerName}`);
            
            const peer = this.connectedPeers.get(peerId);
            if (peer) {
                peer.dataChannel = dataChannel;
                peer.isConnected = true;
                
                // 如果是房主，发送当前游戏状态
                if (this.isHost) {
                    this.sendToPeer(peerId, {
                        type: 'sync_state',
                        gameState: this.getCurrentGameState(),
                        roomUsers: Array.from(this.roomData.users.values())
                    });
                }
                
                // 更新房间用户列表
                this.roomData.users.set(peerId, {
                    userId: peerId,
                    userName: peerName,
                    userColor: peerColor,
                    isHost: false
                });
                
                this.updateUsersList();
                this.uiManager.showInfo(`${peerName} 加入了房间`);
            }
        };
        
        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleP2PMessage(peerId, message);
            } catch (error) {
                console.error('处理P2P消息错误:', error);
            }
        };
        
        dataChannel.onclose = () => {
            console.log(`数据通道已关闭: ${peerName}`);
            this.handlePeerDisconnect(peerId);
        };
        
        dataChannel.onerror = (error) => {
            console.error(`数据通道错误 (${peerName}):`, error);
        };
    }

    // 处理ICE候选
    handleIceCandidate(message) {
        if (message.targetPeer !== this.userId) return;
        
        const peer = this.connectedPeers.get(message.sender);
        if (peer && peer.connection) {
            peer.connection.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
    }

    // 处理Offer
    async handleOffer(message) {
        if (message.targetPeer !== this.userId) return;
        
        console.log('收到连接Offer');
        
        // 创建P2P连接来响应offer
        await this.createPeerConnection(message.sender, '连接中...', '#3498db', false);
        
        const peer = this.connectedPeers.get(message.sender);
        if (peer) {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(message.offer));
            
            const answer = await peer.connection.createAnswer();
            await peer.connection.setLocalDescription(answer);
            
            this.sendSignalingMessage({
                type: 'answer',
                roomId: this.roomId,
                targetPeer: message.sender,
                answer: answer
            });
        }
    }

    // 处理Answer
    async handleAnswer(message) {
        if (message.targetPeer !== this.userId) return;
        
        const peer = this.connectedPeers.get(message.sender);
        if (peer && peer.connection) {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(message.answer));
        }
    }

    // 离开房间
    leaveRoom() {
        if (!this.roomId) return;
        
        // 关闭所有P2P连接
        this.connectedPeers.forEach((peer, peerId) => {
            if (peer.dataChannel) {
                peer.dataChannel.close();
            }
            if (peer.connection) {
                peer.connection.close();
            }
        });
        
        // 如果是房主，广播房间关闭
        if (this.isHost) {
            this.sendSignalingMessage({
                type: 'room-announcement',
                roomId: this.roomId,
                hostId: this.userId,
                action: 'closed'
            });
        }
        
        // 清理状态
        this.connectedPeers.clear();
        this.roomData.users.clear();
        this.roomId = null;
        this.isHost = false;
        
        this.hideRoomInfo();
        this.uiManager.showInfo('已离开房间');
    }

    // 发送消息给特定对等端
    sendToPeer(peerId, message) {
        const peer = this.connectedPeers.get(peerId);
        if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
            peer.dataChannel.send(JSON.stringify(message));
        }
    }

    // 广播消息给所有对等端
    broadcastToPeers(message) {
        this.connectedPeers.forEach((peer, peerId) => {
            if (peer.isConnected) {
                this.sendToPeer(peerId, message);
            }
        });
    }

    // 处理P2P消息
    handleP2PMessage(senderId, message) {
        switch (message.type) {
            case 'sync_state':
                this.handleStateSync(message);
                break;
            case 'line_state_changed':
                this.handleRemoteLineStateChange(message);
                break;
            case 'user_cursor':
                this.showUserCursor(message);
                break;
            case 'user_joined':
                this.handleUserJoined(message);
                break;
            case 'user_left':
                this.handleUserLeft(senderId);
                break;
        }
    }

    // 处理状态同步
    handleStateSync(message) {
        console.log('同步游戏状态');
        
        // 更新房间用户列表
        if (message.roomUsers) {
            message.roomUsers.forEach(user => {
                this.roomData.users.set(user.userId, user);
            });
        }
        
        // 同步游戏状态
        if (message.gameState) {
            this.applyGameState(message.gameState);
        }
        
        this.updateUsersList();
        this.uiManager.showSuccess('状态同步完成');
    }

    // 获取当前游戏状态
    getCurrentGameState() {
        const gameState = {};
        
        // 获取所有线路状态
        for (let i = 1; i <= 400; i++) {
            const cell = document.querySelector(`td[data-line="${i}"]`);
            if (cell) {
                const state = this.storageManager.getLineState(i);
                const killTime = this.storageManager.getKillTime(i);
                
                if (state) {
                    gameState[i] = {
                        state: state,
                        killTime: killTime,
                        timestamp: Date.now()
                    };
                }
            }
        }
        
        return gameState;
    }

    // 应用游戏状态
    applyGameState(gameState) {
        Object.keys(gameState).forEach(lineNumber => {
            const lineData = gameState[lineNumber];
            this.updateLocalLineState(lineNumber, lineData.state, lineData.killTime, false);
        });
        
        // 更新统计
        this.statsManager.updateStats();
    }

    // 处理对等端断开连接
    handlePeerDisconnect(peerId) {
        const peer = this.connectedPeers.get(peerId);
        if (peer) {
            this.uiManager.showInfo(`${peer.userName} 离开了房间`);
            this.connectedPeers.delete(peerId);
            this.roomData.users.delete(peerId);
            this.updateUsersList();
        }
    }

    // 同步线路状态变更
    syncLineStateChange(lineNumber, state, killTime = null) {
        if (!this.roomId) return;
        
        const message = {
            type: 'line_state_changed',
            userId: this.userId,
            userName: this.userName,
            lineNumber: parseInt(lineNumber),
            state: state,
            killTime: killTime,
            timestamp: Date.now()
        };
        
        // 广播给所有连接的对等端
        this.broadcastToPeers(message);
        
        // 如果是房主，更新房间状态
        if (this.isHost) {
            if (!this.roomData.gameState) {
                this.roomData.gameState = {};
            }
            
            if (state === 'cancelled') {
                delete this.roomData.gameState[lineNumber];
            } else {
                this.roomData.gameState[lineNumber] = {
                    state: state,
                    killTime: killTime,
                    timestamp: Date.now(),
                    updatedBy: this.userId
                };
            }
        }
    }

    // 处理远程线路状态变更
    handleRemoteLineStateChange(message) {
        // 防止处理自己发送的消息
        if (message.userId === this.userId) return;
        
        const { lineNumber, state, killTime, userName } = message;
        const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
        
        if (!cell) return;
        
        // 显示操作者信息
        this.showUserAction(cell, userName, state);
        
        // 更新本地状态（不触发同步）
        this.updateLocalLineState(lineNumber, state, killTime, false);
        
        // 更新统计
        this.statsManager.updateStats();
    }

    // 更新本地线路状态（不触发同步）
    updateLocalLineState(lineNumber, state, killTime = null, shouldSync = true) {
        const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
        if (!cell) return;
        
        // 移除所有状态类
        cell.classList.remove('killed', 'killed-unknown', 'refreshed');
        
        // 添加新状态
        if (state === 'killed' || state === 'killed-unknown') {
            cell.classList.add(state);
            
            if (killTime && state === 'killed') {
                // 启动倒计时
                if (window.app && window.app.timerManager) {
                    window.app.timerManager.startTimer(lineNumber, killTime, null, cell, 
                        window.app.onTimerComplete.bind(window.app));
                }
            }
            
            // 更新存储
            this.storageManager.setLineState(lineNumber, state);
            if (killTime) {
                this.storageManager.setKillTime(lineNumber, killTime);
            }
        } else if (state === 'refreshed') {
            cell.classList.add('refreshed');
            this.storageManager.setLineState(lineNumber, 'refreshed');
        } else {
            // 清除状态
            this.storageManager.removeLineState(lineNumber);
            this.storageManager.removeKillTime(lineNumber);
        }
        
        // 同步到其他用户（如果需要）
        if (shouldSync) {
            this.syncLineStateChange(lineNumber, state, killTime);
        }
    }

    // 显示用户操作提示
    showUserAction(cell, userName, action) {
        const indicator = document.createElement('div');
        indicator.className = 'user-action-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${this.getUserColor(userName)};
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out forwards;
        `;
        
        const actionText = {
            'killed': '击杀',
            'killed-unknown': '击杀(未知)',
            'refreshed': '刷新',
            'cancelled': '取消'
        };
        
        indicator.textContent = `${userName}: ${actionText[action] || action}`;
        
        cell.style.position = 'relative';
        cell.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    }

    // 获取用户颜色
    getUserColor(userName) {
        // 根据用户名生成一致的颜色
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        let hash = 0;
        for (let i = 0; i < userName.length; i++) {
            hash = userName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    // 绑定事件
    bindEvents() {
        // 监听线路状态变更
        document.addEventListener('lineStateChanged', (event) => {
            const { lineNumber, state, killTime } = event.detail;
            this.syncLineStateChange(lineNumber, state, killTime);
        });
        
        // 监听鼠标移动（显示用户光标）
        document.addEventListener('mousemove', (event) => {
            if (this.roomId && this.connectedPeers.size > 0) {
                this.throttle(() => {
                    this.broadcastToPeers({
                        type: 'user_cursor',
                        userId: this.userId,
                        userName: this.userName,
                        x: event.clientX,
                        y: event.clientY
                    });
                }, 100)();
            }
        });
        
        // 监听页面关闭事件
        window.addEventListener('beforeunload', () => {
            this.leaveRoom();
        });
    }

    // 节流函数
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    // 显示房间信息
    showRoomInfo() {
        const roomInfo = document.createElement('div');
        roomInfo.id = 'room-info';
        roomInfo.className = 'room-info';
        roomInfo.innerHTML = `
            <div class="room-header">
                <h3>🏠 协作房间</h3>
                <button id="leave-room-btn" class="leave-room-btn">离开房间</button>
            </div>
            <div class="room-details">
                <p><strong>房间号:</strong> <span id="room-id-display">${this.roomId}</span> 
                   <button id="copy-room-id" class="copy-btn">📋</button></p>
                <p><strong>角色:</strong> ${this.isHost ? '房主' : '成员'}</p>
                <p><strong>在线用户:</strong></p>
                <div id="users-list" class="users-list"></div>
            </div>
        `;
        
        // 添加样式
        roomInfo.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 2px solid #3498db;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 250px;
            max-width: 300px;
        `;
        
        document.body.appendChild(roomInfo);
        
        // 绑定事件
        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        document.getElementById('copy-room-id').addEventListener('click', () => {
            navigator.clipboard.writeText(this.roomId).then(() => {
                this.uiManager.showSuccess('房间号已复制到剪贴板');
            });
        });
        
        this.updateUsersList();
    }

    // 隐藏房间信息
    hideRoomInfo() {
        const roomInfo = document.getElementById('room-info');
        if (roomInfo) {
            roomInfo.remove();
        }
    }

    // 更新用户列表
    updateUsersList() {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;
        
        usersList.innerHTML = '';
        
        // 添加自己
        const selfUser = document.createElement('div');
        selfUser.className = 'user-item';
        selfUser.innerHTML = `
            <span class="user-color" style="background: ${this.userColor}"></span>
            <span class="user-name">${this.userName} (你${this.isHost ? ' - 房主' : ''})</span>
            <span class="user-status">●</span>
        `;
        usersList.appendChild(selfUser);
        
        // 添加连接的用户
        this.connectedPeers.forEach((peer, peerId) => {
            if (peer.isConnected) {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.innerHTML = `
                    <span class="user-color" style="background: ${peer.userColor}"></span>
                    <span class="user-name">${peer.userName}</span>
                    <span class="user-status connected">●</span>
                `;
                usersList.appendChild(userItem);
            }
        });
        
        // 显示连接统计
        const connectedCount = Array.from(this.connectedPeers.values()).filter(p => p.isConnected).length;
        const connectionStatus = document.getElementById('connection-count');
        if (connectionStatus) {
            connectionStatus.textContent = `${connectedCount + 1} 人在线`;
        }
    }

    // 显示用户光标
    showUserCursor(message) {
        if (message.userId === this.userId) return;
        
        let cursor = document.getElementById(`cursor-${message.userId}`);
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = `cursor-${message.userId}`;
            cursor.className = 'user-cursor';
            cursor.style.cssText = `
                position: fixed;
                width: 20px;
                height: 20px;
                background: ${this.getUserColor(message.userName)};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                transform: translate(-50%, -50%);
                opacity: 0.7;
            `;
            document.body.appendChild(cursor);
            
            // 添加用户名标签
            const nameLabel = document.createElement('div');
            nameLabel.className = 'cursor-name';
            nameLabel.style.cssText = `
                position: absolute;
                top: 25px;
                left: 50%;
                transform: translateX(-50%);
                background: ${this.getUserColor(message.userName)};
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
                white-space: nowrap;
            `;
            nameLabel.textContent = message.userName;
            cursor.appendChild(nameLabel);
        }
        
        cursor.style.left = message.x + 'px';
        cursor.style.top = message.y + 'px';
        
        // 清除旧的定时器
        if (cursor.hideTimer) {
            clearTimeout(cursor.hideTimer);
        }
        
        // 显示光标
        cursor.style.display = 'block';
        
        // 3秒后隐藏光标
        cursor.hideTimer = setTimeout(() => {
            cursor.style.display = 'none';
        }, 3000);
    }

    // 显示协作界面
    showCollaborationDialog() {
        const modal = document.createElement('div');
        modal.className = 'collaboration-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🤝 P2P多人协作</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="connection-status">
                        <p>连接模式: <span style="color: #27ae60; font-weight: bold;">点对点 (P2P)</span></p>
                        <p>信令状态: <span id="signaling-status">${this.isSignalingConnected ? '✅ 已连接' : '❌ 未连接'}</span></p>
                        <p><small>💡 房主充当服务器，无需独立服务器</small></p>
                    </div>
                    
                    <div class="room-actions">
                        <h4>房间操作</h4>
                        <button id="create-room-btn" class="action-btn" ${!this.isSignalingConnected ? 'disabled' : ''}>
                            🏠 创建房间 (成为房主)
                        </button>
                        
                        <div class="join-room-section">
                            <input type="text" id="room-id-input" placeholder="输入房间号" />
                            <button id="join-room-btn" class="action-btn" ${!this.isSignalingConnected ? 'disabled' : ''}>
                                🚪 加入房间
                            </button>
                        </div>
                        
                        <div class="p2p-info">
                            <h4>📡 P2P协作说明</h4>
                            <ul>
                                <li>房主创建房间后，浏览器自动充当服务器</li>
                                <li>其他用户直接连接到房主</li>
                                <li>房主离开后房间自动关闭</li>
                                <li>支持多人实时同步操作</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="user-settings">
                        <h4>个人设置</h4>
                        <label>用户名: <input type="text" id="username-input" value="${this.userName}" /></label>
                        <label>颜色: <input type="color" id="color-input" value="${this.userColor}" /></label>
                        <button id="save-settings-btn" class="action-btn">保存设置</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.bindCollaborationEvents(modal);
        
        // 显示动画
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // 绑定协作对话框事件
    bindCollaborationEvents(modal) {
        // 关闭按钮
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // 创建房间
        modal.querySelector('#create-room-btn').addEventListener('click', () => {
            this.createRoom();
            modal.remove();
        });
        
        // 加入房间
        modal.querySelector('#join-room-btn').addEventListener('click', () => {
            const roomId = modal.querySelector('#room-id-input').value.trim();
            if (roomId) {
                this.joinRoom(roomId);
                modal.remove();
            } else {
                this.uiManager.showError('请输入房间号');
            }
        });
        
        // 保存设置
        modal.querySelector('#save-settings-btn').addEventListener('click', () => {
            const newUserName = modal.querySelector('#username-input').value.trim();
            const newColor = modal.querySelector('#color-input').value;
            
            if (newUserName) {
                this.userName = newUserName;
                this.userColor = newColor;
                
                localStorage.setItem('collaboration_userName', this.userName);
                localStorage.setItem('collaboration_userColor', this.userColor);
                
                this.uiManager.showSuccess('设置已保存');
                
                // 如果在房间中，广播用户信息更新
                if (this.roomId) {
                    this.broadcastToPeers({
                        type: 'user_info_updated',
                        userId: this.userId,
                        userName: this.userName,
                        userColor: this.userColor
                    });
                }
                
                this.updateUsersList();
            }
        });
        
        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 显示房间信息
    showRoomInfo() {
        const roomInfo = document.createElement('div');
        roomInfo.id = 'room-info';
        roomInfo.className = 'room-info';
        roomInfo.innerHTML = `
            <div class="room-header">
                <h3>🏠 P2P协作房间</h3>
                <button id="leave-room-btn" class="leave-room-btn">离开房间</button>
            </div>
            <div class="room-details">
                <p><strong>房间号:</strong> <span id="room-id-display">${this.roomId}</span> 
                   <button id="copy-room-id" class="copy-btn">📋</button></p>
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
        
        document.getElementById('copy-room-id').addEventListener('click', () => {
            navigator.clipboard.writeText(this.roomId).then(() => {
                this.uiManager.showSuccess('房间号已复制到剪贴板');
            });
        });
        
        this.updateUsersList();
    }

    // 断开连接（清理方法）
    disconnect() {
        if (this.signalingChannel) {
            this.signalingChannel.close();
            this.signalingChannel = null;
        }
        
        if (this.onlineSignaling) {
            this.onlineSignaling.close();
            this.onlineSignaling = null;
        }
        
        this.isSignalingConnected = false;
        this.leaveRoom();
    }
}
}
