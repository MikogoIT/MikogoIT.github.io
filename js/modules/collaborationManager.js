// P2P协作管理器 - 基于WebRTC的点对点多人协作
export class CollaborationManager {
    constructor(storageManager, uiManager, statsManager) {
        console.log('CollaborationManager构造函数开始');
        console.log('参数:', { storageManager, uiManager, statsManager });
        
        this.storageManager = storageManager;
        this.uiManager = uiManager;
        this.statsManager = statsManager;
        
        // 用户信息
        this.userId = this.generateUserId();
        this.userName = this.getUserName();
        this.userColor = this.generateUserColor();
        
        console.log('用户信息:', { userId: this.userId, userName: this.userName, userColor: this.userColor });
        
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
        
        // 信令服务器
        this.signalingChannel = null;
        this.isSignalingConnected = false;
        this.isOnlineSignalingConnected = false;
        this.socket = null; // Socket.IO连接
        this.signalingWs = null; // WebSocket连接
        
        // 房间状态
        this.roomData = {
            users: new Map(),
            gameState: {},
            lastUpdate: Date.now()
        };
        
        try {
            // 绑定事件
            console.log('绑定事件...');
            this.bindEvents();
            
            // 初始化信令通道
            console.log('初始化信令通道...');
            this.initSignalingChannel();
            
            console.log('CollaborationManager构造完成');
        } catch (error) {
            console.error('CollaborationManager初始化失败:', error);
        }
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

    // 初始化信令通道（优先使用本地BroadcastChannel）
    initSignalingChannel() {
        try {
            // 使用稳定的本地BroadcastChannel信令服务
            this.signalingChannel = new BroadcastChannel('spawn-timer-signaling');
            
            this.signalingChannel.onmessage = (event) => {
                this.handleSignalingMessage(event.data);
            };
            
            this.isSignalingConnected = true;
            console.log('✅ 本地信令通道已连接（支持同一浏览器多标签页协作）');
            
            // 显示协作模式信息
            this.showCollaborationModeInfo();
            
            // 检查用户是否启用了在线信令
            const enableOnlineSignaling = localStorage.getItem('enable-online-signaling') === 'true';
            if (enableOnlineSignaling) {
                console.log('用户启用了在线信令，尝试连接外部服务...');
                setTimeout(() => {
                    this.connectToOnlineSignaling();
                }, 2000);
            }
            
        } catch (error) {
            console.error('❌ 信令通道初始化失败:', error);
            console.log('将使用基础协作模式');
        }
    }

    // 显示协作模式信息
    showCollaborationModeInfo() {
        const enableOnlineSignaling = localStorage.getItem('enable-online-signaling') === 'true';
        
        if (enableOnlineSignaling) {
            console.log('📡 协作模式：在线模式（支持跨设备协作）');
        } else {
            console.log('🏠 协作模式：本地模式（同一浏览器多标签页协作）');
            console.log('💡 如需跨设备协作，请在协作设置中启用在线信令服务');
        }
    }

    // 连接到在线信令服务（支持真正的多人协作）
    connectToOnlineSignaling() {
        console.log('🌐 尝试连接在线信令服务...');
        
        // 首先检查网络连接
        if (!navigator.onLine) {
            console.log('❌ 网络连接不可用，跳过在线信令连接');
            this.showNetworkError();
            return;
        }
        
        // 尝试连接Socket.IO服务
        this.trySocketIOSignaling();
    }

    // 显示网络错误信息
    showNetworkError() {
        if (this.uiManager && this.uiManager.showMessage) {
            this.uiManager.showMessage('网络连接不可用，使用本地协作模式', 'warning');
        }
    }

    // 显示在线服务连接错误
    showOnlineServiceError() {
        if (this.uiManager && this.uiManager.showMessage) {
            this.uiManager.showMessage(
                '在线信令服务连接失败，已切换到本地模式。如需跨设备协作，请在协作设置中配置自己的信令服务器。', 
                'warning'
            );
        }
        console.log('💡 建议：');
        console.log('1. 使用本地模式（同一浏览器多标签页协作）');
        console.log('2. 配置自己的Socket.IO或Firebase信令服务器');
        console.log('3. 参考 MULTIPLAYER_SETUP_GUIDE.md 文档');
    }
    
    // 尝试Socket.IO信令服务
    trySocketIOSignaling() {
        try {
            // 检查是否加载了Socket.IO客户端
            if (typeof io === 'undefined') {
                console.log('Socket.IO客户端未加载，请添加以下脚本到HTML:');
                console.log('<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>');
                this.showSocketIOInstructions();
                return;
            }
            
            // 连接到免费的Socket.IO服务器（示例）
            // 您可以使用以下免费服务之一：
            const servers = [
                'https://socketio-chat-h9jt.herokuapp.com',  // 免费Heroku实例
                'wss://ws.pusher.com',                       // Pusher WebSockets
                'https://demo-chat-server.herokuapp.com'     // 另一个免费实例
            ];
            
            console.log('尝试连接Socket.IO服务器...');
            this.socket = io(servers[0], {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            
            this.socket.on('connect', () => {
                console.log('✅ Socket.IO连接成功');
                this.isOnlineSignalingConnected = true;
                this.updateSignalingStatus();
                
                // 加入协作频道
                this.socket.emit('join-collaboration', {
                    userId: this.userId,
                    userName: this.userName
                });
            });
            
            this.socket.on('collaboration-message', (data) => {
                this.handleSignalingMessage(data);
            });
            
            this.socket.on('disconnect', () => {
                console.log('❌ Socket.IO连接断开');
                this.isOnlineSignalingConnected = false;
                this.updateSignalingStatus();
            });
            
            this.socket.on('connect_error', (error) => {
                console.log('❌ Socket.IO连接失败:', error.message || error);
                console.log('免费服务器可能不可用，这很常见');
                this.showOnlineServiceError();
                // 不再尝试其他服务，直接使用本地模式
            });
            
            // 设置连接超时
            setTimeout(() => {
                if (!this.isOnlineSignalingConnected) {
                    console.log('⏰ Socket.IO连接超时，使用本地模式');
                    this.showOnlineServiceError();
                }
            }, 10000); // 10秒超时
            
        } catch (error) {
            console.log('❌ Socket.IO初始化失败:', error.message || error);
            this.showOnlineServiceError();
        }
    }
    
    // 尝试WebSocket信令服务（仅在用户明确要求时使用）
    tryWebSocketSignaling() {
        try {
            console.log('🌐 尝试WebSocket信令服务...');
            
            // 警告用户免费服务的限制
            console.log('⚠️  注意：免费WebSocket服务可能不稳定');
            
            // 使用免费WebSocket服务（echo服务，仅用于测试）
            const wsServers = [
                'wss://echo.websocket.org/',           // 免费echo服务（仅回显）
            ];
            
            this.signalingWs = new WebSocket(wsServers[0]);
            
            this.signalingWs.onopen = () => {
                console.log('✅ WebSocket连接已建立（echo测试服务）');
                console.log('⚠️  此服务仅回显消息，不支持真正的信令功能');
                this.isOnlineSignalingConnected = true;
                this.updateSignalingStatus();
                
                // 发送连接确认
                this.sendWebSocketMessage({
                    type: 'user-connected',
                    userId: this.userId,
                    userName: this.userName
                });
            };
            
            this.signalingWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type && data.type.startsWith('collaboration-')) {
                        this.handleSignalingMessage(data);
                    }
                } catch (e) {
                    // 忽略非协作消息
                }
            };
            
            this.signalingWs.onerror = (error) => {
                console.log('WebSocket信令服务错误:', error);
            };
            
            this.signalingWs.onclose = () => {
                console.log('WebSocket信令服务连接已关闭');
                this.isOnlineSignalingConnected = false;
                this.updateSignalingStatus();
            };
            
        } catch (error) {
            console.log('WebSocket信令服务初始化失败:', error);
        }
    }
    
