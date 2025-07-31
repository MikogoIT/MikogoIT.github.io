// Firebase大厅管理器 - 扩展现有的协作功能
export class FirebaseHallManager {
    constructor(firebaseCollaborationManager) {
        this.firebaseManager = firebaseCollaborationManager;
        this.isInHall = false;
        this.hallBackupData = null; // 保存进入大厅前的本地数据
        this.hallRef = null;
        this.hallUsersRef = null;
        this.hallGameStateRef = null;
        this.hallId = 'global_hall'; // 固定的大厅ID
        
        console.log('🏛️ Firebase大厅管理器初始化完成');
    }

    // 加入大厅
    async joinHall() {
        if (!this.firebaseManager.isInitialized) {
            alert('Firebase未初始化，请稍后重试');
            return false;
        }

        if (this.firebaseManager.isDemoMode) {
            alert('演示模式下无法使用大厅功能');
            return false;
        }

        try {
            console.log('🏛️ 开始加入大厅...');
            
            // 如果用户在房间中，先询问是否要离开房间
            if (this.firebaseManager.roomId) {
                const leaveRoom = confirm('您当前在房间中，是否要离开房间并加入大厅？');
                if (leaveRoom) {
                    await this.firebaseManager.leaveRoom();
                } else {
                    return false;
                }
            }

            // 备份当前本地数据
            this.backupLocalData();

            // 设置大厅状态
            this.isInHall = true;
            this.firebaseManager.roomId = this.hallId;
            this.firebaseManager.isHost = false;

            // 设置大厅引用
            this.setupHallReferences();

            // 检查大厅是否存在，不存在则创建
            const hallSnapshot = await this.firebaseManager.firebaseUtils.get(this.hallRef);
            if (!hallSnapshot.exists()) {
                await this.createHall();
            }

            // 加入大厅用户列表
            const userRef = this.firebaseManager.firebaseUtils.ref(
                this.firebaseManager.database, 
                `hall/${this.hallId}/users/${this.firebaseManager.userId}`
            );
            await this.firebaseManager.firebaseUtils.set(userRef, {
                userName: this.firebaseManager.userName,
                userColor: this.firebaseManager.userColor,
                isHost: false,
                lastSeen: this.firebaseManager.firebaseUtils.serverTimestamp(),
                isOnline: true
            });

            // 设置事件监听
            this.setupHallListeners();

            // 同步大厅状态到本地
            const hallData = await this.firebaseManager.firebaseUtils.get(this.hallRef);
            if (hallData.exists() && hallData.val().gameState) {
                await this.syncHallStateToLocal(hallData.val().gameState);
            }

            // 更新在线状态
            this.updateHallPresence();

            // 显示大厅面板
            this.showHallPanel();

            console.log('✅ 成功加入大厅');
            this.firebaseManager.showTemporaryMessage('已加入大厅，正在与其他用户协同编辑', 'success');

            return true;

        } catch (error) {
            console.error('❌ 加入大厅失败:', error);
            alert('加入大厅失败: ' + error.message);
            this.isInHall = false;
            return false;
        }
    }

    // 创建大厅
    async createHall() {
        console.log('🏛️ 创建全局大厅...');
        
        const hallData = {
            info: {
                created: this.firebaseManager.firebaseUtils.serverTimestamp(),
                lastActivity: this.firebaseManager.firebaseUtils.serverTimestamp(),
                isActive: true,
                description: '全球协作大厅 - 所有用户共同编辑'
            },
            users: {},
            gameState: {
                lineStates: {},
                statistics: {
                    total: 0,
                    byUser: {}
                }
            },
            operations: {}
        };

        await this.firebaseManager.firebaseUtils.set(this.hallRef, hallData);
        console.log('✅ 大厅创建成功');
    }

    // 设置大厅引用
    setupHallReferences() {
        this.hallRef = this.firebaseManager.firebaseUtils.ref(
            this.firebaseManager.database, 
            `hall/${this.hallId}`
        );
        this.hallUsersRef = this.firebaseManager.firebaseUtils.ref(
            this.firebaseManager.database, 
            `hall/${this.hallId}/users`
        );
        this.hallGameStateRef = this.firebaseManager.firebaseUtils.ref(
            this.firebaseManager.database, 
            `hall/${this.hallId}/gameState`
        );
    }

