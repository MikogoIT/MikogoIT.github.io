// F    console.log('🔧 Firebase协作诊断脚本开始运行...');rebase协作功能 - 离开房间诊断与修复脚本
// 检查在没有房间时点击协作按钮的行为

(function() {
    console.log('� Firebase协作诊断脚本开始运行...');
    
    const diagnostics = {
        results: [],
        
        log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const logMessage = `[${timestamp}] ${message}`;
            console.log(logMessage);
            this.results.push({ timestamp, message, type });
        },
        
        error(message) {
            this.log(`❌ ${message}`, 'error');
        },
        
        success(message) {
            this.log(`✅ ${message}`, 'success');
        },
        
        warning(message) {
            this.log(`⚠️ ${message}`, 'warning');
        },
        
        // 检查Firebase协作管理器是否可用
        checkFirebaseManager() {
            this.log('检查Firebase协作管理器...');
            
            // 检查全局应用实例
            if (typeof window.goldPigApp === 'undefined') {
                this.error('goldPigApp 未定义');
                return false;
            }
            
            if (!window.goldPigApp.firebaseCollaborationManager) {
                this.error('firebaseCollaborationManager 未初始化');
                return false;
            }
            
            const fm = window.goldPigApp.firebaseCollaborationManager;
            this.success('Firebase协作管理器已找到');

            console.log('FirebaseManager 状态:', {
                isInitialized: fm.isInitialized,
                isConnected: fm.isConnected,
                roomId: fm.roomId,
                userId: fm.userId,
                userName: fm.userName,
                isHost: fm.isHost
            });

            return fm;
        },

        // 检查离开房间按钮
        checkLeaveButton() {
            this.log('2. 检查离开房间按钮...');
            
            const leaveBtn = document.getElementById('leave-room-btn');
            if (leaveBtn) {
                this.success('找到离开房间按钮');
                
                // 检查按钮状态
                const rect = leaveBtn.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(leaveBtn);
                
                this.log('按钮状态: ' + JSON.stringify({
                    visible: rect.width > 0 && rect.height > 0,
                    enabled: !leaveBtn.disabled,
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    pointerEvents: computedStyle.pointerEvents,
                    opacity: computedStyle.opacity
                }));
                
                return leaveBtn;
            } else {
                this.error('未找到离开房间按钮');
                return null;
            }
        },

        // 测试 leaveRoom 方法
        async testLeaveRoom(firebaseManager) {
            this.log('3. 测试 leaveRoom 方法...');
            
            if (!firebaseManager) {
                this.error('没有 firebaseManager 实例，无法测试');
                return;
            }
            
            try {
                this.log('🧪 调用 leaveRoom 方法...');
                await firebaseManager.leaveRoom();
                this.success('leaveRoom 方法执行完成');
            } catch (error) {
                this.error('leaveRoom 方法执行失败: ' + error);
                this.log('错误详情: ' + JSON.stringify({
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }));
            }
        },

        // 检查 Firebase 连接状态
        checkFirebaseConnection() {
            this.log('4. 检查 Firebase 连接状态...');
            
            if (window.firebaseApp && window.firebaseDatabase) {
                this.success('Firebase 已初始化');
                this.log('Firebase 对象: ' + JSON.stringify({
                    app: !!window.firebaseApp,
                    database: !!window.firebaseDatabase,
                    auth: !!window.firebaseAuth,
                    utils: !!window.firebaseUtils
                }));
                return true;
            } else {
                this.error('Firebase 未正确初始化');
                return false;
            }
        },

        // 检查网络连接
        checkNetworkConnection() {
            this.log('5. 检查网络连接...');
            
            if (navigator.onLine) {
                this.success('网络连接正常');
                return true;
            } else {
                this.error('网络连接断开');
                return false;
            }
        },

        // 监听错误事件
        setupErrorListeners() {
            this.log('6. 设置错误监听器...');
            
            window.addEventListener('error', (event) => {
                this.error('🚨 JavaScript 错误: ' + JSON.stringify({
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                }));
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                this.error('🚨 未处理的 Promise 拒绝: ' + JSON.stringify({
                    reason: event.reason,
                    promise: event.promise                }));
            });
            
            this.success('错误监听器已设置');
        },

        // 运行所有诊断
        async runDiagnostics() {
            this.log('🚀 开始运行离开房间诊断...');
            
            // 设置错误监听器
            this.setupErrorListeners();
            
            // 检查各项组件
            const firebaseManager = this.checkFirebaseManager();
            const leaveButton = this.checkLeaveButton();
            const firebaseConnected = this.checkFirebaseConnection();
            const networkConnected = this.checkNetworkConnection();
            
            // 如果所有检查都通过，测试 leaveRoom 方法
            if (firebaseManager && firebaseConnected && networkConnected) {
                this.success('所有检查通过，测试 leaveRoom 方法...');
                await this.testLeaveRoom(firebaseManager);
            } else {
                this.error('某些检查未通过，跳过 leaveRoom 测试');
            }
            
            this.success('诊断完成');
        }
    };

    // 提供手动触发按钮点击的方法
    window.triggerLeaveRoom = function() {
        console.log('🖱️ 手动触发离开房间...');
        
        const leaveBtn = document.getElementById('leave-room-btn');
        if (leaveBtn) {
            // 模拟真实的用户点击
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 0,
                buttons: 1,
                clientX: leaveBtn.getBoundingClientRect().left + leaveBtn.offsetWidth / 2,
                clientY: leaveBtn.getBoundingClientRect().top + leaveBtn.offsetHeight / 2
            });
            
            leaveBtn.dispatchEvent(clickEvent);
            console.log('✅ 点击事件已触发');
        } else {
            console.log('❌ 未找到离开房间按钮');
        }
    };

    // 暴露诊断对象到全局
    window.diagnostics = diagnostics;

    // 自动运行诊断
    diagnostics.runDiagnostics();

    console.log('💡 提示：如果问题仍然存在，可以手动调用 triggerLeaveRoom() 来测试按钮点击');

})();
