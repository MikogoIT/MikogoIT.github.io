# 多人协作功能使用说明

## 🚀 快速开始

### 1. 启动协作服务器

```bash
# 进入服务器目录
cd server

# 安装依赖（首次运行）
npm install

# 启动服务器
npm start
```

或者在Windows下直接双击 `start-server.bat`

### 2. 使用协作功能

1. 点击页面上的"🤝 多人协作"按钮
2. 首次使用需要连接到服务器
3. 创建房间或加入现有房间
4. 与其他用户实时同步操作

## 📋 功能特性

### ✨ 实时同步
- 击杀标记实时同步
- 倒计时状态共享
- 用户光标位置显示
- 操作者身份标识

### 👥 用户管理
- 自定义用户名和颜色
- 在线用户列表
- 房主/成员权限
- 用户操作历史

### 🏠 房间系统
- 创建私人房间
- 房间号分享
- 自动清理过期房间
- 房间成员管理

### 🔄 断线重连
- 自动重连机制
- 数据状态恢复
- 网络异常处理
- 离线缓存同步

## 🛠️ 技术架构

### 前端 (客户端)
- **协作管理器**: 处理WebSocket连接和消息同步
- **事件同步**: 监听本地操作，同步到其他用户
- **UI集成**: 显示协作状态和用户信息

### 后端 (服务器)
- **WebSocket服务器**: 基于Node.js + ws库
- **房间管理**: 创建、加入、离开房间
- **消息广播**: 实时同步用户操作
- **连接管理**: 处理用户连接和断线

## 🔧 配置选项

### 服务器配置
```javascript
// 在 collaboration-server.js 中修改
const server = new CollaborationServer(8080); // 端口号
```

### 客户端配置
```javascript
// 在协作管理器中修改服务器地址
this.connect('ws://localhost:8080'); // 服务器地址
```

## 🌐 部署到生产环境

### 1. 云服务器部署
```bash
# 上传代码到服务器
scp -r server/ user@your-server:/path/to/project/

# 在服务器上
cd /path/to/project/server
npm install --production
npm start
```

### 2. 使用PM2管理进程
```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start collaboration-server.js --name "spawn-timer-collab"

# 设置开机自启
pm2 startup
pm2 save
```

### 3. 配置反向代理 (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 🔒 安全考虑

### 1. 房间访问控制
- 房间号作为简单的访问控制
- 可以添加密码保护
- 限制房间最大用户数

### 2. 数据验证
- 服务器端验证所有消息
- 防止恶意数据注入
- 限制消息频率

### 3. 连接管理
- 自动清理僵尸连接
- 限制单IP连接数
- 添加连接超时机制

## 🐛 故障排除

### 连接失败
1. 检查服务器是否启动
2. 确认端口号是否正确
3. 检查防火墙设置

### 同步延迟
1. 检查网络连接质量
2. 服务器性能是否充足
3. 客户端浏览器兼容性

### 数据不一致
1. 刷新页面重新同步
2. 检查本地存储冲突
3. 服务器日志排查

## 📈 扩展功能

### 1. 持久化存储
- 添加数据库支持
- 房间历史记录
- 用户操作统计

### 2. 权限管理
- 房主特殊权限
- 操作权限控制
- 管理员功能

### 3. 通知系统
- 用户加入/离开通知
- 重要操作提醒
- 邮件/短信通知

## 🎯 最佳实践

1. **房间命名**: 使用有意义的房间号
2. **用户标识**: 设置清晰的用户名
3. **网络环境**: 确保稳定的网络连接
4. **定期备份**: 导出重要数据作为备份
5. **版本同步**: 确保所有用户使用相同版本