    // 设置大厅事件监听
    setupHallListeners() {
        console.log('🔗 设置大厅事件监听...');
        
        // 监听用户变化
        const usersListener = this.firebaseManager.firebaseUtils.onValue(this.hallUsersRef, (snapshot) => {
            this.handleHallUsersChange(snapshot.val());
        });
        this.firebaseManager.listeners.set('hall_users', usersListener);
        
        // 监听游戏状态变化
        const gameStateListener = this.firebaseManager.firebaseUtils.onValue(this.hallGameStateRef, (snapshot) => {
            this.handleHallGameStateChange(snapshot.val());
        });
        this.firebaseManager.listeners.set('hall_gameState', gameStateListener);
        
        console.log('✅ 大厅事件监听设置完成');
    }

    // 处理大厅用户变化
    handleHallUsersChange(users) {
        if (!users || !this.isInHall) return;
        
        console.log('👥 大厅用户列表更新:', Object.keys(users).length, '人在线');
        this.updateHallPanel();
    }

    // 处理大厅游戏状态变化
    handleHallGameStateChange(gameState) {
        if (!gameState || !this.isInHall) return;
        
        console.log('🎮 大厅游戏状态更新');
        
        // 同步状态到本地UI，但不保存到本地存储
        this.syncHallStateToLocal(gameState, false);
    }

    // 同步大厅状态到本地显示
    async syncHallStateToLocal(gameState, updateStorage = false) {
        if (!gameState || !gameState.lineStates) return;
        
        console.log('🔄 同步大厅状态到本地显示...');
        
        // 更新UI显示，但不修改本地存储
        Object.entries(gameState.lineStates).forEach(([lineNumber, stateInfo]) => {
            const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
            if (cell) {
                // 清除当前状态
                cell.classList.remove('killed', 'killed-unknown', 'refreshed');
                
                // 应用新状态
                if (stateInfo.state === 'killed') {
                    cell.classList.add('killed');
                    if (stateInfo.killTime) {
                        // 显示倒计时，但不启动实际定时器
                        this.displayHallTimer(lineNumber, stateInfo.killTime);
                    }
                } else if (stateInfo.state === 'killed-unknown') {
                    cell.classList.add('killed-unknown');
                } else if (stateInfo.state === 'refreshed') {
                    cell.classList.add('refreshed');
                }
            }
        });
        
        console.log('✅ 大厅状态同步完成');
    }

    // 显示大厅中的倒计时（只显示，不启动本地定时器）
    displayHallTimer(lineNumber, killTime) {
        const timerDisplay = document.getElementById(`timer-${lineNumber}`);
        if (!timerDisplay) return;
        
        const now = Date.now();
        const endTime = killTime + (24 * 60 * 60 * 1000); // 24小时后
        const remaining = Math.max(0, endTime - now);
        
        if (remaining > 0) {
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            timerDisplay.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerDisplay.style.display = 'block';
        } else {
            timerDisplay.textContent = '已刷新';
            timerDisplay.style.display = 'block';
        }
    }

    // 备份本地数据
    backupLocalData() {
        console.log('💾 备份本地数据...');
        
        this.hallBackupData = {
            lineStates: {},
            statistics: { ...this.firebaseManager.statsManager.getStatsSummary() },
            timestamp: Date.now()
        };
        
        // 备份所有线路状态
        for (let i = 1; i <= 400; i++) {
            const state = this.firebaseManager.storageManager.getLineState(i);
            const killTime = this.firebaseManager.storageManager.getKillTime(i);
            
            if (state) {
                this.hallBackupData.lineStates[i] = {
                    state: state,
                    killTime: killTime
                };
            }
        }
        
        console.log('✅ 本地数据备份完成，共备份', Object.keys(this.hallBackupData.lineStates).length, '条记录');
    }