    // 显示Socket.IO配置说明
    showSocketIOInstructions() {
        const instructions = `
要启用真正的多人协作，请按照以下步骤操作：

方案1: 使用Socket.IO (推荐)
1. 在HTML文件的<head>标签中添加：
   <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>

2. 或者下载socket.io.min.js文件到本地并引用

3. 刷新页面后重试协作功能

方案2: 自建服务器 (最稳定)
搭建自己的Node.js信令服务器 (详见开发文档)

方案3: 使用Firebase
配置Firebase Realtime Database (需要Google账号)
        `;
        
        console.log(instructions);
        alert('要启用真正的多人协作，请查看控制台中的配置说明');
    }

    // 获取信令状态文本
    getSignalingStatusText() {
        if (this.isOnlineSignalingConnected) {
            return '<span style="color: #27ae60;">✅ 在线协作已连接</span>';
        } else if (this.isSignalingConnected) {
            return '<span style="color: #f39c12;">🟡 仅本地协作</span>';
        } else {
            return '<span style="color: #e74c3c;">❌ 协作不可用</span>';
        }
    }

    // 发送信令消息
    sendSignalingMessage(message) {
        const signalingMessage = {
            ...message,
            sender: this.userId,
            timestamp: Date.now()
        };
        
        // 本地信令（BroadcastChannel）
        if (this.signalingChannel) {
            this.signalingChannel.postMessage(signalingMessage);
            console.log('发送本地信令消息:', message.type);
        }
        
        // 在线信令 - Socket.IO
        if (this.socket && this.socket.connected) {
            this.socket.emit('collaboration-message', signalingMessage);
            console.log('发送Socket.IO信令消息:', message.type);
        }
        
        // 在线信令 - WebSocket
        if (this.signalingWs && this.signalingWs.readyState === WebSocket.OPEN) {
            this.sendWebSocketMessage(signalingMessage);
            console.log('发送WebSocket信令消息:', message.type);
        }
        
        if (!this.signalingChannel && !this.isOnlineSignalingConnected) {
            console.warn('所有信令通道都不可用');
        }
    }
    
