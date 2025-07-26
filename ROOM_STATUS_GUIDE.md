# 房间状态组件使用说明

## 功能概述

房间状态组件是位于页面右上角的悬浮窗口，用于显示当前协作房间的状态信息并提供快捷操作功能。

## 主要功能

### 1. 房间信息显示
- **房间号**：显示当前房间的唯一标识符
- **连接状态**：显示在线/离线状态
- **用户数量**：显示当前房间内的用户数
- **房间类型**：显示协作类型（Firebase/本地）

### 2. 复制房间号功能
- 点击房间号右侧的 📋 按钮即可复制房间号到剪贴板
- 支持现代浏览器的 Clipboard API 和传统的 execCommand 方法
- 复制成功后会显示绿色 ✅ 图标和提示消息
- 兼容移动设备和桌面浏览器

### 3. 房间管理操作
- **关闭组件**：点击右上角 × 按钮隐藏组件
- **离开房间**：点击"离开房间"按钮退出当前协作
- **房间详情**：点击"房间详情"按钮查看详细信息

## 使用方法

### 显示房间状态
当用户创建或加入房间时，组件会自动显示：

```javascript
// 显示房间状态组件
showRoomStatus(roomId, 'Firebase');
```

### 复制房间号
1. 确保房间状态组件已显示
2. 点击房间号旁边的 📋 按钮
3. 系统会自动复制房间号到剪贴板
4. 出现复制成功提示和按钮动画效果

### 手动操作
如果自动复制失败，系统会自动选中房间号文本，用户可以：
- 使用 Ctrl+C (Windows/Linux) 或 Cmd+C (Mac) 手动复制
- 在移动设备上长按选择复制

## 技术实现

### HTML 结构
```html
<div id="room-status-widget" class="room-status-widget">
    <div class="room-status-header">
        <!-- 标题和关闭按钮 -->
    </div>
    <div class="room-status-content">
        <div class="room-id-section">
            <label>房间号: (点击📋复制)</label>
            <div class="room-id-display">
                <input type="text" id="room-id-input" readonly>
                <button class="copy-btn" onclick="copyRoomId()">📋</button>
            </div>
        </div>
        <!-- 其他房间信息 -->
    </div>
</div>
```

### JavaScript 函数
- `copyRoomId()`: 复制房间号的主函数
- `showRoomStatus(roomId, type)`: 显示房间状态
- `hideRoomStatus()`: 隐藏房间状态
- `updateRoomUserCount(count)`: 更新用户数量
- `updateConnectionStatus(isConnected)`: 更新连接状态

### CSS 样式
- 渐变背景和毛玻璃效果
- 响应式设计，适配移动设备
- 悬停和点击动画效果
- 复制成功的视觉反馈

## 兼容性

### 浏览器支持
- **现代浏览器**: 使用 Clipboard API (Chrome 66+, Firefox 63+, Safari 13.1+)
- **传统浏览器**: 降级使用 execCommand 方法
- **移动浏览器**: 支持触摸操作和长按选择

### 安全性要求
- Clipboard API 仅在 HTTPS 或 localhost 环境下可用
- 在不安全环境下自动降级到传统方法

## 故障排除

### 复制功能不工作
1. **检查浏览器环境**：确保在 HTTPS 或 localhost 环境下
2. **检查浏览器权限**：某些浏览器可能需要用户授权剪贴板访问
3. **手动复制**：如果自动复制失败，可以手动选择文本复制

### 组件不显示
1. **检查 CSS 样式**：确保相关样式文件已加载
2. **检查 JavaScript**：确保相关函数已正确定义
3. **检查控制台**：查看是否有 JavaScript 错误

### 样式异常
1. **检查 CSS 冲突**：可能与其他样式产生冲突
2. **检查响应式设计**：在不同屏幕尺寸下可能需要调整
3. **清除缓存**：尝试强制刷新页面

## 自定义配置

### 修改样式
编辑 `css/styles.css` 中的相关样式类：
- `.room-status-widget`: 主容器样式
- `.copy-btn`: 复制按钮样式
- `.room-id-input`: 房间号输入框样式

### 修改功能
编辑 `index.html` 中的 JavaScript 函数：
- 修改复制提示信息
- 添加额外的验证逻辑
- 自定义动画效果

## 更新日志

### v1.0.0 (当前版本)
- ✅ 基础房间状态显示功能
- ✅ 房间号复制功能（现代+传统浏览器兼容）
- ✅ 实时状态更新
- ✅ 响应式设计
- ✅ 视觉动画效果
- ✅ 错误处理和降级方案

### 计划功能
- 🔄 QR码分享房间号
- 🔄 房间历史记录
- 🔄 更多房间管理选项
- 🔄 主题自定义