    // 离开大厅
    async leaveHall() {
        if (!this.isInHall) return;
        
        try {
            console.log('🚶 准备离开大厅...');
            
            // 询问用户是否合并大厅数据到本地
            const shouldMerge = await this.showMergeDialog();
            
            // 移除用户在线状态
            if (this.firebaseManager.userId) {
                const userRef = this.firebaseManager.firebaseUtils.ref(
                    this.firebaseManager.database, 
                    `hall/${this.hallId}/users/${this.firebaseManager.userId}`
                );
                await this.firebaseManager.firebaseUtils.remove(userRef);
            }
            
            // 清理监听器
            const hallListeners = ['hall_users', 'hall_gameState'];
            hallListeners.forEach(key => {
                const listener = this.firebaseManager.listeners.get(key);
                if (listener) {
                    listener();
                    this.firebaseManager.listeners.delete(key);
                }
            });
            
            // 重置状态
            this.isInHall = false;
            this.firebaseManager.roomId = null;
            this.firebaseManager.isHost = false;
            this.hallRef = null;
            this.hallUsersRef = null;
            this.hallGameStateRef = null;
            
            // 隐藏大厅面板
            this.hideHallPanel();
            
            // 根据用户选择处理数据
            if (shouldMerge) {
                await this.mergeHallDataToLocal();
            } else {
                await this.restoreLocalData();
            }
            
            console.log('✅ 已离开大厅');
            this.firebaseManager.showTemporaryMessage('已离开大厅', 'success');
            
        } catch (error) {
            console.error('❌ 离开大厅失败:', error);
            this.firebaseManager.showTemporaryMessage('离开大厅时发生错误', 'error');
        }
    }

    // 显示数据合并对话框
    showMergeDialog() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'merge-dialog-overlay';
            dialog.innerHTML = `
                <div class="merge-dialog-content">
                    <div class="merge-dialog-header">
                        <h3>🤔 数据合并选择</h3>
                    </div>
                    <div class="merge-dialog-body">
                        <p>您即将离开大厅，请选择如何处理数据：</p>
                        <div class="merge-options">
                            <div class="merge-option">
                                <h4>✅ 合并大厅数据到本地</h4>
                                <p>将大厅中的最新数据合并到您的本地数据中，可能会覆盖您之前的一些记录。</p>
                                <button id="merge-yes" class="merge-btn primary">合并数据</button>
                            </div>
                            <div class="merge-option">
                                <h4>🔄 恢复进入前的本地数据</h4>
                                <p>丢弃大厅中的变更，恢复到您进入大厅前的本地状态。</p>
                                <button id="merge-no" class="merge-btn secondary">恢复本地数据</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // 添加样式
            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
                font-family: Arial, sans-serif;
            `;
            
            const content = dialog.querySelector('.merge-dialog-content');
            content.style.cssText = `
                background: white;
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            `;
            
            const options = dialog.querySelectorAll('.merge-option');
            options.forEach(option => {
                option.style.cssText = `
                    border: 2px solid #ecf0f1;
                    border-radius: 10px;
                    padding: 20px;
                    margin: 15px 0;
                    background: #f8f9fa;
                `;
            });
            
            const buttons = dialog.querySelectorAll('.merge-btn');
            buttons.forEach(btn => {
                btn.style.cssText = `
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    width: 100%;
                    margin-top: 10px;
                `;
            });
            
            const primaryBtn = dialog.querySelector('.primary');
            primaryBtn.style.cssText += `
                background: #27ae60;
                color: white;
            `;
            
            const secondaryBtn = dialog.querySelector('.secondary');
            secondaryBtn.style.cssText += `
                background: #95a5a6;
                color: white;
            `;
            
            document.body.appendChild(dialog);
            
            // 绑定事件
            dialog.querySelector('#merge-yes').addEventListener('click', () => {
                dialog.remove();
                resolve(true);
            });
            