    // 发送WebSocket消息
    sendWebSocketMessage(message) {
        try {
            const wrappedMessage = {
                type: 'collaboration-' + message.type,
                ...message
            };
            this.signalingWs.send(JSON.stringify(wrappedMessage));
        } catch (error) {
            console.error('WebSocket发送失败:', error);
        }
    }
    
    // 更新信令状态显示
    updateSignalingStatus() {
        const statusElement = document.getElementById('signaling-status');
        if (statusElement) {
            if (this.isOnlineSignalingConnected) {
                statusElement.innerHTML = '✅ 在线协作已连接';
                statusElement.style.color = '#27ae60';
            } else if (this.isSignalingConnected) {
                statusElement.innerHTML = '🟡 仅本地协作';
                statusElement.style.color = '#f39c12';
            } else {
                statusElement.innerHTML = '❌ 协作不可用';
                statusElement.style.color = '#e74c3c';
            }
        }
    }

    // 处理信令消息
    handleSignalingMessage(message) {
        console.log('收到信令消息:', message.type, message);
        
        if (message.sender === this.userId) {
            console.log('忽略自己的消息');
            return; // 忽略自己的消息
        }
        
        switch (message.type) {
            case 'room-announcement':
                this.handleRoomAnnouncement(message);
                break;
            case 'join-request':
                this.handleJoinRequest(message);
                break;
            case 'join-accepted':
                this.handleJoinAccepted(message);
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
            default:
                console.log('未知消息类型:', message.type);
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
        
        // 设置超时检查
        this.joinTimeout = setTimeout(() => {
            if (!this.roomData || this.roomData.users.size <= 1) {
                this.uiManager.showError('加入房间超时，请检查房间号是否正确或房主是否在线');
                this.roomId = null;
                this.isHost = false;
            }
        }, 10000); // 10秒超时
    }

    // 处理房间公告
    handleRoomAnnouncement(message) {
        if (message.action === 'created') {
            console.log(`发现房间: ${message.roomId} (房主: ${message.hostName})`);
        }
    }

    // 处理加入请求（房主处理）
    handleJoinRequest(message) {
        console.log('处理加入请求:', message);
        
        if (!this.isHost) {
            console.log('不是房主，忽略加入请求');
            return;
        }
        
        if (message.roomId !== this.roomId) {
            console.log(`房间号不匹配: 收到 ${message.roomId}, 当前 ${this.roomId}`);
            return;
        }
        
        console.log(`收到加入请求: ${message.userName} 要加入房间 ${message.roomId}`);
        
        // 发送加入确认
        console.log('发送加入确认消息...');
        this.sendSignalingMessage({
            type: 'join-accepted',
            roomId: this.roomId,
            targetPeer: message.userId,
            hostId: this.userId,
            hostName: this.userName
        });
        
        // 添加用户到房间数据
        this.roomData.users.set(message.userId, {
            userId: message.userId,
            userName: message.userName,
            userColor: message.userColor,
            isHost: false
        });
        
        // 创建WebRTC连接
        this.createPeerConnection(message.userId, message.userName, message.userColor, true);
        
        // 更新房间信息显示
        this.updateUsersList();
        
        this.uiManager.showSuccess(`${message.userName} 请求加入房间`);
    }

    // 处理加入确认（加入者处理）
    handleJoinAccepted(message) {
        console.log('收到加入确认消息:', message);
        
        if (message.targetPeer !== this.userId) {
            console.log(`目标用户不匹配: 收到 ${message.targetPeer}, 当前 ${this.userId}`);
            return;
        }
        
        console.log(`加入房间被接受: ${message.roomId}`);
        
        // 清除加入超时
        if (this.joinTimeout) {
            clearTimeout(this.joinTimeout);
            this.joinTimeout = null;
        }
        
        // 更新房间状态
        this.isHost = false;
        this.roomId = message.roomId;
        
        // 初始化房间数据
        this.roomData = {
            users: new Map(),
            gameState: {},
            lastUpdate: Date.now()
        };
        
        // 添加自己到房间
        this.roomData.users.set(this.userId, {
            userId: this.userId,
            userName: this.userName,
            userColor: this.userColor,
            isHost: false
        });
        
        // 显示成功消息并显示房间信息
        this.uiManager.showSuccess(`成功加入房间: ${message.roomId}`);
        this.showRoomInfo();
        
        console.log('等待房主发起P2P连接...');
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
        
        console.log(`处理远程状态变更: 线路${lineNumber} -> ${state}, 操作者: ${userName}`);
        
        // 显示操作者信息
        this.showUserAction(cell, userName, state);
        
        // 更新本地状态（不触发同步）
        this.updateLocalLineState(lineNumber, state, killTime, false);
        
        // 如果是击杀事件，需要同步到统计管理器
        if (state === 'killed' && killTime) {
            console.log('添加远程击杀事件到统计');
            this.statsManager.addKillEvent(lineNumber, killTime);
            this.statsManager.recordKillEvent(lineNumber, killTime);
        } else if (state === 'cancelled') {
            console.log('移除远程击杀事件从统计');
            // 从统计中移除对应的击杀事件
            this.statsManager.removeKillEvent(lineNumber);
        }
        
        // 更新统计显示
        this.statsManager.updateStats();
        
        // 更新图表
        if (window.app && window.app.chartManager) {
            window.app.chartManager.updateChart();
        }
        
        // 触发状态变更事件
        document.dispatchEvent(new CustomEvent('lineStateChanged', {
            detail: { lineNumber, state, killTime, isRemote: true }
        }));
    }

    // 更新本地线路状态（不触发同步）
    updateLocalLineState(lineNumber, state, killTime = null, shouldSync = true) {
        const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
        if (!cell) return;
        
        console.log(`更新本地状态: 线路${lineNumber} -> ${state}`);
        
        // 移除所有状态类
        cell.classList.remove('killed', 'killed-unknown', 'refreshed');
        
        // 停止现有定时器
        if (window.app && window.app.timerManager) {
            window.app.timerManager.stopTimer(lineNumber);
        }
        
        // 添加新状态
        if (state === 'killed' || state === 'killed-unknown') {
            cell.classList.add(state);
            
            if (killTime && state === 'killed') {
                // 启动倒计时
                if (window.app && window.app.timerManager) {
                    window.app.timerManager.startTimer(lineNumber, killTime, null, cell, 
                        (lineNum) => {
                            // 倒计时完成回调
                            if (window.app && window.app.eventManager) {
                                window.app.eventManager.onTimerComplete(lineNum);
                            }
                        });
                }
            }
            
            // 更新存储
            this.storageManager.setLineState(lineNumber, state);
            if (killTime) {
                this.storageManager.setKillTime(lineNumber, killTime);
            }
            
            // 更新提示文本
            if (window.app && window.app.uiManager) {
                window.app.uiManager.updateCellTooltip(cell, '双击取消击杀状态');
            }
            
        } else if (state === 'refreshed') {
            cell.classList.add('refreshed');
            this.storageManager.setLineState(lineNumber, 'refreshed');
            
            // 更新提示文本
            if (window.app && window.app.uiManager) {
                window.app.uiManager.updateCellTooltip(cell, '金猪已刷新！点击标记击杀');
            }
            
        } else if (state === 'cancelled') {
            // 清除状态
            this.storageManager.removeLineState(lineNumber);
            this.storageManager.removeKillTime(lineNumber);
            
            // 更新提示文本
            if (window.app && window.app.uiManager) {
                window.app.uiManager.updateCellTooltip(cell, '点击标记金猪被击杀');
            }
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
                        <p>连接模式: <span style="color: #3498db; font-weight: bold;">多人协作</span></p>
                        <p>信令状态: <span id="signaling-status">${this.getSignalingStatusText()}</span></p>
                        <p><small>💡 支持跨设备真正的多人协作</small></p>
                    </div>
                    
                    <div class="room-actions">
                        <h4>房间操作</h4>
                        <button id="create-room-btn" class="action-btn" ${!this.isSignalingConnected ? 'disabled' : ''}>
                            🏠 创建房间
                        </button>
                        
                        <div class="join-room-section">
                            <input type="text" id="room-id-input" placeholder="输入房间号" />
                            <button id="join-room-btn" class="action-btn" ${!this.isSignalingConnected ? 'disabled' : ''}>
                                🚪 加入房间
                            </button>
                        </div>
                        
                        <div class="collaboration-setup">
                            <h4>🌐 在线协作设置</h4>
                            <div class="setup-options">
                                <button id="setup-socketio-btn" class="setup-btn">
                                    📡 启用Socket.IO协作
                                </button>
                                <button id="setup-firebase-btn" class="setup-btn">
                                    🔥 配置Firebase协作
                                </button>
                                <button id="test-connection-btn" class="setup-btn">
                                    🔍 测试连接
                                </button>
                            </div>
                            <div class="setup-status" id="setup-status">
                                ${this.isOnlineSignalingConnected ? 
                                    '<span style="color: #27ae60;">✅ 在线协作已启用</span>' : 
                                    '<span style="color: #f39c12;">⚠️ 仅本地协作可用</span>'
                                }
                            </div>
                        </div>
                        
                        <div class="p2p-info">
                            <h4>📡 协作模式说明</h4>
                            <ul>
                                <li><strong>本地协作:</strong> 同一浏览器的多个标签页</li>
                                <li><strong>在线协作:</strong> 不同设备、不同网络的真正多人协作</li>
                                <li><strong>实时同步:</strong> 击杀、倒计时、统计数据实时同步</li>
                                <li><strong>房主管理:</strong> 房主离开后房间自动关闭</li>
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
        
        // 协作设置按钮
        const setupSocketIOBtn = modal.querySelector('#setup-socketio-btn');
        if (setupSocketIOBtn) {
            setupSocketIOBtn.addEventListener('click', () => {
                this.showSocketIOSetup();
            });
        }
        
        const setupFirebaseBtn = modal.querySelector('#setup-firebase-btn');
        if (setupFirebaseBtn) {
            setupFirebaseBtn.addEventListener('click', () => {
                this.showFirebaseSetup();
            });
        }
        
        const testConnectionBtn = modal.querySelector('#test-connection-btn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.testOnlineConnection();
            });
        }
        
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

    // 显示Socket.IO设置说明
    showSocketIOSetup() {
        const enableOnlineSignaling = localStorage.getItem('enable-online-signaling') === 'true';
        
        const modal = document.createElement('div');
        modal.className = 'collaboration-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📡 Socket.IO在线协作设置</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="warning-box" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>⚠️ 重要说明</h4>
                        <p>免费的Socket.IO服务（如Heroku）经常不稳定或失效。建议：</p>
                        <ul>
                            <li>使用本地模式（同一浏览器多标签页协作）</li>
                            <li>配置自己的Socket.IO服务器</li>
                            <li>使用Firebase等更稳定的服务</li>
                        </ul>
                    </div>
                    
                    <div class="settings-section">
                        <h4>协作模式设置</h4>
                        <label class="setting-item">
                            <input type="checkbox" id="enable-online-toggle" ${enableOnlineSignaling ? 'checked' : ''}>
                            启用在线协作（跨设备）
                        </label>
                        <p class="setting-desc">
                            ${enableOnlineSignaling ? 
                                '✅ 当前：在线模式（会尝试连接外部服务器）' : 
                                '🏠 当前：本地模式（仅同浏览器标签页协作）'
                            }
                        </p>
                    </div>
                    
                    <div class="connection-test">
                        <h4>连接测试</h4>
                        <button id="test-socketio-btn" class="action-btn">测试Socket.IO连接</button>
                        <div id="test-result" class="test-result"></div>
                    </div>
                    
                    <div class="custom-server">
                        <h4>自定义服务器</h4>
                        <label>
                            Socket.IO服务器地址：
                            <input type="url" id="custom-socketio-url" placeholder="https://your-server.com" 
                                value="${localStorage.getItem('custom-socketio-url') || ''}" />
                        </label>
                        <button id="save-custom-btn" class="action-btn">保存自定义设置</button>
                    </div>
                    
                    <div class="action-buttons">
                        <button id="apply-settings-btn" class="action-btn primary">应用设置</button>
                        <button id="open-guide-btn" class="action-btn">📖 查看设置指南</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.bindSocketIOSetupEvents(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // 绑定Socket.IO设置事件
    bindSocketIOSetupEvents(modal) {
        // 关闭按钮
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // 应用设置
        modal.querySelector('#apply-settings-btn').addEventListener('click', () => {
            const enableOnline = modal.querySelector('#enable-online-toggle').checked;
            const customUrl = modal.querySelector('#custom-socketio-url').value.trim();
            
            localStorage.setItem('enable-online-signaling', enableOnline.toString());
            if (customUrl) {
                localStorage.setItem('custom-socketio-url', customUrl);
            }
            
            console.log(`🔧 协作模式已设置为：${enableOnline ? '在线模式' : '本地模式'}`);
            
            if (this.uiManager && this.uiManager.showMessage) {
                this.uiManager.showMessage(
                    `协作模式已切换到${enableOnline ? '在线' : '本地'}模式，刷新页面生效`, 
                    'success'
                );
            }
            
            modal.remove();
        });
        
        // 测试连接
        modal.querySelector('#test-socketio-btn').addEventListener('click', () => {
            this.testSocketIOConnection(modal);
        });
        
        // 保存自定义设置
        modal.querySelector('#save-custom-btn').addEventListener('click', () => {
            const customUrl = modal.querySelector('#custom-socketio-url').value.trim();
            if (customUrl) {
                localStorage.setItem('custom-socketio-url', customUrl);
                this.uiManager.showMessage('自定义服务器地址已保存', 'success');
            }
        });
        
        // 打开指南
        modal.querySelector('#open-guide-btn').addEventListener('click', () => {
            window.open('MULTIPLAYER_SETUP_GUIDE.md', '_blank');
        });
        
        // 点击外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 测试Socket.IO连接
    testSocketIOConnection(modal) {
        const resultDiv = modal.querySelector('#test-result');
        resultDiv.innerHTML = '<p>🔄 正在测试连接...</p>';
        
        try {
            if (typeof io === 'undefined') {
                resultDiv.innerHTML = `
                    <p style="color: #e74c3c;">❌ Socket.IO客户端未加载</p>
                    <p>请在HTML中添加：<br><code>&lt;script src="https://cdn.socket.io/4.7.2/socket.io.min.js"&gt;&lt;/script&gt;</code></p>
                `;
                return;
            }
            
            const customUrl = localStorage.getItem('custom-socketio-url');
            const testUrl = customUrl || 'https://socketio-chat-h9jt.herokuapp.com';
            
            const testSocket = io(testUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000
            });
            
            let connected = false;
            
            testSocket.on('connect', () => {
                connected = true;
                resultDiv.innerHTML = `<p style="color: #27ae60;">✅ 连接成功！服务器：${testUrl}</p>`;
                testSocket.disconnect();
            });
            
            testSocket.on('connect_error', (error) => {
                if (!connected) {
                    resultDiv.innerHTML = `
                        <p style="color: #e74c3c;">❌ 连接失败</p>
                        <p>服务器：${testUrl}</p>
                        <p>错误：${error.message || error}</p>
                        <p>建议使用本地模式或配置自己的服务器</p>
                    `;
                }
                testSocket.disconnect();
            });
            
            // 10秒超时
            setTimeout(() => {
                if (!connected) {
                    resultDiv.innerHTML = `
                        <p style="color: #f39c12;">⏰ 连接超时</p>
                        <p>服务器可能不可用：${testUrl}</p>
                        <p>建议使用本地模式</p>
                    `;
                    testSocket.disconnect();
                }
            }, 10000);
            
        } catch (error) {
            resultDiv.innerHTML = `
                <p style="color: #e74c3c;">❌ 测试失败</p>
                <p>错误：${error.message}</p>
            `;
        }
    }

    // 显示Firebase设置界面
    showFirebaseSetup() {
        const modal = document.createElement('div');
        modal.className = 'collaboration-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔥 Firebase协作设置</h3>
                    <button class="modal-close">✕</button>
                </div>
                <div class="modal-body">
                    <div class="info-box" style="background: #e8f5e8; border: 1px solid #27ae60; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h4>📋 Firebase配置步骤</h4>
                        <ol>
                            <li>访问 <a href="https://console.firebase.google.com" target="_blank">Firebase控制台</a></li>
                            <li>创建新项目或选择现有项目</li>
                            <li>启用 Firestore Database</li>
                            <li>在项目设置中获取配置信息</li>
                            <li>将配置信息填入下方表单</li>
                        </ol>
                    </div>
                    
                    <div class="firebase-config">
                        <h4>Firebase配置</h4>
                        <div class="config-grid">
                            <label>API Key: <input type="text" id="firebase-api-key" placeholder="your-api-key" /></label>
                            <label>Auth Domain: <input type="text" id="firebase-auth-domain" placeholder="project.firebaseapp.com" /></label>
                            <label>Project ID: <input type="text" id="firebase-project-id" placeholder="project-id" /></label>
                            <label>Storage Bucket: <input type="text" id="firebase-storage-bucket" placeholder="project.appspot.com" /></label>
                        </div>
                        <button id="save-firebase-config" class="action-btn">保存Firebase配置</button>
                    </div>
                    
                    <div class="action-buttons">
                        <button id="test-firebase-btn" class="action-btn">测试Firebase连接</button>
                        <button id="open-firebase-guide-btn" class="action-btn">📖 详细设置指南</button>
                    </div>
                    
                    <div id="firebase-test-result" class="test-result"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 加载已保存的配置
        this.loadFirebaseConfig(modal);
        this.bindFirebaseSetupEvents(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // 加载Firebase配置
    loadFirebaseConfig(modal) {
        const config = JSON.parse(localStorage.getItem('firebase-config') || '{}');
        modal.querySelector('#firebase-api-key').value = config.apiKey || '';
        modal.querySelector('#firebase-auth-domain').value = config.authDomain || '';
        modal.querySelector('#firebase-project-id').value = config.projectId || '';
        modal.querySelector('#firebase-storage-bucket').value = config.storageBucket || '';
    }

    // 绑定Firebase设置事件
    bindFirebaseSetupEvents(modal) {
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#save-firebase-config').addEventListener('click', () => {
            const config = {
                apiKey: modal.querySelector('#firebase-api-key').value.trim(),
                authDomain: modal.querySelector('#firebase-auth-domain').value.trim(),
                projectId: modal.querySelector('#firebase-project-id').value.trim(),
                storageBucket: modal.querySelector('#firebase-storage-bucket').value.trim()
            };
            
            if (config.apiKey && config.projectId) {
                localStorage.setItem('firebase-config', JSON.stringify(config));
                this.uiManager.showMessage('Firebase配置已保存', 'success');
            } else {
                this.uiManager.showMessage('请填写必要的配置项（API Key和Project ID）', 'error');
            }
        });
        
        modal.querySelector('#test-firebase-btn').addEventListener('click', () => {
            this.testFirebaseConnection(modal);
        });
        
        modal.querySelector('#open-firebase-guide-btn').addEventListener('click', () => {
            window.open('MULTIPLAYER_SETUP_GUIDE.md#firebase配置', '_blank');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 测试Firebase连接
    testFirebaseConnection(modal) {
        const resultDiv = modal.querySelector('#firebase-test-result');
        resultDiv.innerHTML = '<p>🔄 正在测试Firebase连接...</p>';
        
        const config = JSON.parse(localStorage.getItem('firebase-config') || '{}');
        
        if (!config.apiKey || !config.projectId) {
            resultDiv.innerHTML = '<p style="color: #e74c3c;">❌ 请先保存Firebase配置</p>';
            return;
        }
        
        if (typeof firebase === 'undefined') {
            resultDiv.innerHTML = `
                <p style="color: #e74c3c;">❌ Firebase SDK未加载</p>
                <p>请在HTML中添加Firebase脚本</p>
                <p>参考设置指南中的详细说明</p>
            `;
            return;
        }
        
        // 这里会实际测试Firebase连接
        resultDiv.innerHTML = '<p style="color: #f39c12;">⚠️ Firebase连接测试功能需要完整的SDK集成</p>';
    }

    // 测试在线连接
    testOnlineConnection() {
        console.log('🔍 测试在线连接状态...');
        
        const status = {
            networkOnline: navigator.onLine,
            localSignaling: this.isSignalingConnected,
            onlineSignaling: this.isOnlineSignalingConnected,
            socketIO: this.socket && this.socket.connected,
            webSocket: this.signalingWs && this.signalingWs.readyState === WebSocket.OPEN
        };
        
        console.log('连接状态详情:', status);
        
        if (this.uiManager && this.uiManager.showMessage) {
            let message = '连接测试结果:\n';
            message += `网络: ${status.networkOnline ? '✅' : '❌'}\n`;
            message += `本地信令: ${status.localSignaling ? '✅' : '❌'}\n`;
            message += `在线信令: ${status.onlineSignaling ? '✅' : '❌'}`;
            
            this.uiManager.showMessage(message, status.localSignaling ? 'success' : 'warning');
        }
        
        return status;
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