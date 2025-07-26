// 简单的WebSocket协作服务器
// 使用 Node.js + ws 库实现

const WebSocket = require('ws');
const http = require('http');

class CollaborationServer {
    constructor(port = 8080) {
        this.port = port;
        this.rooms = new Map(); // 房间数据
        this.users = new Map(); // 用户连接
        
        this.init();
    }

    init() {
        // 创建HTTP服务器
        const server = http.createServer();
        
        // 创建WebSocket服务器
        this.wss = new WebSocket.Server({ server });
        
        this.wss.on('connection', (ws) => {
            console.log('新用户连接');
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('解析消息错误:', error);
                    this.sendError(ws, '无效的消息格式');
                }
            });
            
            ws.on('close', () => {
                console.log('用户断开连接');
                this.handleDisconnect(ws);
            });
            
            ws.on('error', (error) => {
                console.error('WebSocket错误:', error);
            });
        });
        
        // 启动服务器
        server.listen(this.port, () => {
            console.log(`协作服务器已启动，端口: ${this.port}`);
        });
    }

    // 处理消息
    handleMessage(ws, message) {
        switch (message.type) {
            case 'user_info':
                this.handleUserInfo(ws, message);
                break;
                
            case 'create_room':
                this.handleCreateRoom(ws, message);
                break;
                
            case 'join_room':
                this.handleJoinRoom(ws, message);
                break;
                
            case 'leave_room':
                this.handleLeaveRoom(ws, message);
                break;
                
            case 'line_state_changed':
                this.handleLineStateChange(ws, message);
                break;
                
            case 'user_cursor':
                this.handleUserCursor(ws, message);
                break;
                
            default:
                this.sendError(ws, '未知的消息类型');
        }
    }

    // 处理用户信息
    handleUserInfo(ws, message) {
        ws.userId = message.userId;
        ws.userName = message.userName;
        ws.userColor = message.userColor;
        
        this.users.set(message.userId, ws);
        console.log(`用户注册: ${message.userName} (${message.userId})`);
    }

    // 处理创建房间
    handleCreateRoom(ws, message) {
        const { roomId, hostUserId } = message;
        
        if (this.rooms.has(roomId)) {
            this.sendError(ws, '房间已存在');
            return;
        }
        
        // 创建房间
        const room = {
            id: roomId,
            hostUserId: hostUserId,
            users: new Map(),
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        
        this.rooms.set(roomId, room);
        
        // 用户加入房间
        ws.roomId = roomId;
        room.users.set(hostUserId, {
            userId: hostUserId,
            userName: ws.userName,
            userColor: ws.userColor,
            ws: ws
        });
        
        this.send(ws, {
            type: 'room_created',
            roomId: roomId
        });
        
        console.log(`房间创建: ${roomId}, 房主: ${ws.userName}`);
    }

    // 处理加入房间
    handleJoinRoom(ws, message) {
        const { roomId, userId } = message;
        
        const room = this.rooms.get(roomId);
        if (!room) {
            this.sendError(ws, '房间不存在');
            return;
        }
        
        // 用户加入房间
        ws.roomId = roomId;
        const userInfo = {
            userId: userId,
            userName: ws.userName,
            userColor: ws.userColor,
            ws: ws
        };
        
        room.users.set(userId, userInfo);
        room.lastActivity = Date.now();
        
        // 通知用户加入成功
        this.send(ws, {
            type: 'room_joined',
            roomId: roomId
        });
        
        // 通知房间内其他用户
        this.broadcastToRoom(roomId, {
            type: 'user_joined',
            user: {
                userId: userId,
                userName: ws.userName,
                userColor: ws.userColor
            }
        }, userId);
        
        console.log(`用户加入房间: ${ws.userName} -> ${roomId}`);
    }

    // 处理离开房间
    handleLeaveRoom(ws, message) {
        const { roomId, userId } = message;
        
        const room = this.rooms.get(roomId);
        if (room) {
            room.users.delete(userId);
            
            // 通知房间内其他用户
            this.broadcastToRoom(roomId, {
                type: 'user_left',
                userId: userId
            });
            
            // 如果房间为空，删除房间
            if (room.users.size === 0) {
                this.rooms.delete(roomId);
                console.log(`房间已删除: ${roomId}`);
            }
        }
        
        ws.roomId = null;
        console.log(`用户离开房间: ${ws.userName || 'Unknown'}`);
    }

    // 处理线路状态变更
    handleLineStateChange(ws, message) {
        const { roomId } = message;
        
        if (!this.rooms.has(roomId)) {
            this.sendError(ws, '房间不存在');
            return;
        }
        
        // 更新房间活动时间
        this.rooms.get(roomId).lastActivity = Date.now();
        
        // 广播给房间内其他用户
        this.broadcastToRoom(roomId, message, message.userId);
    }

    // 处理用户光标
    handleUserCursor(ws, message) {
        const { roomId } = message;
        
        if (!this.rooms.has(roomId)) {
            return;
        }
        
        // 广播给房间内其他用户
        this.broadcastToRoom(roomId, message, message.userId);
    }

    // 处理用户断开连接
    handleDisconnect(ws) {
        if (ws.userId) {
            this.users.delete(ws.userId);
        }
        
        if (ws.roomId) {
            this.handleLeaveRoom(ws, {
                roomId: ws.roomId,
                userId: ws.userId
            });
        }
    }

    // 发送消息
    send(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    // 发送错误消息
    sendError(ws, errorMessage) {
        this.send(ws, {
            type: 'error',
            message: errorMessage
        });
    }

    // 向房间广播消息
    broadcastToRoom(roomId, message, excludeUserId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.users.forEach((user, userId) => {
            if (userId !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
                this.send(user.ws, message);
            }
        });
    }

    // 清理过期房间
    cleanupRooms() {
        const now = Date.now();
        const timeout = 24 * 60 * 60 * 1000; // 24小时
        
        this.rooms.forEach((room, roomId) => {
            if (now - room.lastActivity > timeout) {
                console.log(`清理过期房间: ${roomId}`);
                this.rooms.delete(roomId);
            }
        });
    }

    // 获取服务器状态
    getStatus() {
        return {
            connectedUsers: this.users.size,
            activeRooms: this.rooms.size,
            uptime: process.uptime()
        };
    }
}

// 启动服务器
const server = new CollaborationServer(8080);

// 定期清理过期房间
setInterval(() => {
    server.cleanupRooms();
}, 60 * 60 * 1000); // 每小时清理一次

// 处理进程退出
process.on('SIGINT', () => {
    console.log('正在关闭服务器...');
    process.exit(0);
});

module.exports = CollaborationServer;