            dialog.querySelector('#merge-no').addEventListener('click', () => {
                dialog.remove();
                resolve(false);
            });
        });
    }

    // 合并大厅数据到本地
    async mergeHallDataToLocal() {
        console.log('🔄 合并大厅数据到本地...');
        
        try {
            // 获取当前大厅状态
            const hallSnapshot = await this.firebaseManager.firebaseUtils.get(this.hallGameStateRef);
            const hallGameState = hallSnapshot.val();
            
            if (hallGameState && hallGameState.lineStates) {
                // 合并线路状态
                Object.entries(hallGameState.lineStates).forEach(([lineNumber, stateInfo]) => {
                    this.firebaseManager.storageManager.setLineState(lineNumber, stateInfo.state);
                    if (stateInfo.killTime) {
                        this.firebaseManager.storageManager.setKillTime(lineNumber, stateInfo.killTime);
                    }
                });
                
                // 重新启动本地定时器
                this.restartLocalTimers(hallGameState.lineStates);
                
                console.log('✅ 大厅数据已合并到本地');
                this.firebaseManager.showTemporaryMessage('大厅数据已合并到本地', 'success');
            }
            
        } catch (error) {
            console.error('❌ 合并数据失败:', error);
            this.firebaseManager.showTemporaryMessage('合并数据失败', 'error');
        }
    }

    // 恢复本地数据
    async restoreLocalData() {
        console.log('🔄 恢复本地数据...');
        
        if (!this.hallBackupData) {
            console.log('⚠️ 没有备份数据可恢复');
            return;
        }
        
        try {
            // 清空当前显示
            for (let i = 1; i <= 400; i++) {
                const cell = document.querySelector(`td[data-line="${i}"]`);
                if (cell) {
                    cell.classList.remove('killed', 'killed-unknown', 'refreshed');
                    const timerDisplay = document.getElementById(`timer-${i}`);
                    if (timerDisplay) {
                        timerDisplay.style.display = 'none';
                    }
                }
            }
            
            // 恢复备份的线路状态
            Object.entries(this.hallBackupData.lineStates).forEach(([lineNumber, stateInfo]) => {
                this.firebaseManager.storageManager.setLineState(lineNumber, stateInfo.state);
                if (stateInfo.killTime) {
                    this.firebaseManager.storageManager.setKillTime(lineNumber, stateInfo.killTime);
                }
                
                // 更新UI显示
                const cell = document.querySelector(`td[data-line="${lineNumber}"]`);
                if (cell) {
                    if (stateInfo.state === 'killed') {
                        cell.classList.add('killed');
                    } else if (stateInfo.state === 'killed-unknown') {
                        cell.classList.add('killed-unknown');
                    } else if (stateInfo.state === 'refreshed') {
                        cell.classList.add('refreshed');
                    }
                }
            });
            
            // 重新启动本地定时器
            this.restartLocalTimers(this.hallBackupData.lineStates);
            
            console.log('✅ 本地数据已恢复');
            this.firebaseManager.showTemporaryMessage('已恢复到进入大厅前的状态', 'success');
            
        } catch (error) {
            console.error('❌ 恢复本地数据失败:', error);
            this.firebaseManager.showTemporaryMessage('恢复本地数据失败', 'error');
        }
    }

    // 重新启动本地定时器
    restartLocalTimers(lineStates) {
        console.log('⏰ 重新启动本地定时器...');
        
        Object.entries(lineStates).forEach(([lineNumber, stateInfo]) => {
            if (stateInfo.state === 'killed' && stateInfo.killTime) {
                // 通过定时器管理器重新启动定时器
                if (window.app && window.app.timerManager) {
                    window.app.timerManager.startTimer(lineNumber, stateInfo.killTime);
                }
            }
        });
    }

    // 更新大厅在线状态
    updateHallPresence() {
        if (!this.isInHall || !this.firebaseManager.userId) return;
        
        const userRef = this.firebaseManager.firebaseUtils.ref(
            this.firebaseManager.database, 
            `hall/${this.hallId}/users/${this.firebaseManager.userId}`
        );
        
        // 设置在线状态
        this.firebaseManager.firebaseUtils.update(userRef, {
            isOnline: true,
            lastSeen: this.firebaseManager.firebaseUtils.serverTimestamp()
        });
        
        // 设置离线时的清理
        this.firebaseManager.firebaseUtils.onDisconnect(userRef).remove();
    }

    // 显示大厅面板
    showHallPanel() {
        this.hideHallPanel(); // 先隐藏已存在的面板
        
        const panel = document.createElement('div');
        panel.id = 'hall-collaboration-panel';
        panel.className = 'hall-collaboration-panel';
        panel.innerHTML = this.getHallPanelContent();
        
        // 添加样式
        panel.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            background: white !important;
            border: 2px solid #f39c12 !important;
            border-radius: 10px !important;
            padding: 15px !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
            z-index: 10000 !important;
            min-width: 320px !important;
            max-width: 400px !important;
            font-family: Arial, sans-serif !important;
            color: #333 !important;
        `;
        
        document.body.appendChild(panel);
        
        // 绑定事件
        setTimeout(() => {
            this.bindHallPanelEvents(panel);
        }, 100);
        
        console.log('✅ 大厅面板已显示');
    }

    // 获取大厅面板内容
    getHallPanelContent() {
        return `
            <div class="panel-header">
                <h3>🏛️ 全球协作大厅</h3>
                <button id="close-hall-panel-btn" class="close-panel-btn" title="关闭">✕</button>
            </div>
            <div class="connection-status">
                <span class="status-badge connected">✅ 已连接到大厅</span>
            </div>
            <div class="hall-info">
                <p><strong>状态:</strong> 协作编辑模式</p>
                <p><strong>在线用户:</strong> <span id="hall-user-count">统计中...</span></p>
                <div id="hall-users-list" class="users-list"></div>
            </div>
            <div class="hall-actions">
                <button id="leave-hall-btn" class="action-btn danger">🚪 离开大厅</button>
            </div>
            <div class="hall-info-text">
                <h4>ℹ️ 大厅说明</h4>
                <ul>
                    <li>🌍 所有用户共同编辑同一个表格</li>
                    <li>⚡ 操作实时同步到所有用户</li>
                    <li>💾 离开时可选择合并或恢复数据</li>
                </ul>
            </div>
        `;
    }

    // 绑定大厅面板事件
    bindHallPanelEvents(panel) {
        // 关闭按钮
        const closeBtn = panel.querySelector('#close-hall-panel-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                panel.remove();
            });
        }
        
        // 离开大厅按钮
        const leaveBtn = panel.querySelector('#leave-hall-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', async () => {
                await this.leaveHall();
            });
        }
        
        // 初始更新用户列表
        this.updateHallPanel();
    }

    // 更新大厅面板
    async updateHallPanel() {
        const userCountSpan = document.getElementById('hall-user-count');
        const usersList = document.getElementById('hall-users-list');
        
        if (!userCountSpan || !usersList) return;
        
        try {
            const usersSnapshot = await this.firebaseManager.firebaseUtils.get(this.hallUsersRef);
            const users = usersSnapshot.val() || {};
            const userCount = Object.keys(users).length;
            
            userCountSpan.textContent = `${userCount} 人在线`;
            
            // 清空用户列表
            usersList.innerHTML = '';
            
            // 添加用户到列表
            Object.entries(users).forEach(([userId, userData]) => {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-item';
                userDiv.innerHTML = `
                    <div class="user-color" style="background-color: ${userData.userColor || '#3498db'}"></div>
                    <span class="user-name">${userData.userName || '未知用户'}${userId === this.firebaseManager.userId ? ' (我)' : ''}</span>
                    <span class="user-status connected">在线</span>
                `;
                usersList.appendChild(userDiv);
            });
            
        } catch (error) {
            console.error('❌ 更新大厅面板失败:', error);
        }
    }

    // 隐藏大厅面板
    hideHallPanel() {
        const panel = document.getElementById('hall-collaboration-panel');
        if (panel) {
            panel.remove();
        }
    }

    // 同步线路状态变更到大厅
    async syncLineStateToHall(lineNumber, state, killTime = null, userId = null) {
        if (!this.isInHall) return;
        
        try {
            const stateRef = this.firebaseManager.firebaseUtils.ref(
                this.firebaseManager.database, 
                `hall/${this.hallId}/gameState/lineStates/${lineNumber}`
            );
            
            const stateData = {
                state: state,
                killTime: killTime,
                timestamp: Date.now(),
                userId: userId || this.firebaseManager.userId,
                userName: this.firebaseManager.userName
            };
            
            await this.firebaseManager.firebaseUtils.set(stateRef, stateData);
            
            // 更新大厅活动时间
            const activityRef = this.firebaseManager.firebaseUtils.ref(
                this.firebaseManager.database, 
                `hall/${this.hallId}/info/lastActivity`
            );
            await this.firebaseManager.firebaseUtils.set(activityRef, this.firebaseManager.firebaseUtils.serverTimestamp());
            
        } catch (error) {
            console.error('❌ 同步状态到大厅失败:', error);
        }
    }
}
