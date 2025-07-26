// 这是一个临时的API更新参考文件
// 需要将 firebaseCollaborationManager.js 中的所有v8 API调用更新为v9+

// 需要替换的模式：
// 1. this.database.ref() → this.firebaseUtils.ref(this.database, )
// 2. firebase.database.ServerValue.TIMESTAMP → this.firebaseUtils.serverTimestamp()
// 3. .set() → this.firebaseUtils.set()
// 4. .remove() → this.firebaseUtils.remove()
// 5. .update() → this.firebaseUtils.update()
// 6. .off() → 需要更新为v9+的取消监听方式

// 主要问题点：
// 第283行：lastActivity设置
// 第328行：isActive设置  
// 第332行：用户移除
// 第396行：监听器移除
// 第413行：用户引用
// 第558行：游戏状态更新
// 第561行：lastActivity更新

console.log('Firebase API更新参考');
