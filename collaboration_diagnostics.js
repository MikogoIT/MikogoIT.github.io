// Firebase协作功能 - 离开房间诊断与修复脚本
// 检查在没有房间时点击协作按钮的行为

(function() {
    console.log('🔧 Firebase协作诊断脚本开始运行...');
    
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
            
            const manager = window.goldPigApp.firebaseCollaborationManager;
            this.success('Firebase协作管理器已找到');
            
            // 检查管理器状态
            this.log(`- 初始化状态: ${manager.isInitialized ? '✅' : '❌'}`);
            this.log(`- 连接状态: ${manager.isConnected ? '✅' : '❌'}`);
            this.log(`- 当前房间: ${manager.roomId || '无'}`);
            this.log(`- 用户ID: ${manager.userId || '未设置'}`);
            
            return true;
        },
        
        // 检查协作按钮和相关函数
        checkCollaborationButtons() {
            this.log('检查协作按钮和函数...');
            
            // 检查全局函数
            const functionsToCheck = [
                'showFirebaseCollaboration',
                'showCollaborationChoice'
            ];
            
            functionsToCheck.forEach(funcName => {
                if (typeof window[funcName] === 'function') {
                    this.success(`${funcName} 函数可用`);
                } else {
                    this.error(`${funcName} 函数不可用`);
                }
            });
            
            // 检查HTML中的协作按钮
            const collaborationButtons = document.querySelectorAll('[onclick*="collaboration"], [onclick*="Collaboration"]');
            this.log(`找到 ${collaborationButtons.length} 个协作相关按钮`);
            
            collaborationButtons.forEach((btn, index) => {
                this.log(`- 按钮 ${index + 1}: ${btn.textContent.trim()} (onclick: ${btn.getAttribute('onclick')})`);
            });
        },
        
        // 测试显示协作对话框（不在房间时）
        testShowDialogNoRoom() {
            this.log('测试显示协作对话框（不在房间状态）...');
            
            if (!window.goldPigApp || !window.goldPigApp.firebaseCollaborationManager) {
                this.error('Firebase协作管理器不可用，无法测试');
                return false;
            }
            
            const manager = window.goldPigApp.firebaseCollaborationManager;
            
            // 确保不在房间中
            const originalRoomId = manager.roomId;
            manager.roomId = null;
            
            try {
                // 移除已存在的面板
                const existingPanel = document.getElementById('firebase-collaboration-panel');
                if (existingPanel) {
                    existingPanel.remove();
                }
                
                // 调用显示对话框
                manager.showCollaborationDialog();
                
                // 检查是否正确显示
                setTimeout(() => {
                    const panel = document.getElementById('firebase-collaboration-panel');
                    if (panel) {
                        this.success('悬浮面板已正确显示');
                        
                        // 检查内容是否为创建/加入界面
                        const createBtn = panel.querySelector('#firebase-create-room-btn');
                        const joinBtn = panel.querySelector('#firebase-join-room-btn');
                        
                        if (createBtn && joinBtn) {
                            this.success('创建/加入界面内容正确');
                        } else {
                            this.error('创建/加入界面内容不正确');
                        }
                        
                    } else {
                        this.error('悬浮面板未显示');
                    }
                }, 200);
                
            } catch (error) {
                this.error(`显示对话框时发生错误: ${error.message}`);
            } finally {
                // 恢复原始房间状态
                manager.roomId = originalRoomId;
            }
            
            return true;
        },
        
        // 一键修复常见问题
        quickFix() {
            this.log('开始一键修复...');
            
            // 修复1: 确保CSS已加载
            if (!document.querySelector('link[href*="firebase-collaboration.css"]')) {
                this.log('添加Firebase协作CSS...');
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'css/firebase-collaboration.css';
                document.head.appendChild(link);
                this.success('已添加CSS链接');
            }
            
            // 修复2: 确保全局函数可用
            if (typeof window.showFirebaseCollaboration !== 'function') {
                this.log('创建备用 showFirebaseCollaboration 函数...');
                window.showFirebaseCollaboration = function() {
                    if (window.goldPigApp && window.goldPigApp.firebaseCollaborationManager) {
                        window.goldPigApp.firebaseCollaborationManager.showCollaborationDialog();
                    } else {
                        console.error('Firebase协作管理器不可用');
                        alert('Firebase协作功能未初始化，请刷新页面重试');
                    }
                };
                this.success('已创建备用函数');
            }
            
            // 修复3: 清理可能的DOM冲突
            const existingPanels = document.querySelectorAll('#firebase-collaboration-panel');
            if (existingPanels.length > 1) {
                this.log('清理重复的面板...');
                for (let i = 1; i < existingPanels.length; i++) {
                    existingPanels[i].remove();
                }
                this.success('已清理重复面板');
            }
            
            this.success('一键修复完成');
        },
        
        // 运行完整诊断
        runFullDiagnostic() {
            this.log('🚀 开始完整诊断...');
            
            this.checkFirebaseManager();
            this.checkCollaborationButtons();
            this.testShowDialogNoRoom();
            
            const summary = {
                total: this.results.length,
                errors: this.results.filter(r => r.type === 'error').length,
                warnings: this.results.filter(r => r.type === 'warning').length,
                successes: this.results.filter(r => r.type === 'success').length
            };
            
            this.log(`📊 诊断完成 - 总计: ${summary.total}, 错误: ${summary.errors}, 警告: ${summary.warnings}, 成功: ${summary.successes}`);
            
            return summary;
        }
    };
    
    // 暴露到全局作用域
    window.firebaseDiagnostics = diagnostics;
    
    // 自动运行诊断
    console.log('🎯 运行自动诊断...');
    setTimeout(() => {
        diagnostics.runFullDiagnostic();
    }, 1000);
    
    // 提供便捷方法
    console.log('📝 可用的诊断命令:');
    console.log('- firebaseDiagnostics.runFullDiagnostic() - 运行完整诊断');
    console.log('- firebaseDiagnostics.testShowDialogNoRoom() - 测试无房间状态对话框');
    console.log('- firebaseDiagnostics.quickFix() - 一键修复常见问题');
    
})();
