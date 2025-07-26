# Firebase多人协作功能设置指导

## 🎉 恭喜！你的Firebase项目已配置

你的Firebase配置已经成功集成到项目中：
- **项目ID**: `pig-timer-collaboration`
- **区域**: `asia-southeast1` (亚洲东南1区)
- **数据库URL**: `https://pig-timer-collaboration-default-rtdb.asia-southeast1.firebasedatabase.app`

## 🔧 必需的Firebase设置

### 1. 启用匿名身份验证
1. 前往 [Firebase控制台](https://console.firebase.google.com/)
2. 选择你的项目 `pig-timer-collaboration`
3. 进入"Authentication" → "Sign-in method"
4. 启用"Anonymous"登录方式
5. 保存设置

### 2. 配置Realtime Database安全规则
1. 进入"Realtime Database" → "Rules"
2. 将规则设置为：
```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null",
        "users": {
          "$userId": {
            ".write": "$userId === auth.uid"
          }
        }
      }
    }
  }
}
```
3. 点击"发布"保存规则

## 🚀 测试步骤

### 1. 启动本地服务器
```bash
cd "f:\SpawnTimer\LivePage\-"
python -m http.server 8000
```

### 2. 访问应用
在浏览器中打开: `http://localhost:8000`

### 3. 测试Firebase协作功能
1. 点击"多人协作"按钮
2. 选择"Firebase云协作（推荐）"
3. 点击"创建房间"
4. 复制房间ID
5. 在另一个浏览器窗口/标签页中重复步骤1-2
6. 选择"加入房间"，输入房间ID
7. 开始协作测试：点击格子，观察实时同步

## 📝 功能特性

### ✅ 已实现
- 🔥 Firebase v9+ 现代API集成
- 🔐 匿名用户认证
- 🏠 房间创建和管理
- 👥 实时用户列表
- 🎮 游戏状态同步
- 📊 统计数据同步
- 🔄 断线重连
- 📱 移动端支持

### 🔧 使用说明
1. **创建房间**: 房主创建房间，获得房间ID
2. **加入房间**: 其他用户输入房间ID加入
3. **实时协作**: 所有操作（点击格子、倒计时等）实时同步
4. **用户管理**: 显示在线用户列表，支持用户离开
5. **数据持久化**: 房间数据存储在Firebase云端

## � 故障排除

### 常见错误
1. **"权限被拒绝"** → 检查Realtime Database规则是否正确设置
2. **"匿名登录失败"** → 确保Authentication中启用了Anonymous登录
3. **"无法连接"** → 检查网络连接和防火墙设置

### 调试信息
打开浏览器开发者工具(F12)查看控制台，Firebase会输出详细日志。

## 🎯 下一步
1. 测试多用户同时协作
2. 测试断线重连功能
3. 验证数据同步准确性
4. 优化用户体验
