// 动画管理器 - 处理所有动画效果
export class AnimationManager {
    constructor() {
        this.isVibrationSupported = 'vibrate' in navigator;
    }

    // 创建🐷掉落动画
    createPigDropAnimation(clickX, clickY) {
        const pigEmojis = ['🐷', '🐽', '🐖', '🥓', '🍖']; // 多种猪相关表情
        const animations = ['pig-drop', 'pig-bounce', 'pig-fly']; // 不同动画类型
        
        // 创建多个掉落的🐷
        const pigCount = Math.floor(Math.random() * 5) + 3; // 3-7个小猪
        
        for (let i = 0; i < pigCount; i++) {
            setTimeout(() => {
                const pigElement = document.createElement('div');
                
                // 随机选择表情和动画
                const randomEmoji = pigEmojis[Math.floor(Math.random() * pigEmojis.length)];
                const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
                
                pigElement.textContent = randomEmoji;
                pigElement.className = randomAnimation;
                
                // 设置初始位置（在点击位置附近随机分布）
                const offsetX = (Math.random() - 0.5) * 200; // -100px 到 +100px
                const offsetY = (Math.random() - 0.5) * 100; // -50px 到 +50px
                
                pigElement.style.left = Math.max(0, Math.min(window.innerWidth - 50, clickX + offsetX)) + 'px';
                pigElement.style.top = Math.max(-50, clickY + offsetY) + 'px';
                
                // 随机字体大小
                pigElement.style.fontSize = (1.5 + Math.random() * 1) + 'rem';
                
                // 添加到页面
                document.body.appendChild(pigElement);
                
                // 动画结束后移除元素
                setTimeout(() => {
                    if (pigElement.parentNode) {
                        pigElement.parentNode.removeChild(pigElement);
                    }
                }, 4000);
                
            }, i * 100); // 每个小猪延迟100ms出现，制造连续效果
        }
        
        // 添加音效提示（用震动代替，在支持的设备上）
        if (this.isVibrationSupported) {
            navigator.vibrate([100, 50, 100]); // 短震动模式
        }
    }

    // 创建特殊的庆祝动画（当击杀数达到里程碑时）
    createCelebrationAnimation() {
        const celebrationEmojis = ['🎉', '🎊', '✨', '🌟', '💫', '🔥'];
        
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const celebElement = document.createElement('div');
                const randomEmoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
                
                celebElement.textContent = randomEmoji;
                celebElement.className = 'pig-fly';
                celebElement.style.fontSize = '2.5rem';
                
                // 从屏幕边缘随机位置开始
                const startSide = Math.floor(Math.random() * 4); // 0:上, 1:右, 2:下, 3:左
                let startX, startY;
                
                switch (startSide) {
                    case 0: // 上边
                        startX = Math.random() * window.innerWidth;
                        startY = -50;
                        break;
                    case 1: // 右边
                        startX = window.innerWidth;
                        startY = Math.random() * window.innerHeight;
                        break;
                    case 2: // 下边
                        startX = Math.random() * window.innerWidth;
                        startY = window.innerHeight;
                        break;
                    case 3: // 左边
                        startX = -50;
                        startY = Math.random() * window.innerHeight;
                        break;
                }
                
                celebElement.style.left = startX + 'px';
                celebElement.style.top = startY + 'px';
                
                document.body.appendChild(celebElement);
                
                setTimeout(() => {
                    if (celebElement.parentNode) {
                        celebElement.parentNode.removeChild(celebElement);
                    }
                }, 4000);
                
            }, i * 80);
        }
    }

    // 创建金猪刷新动画
    createRefreshAnimation(clickX, clickY) {
        const refreshEmojis = ['✨', '🌟', '💫', '🎉', '🎊', '🔮', '💎']; // 刷新相关表情
        
        // 创建多个刷新特效
        const effectCount = Math.floor(Math.random() * 4) + 3; // 3-6个特效
        
        for (let i = 0; i < effectCount; i++) {
            setTimeout(() => {
                const effectElement = document.createElement('div');
                
                // 随机选择表情
                const randomEmoji = refreshEmojis[Math.floor(Math.random() * refreshEmojis.length)];
                
                effectElement.textContent = randomEmoji;
                effectElement.className = 'pig-bounce'; // 使用弹跳动画
                
                // 设置初始位置（在点击位置附近随机分布）
                const offsetX = (Math.random() - 0.5) * 150; // -75px 到 +75px
                const offsetY = (Math.random() - 0.5) * 80; // -40px 到 +40px
                
                effectElement.style.left = Math.max(0, Math.min(window.innerWidth - 50, clickX + offsetX)) + 'px';
                effectElement.style.top = Math.max(-50, clickY + offsetY) + 'px';
                
                // 随机字体大小
                effectElement.style.fontSize = (1.8 + Math.random() * 0.8) + 'rem';
                
                // 添加到页面
                document.body.appendChild(effectElement);
                
                // 动画结束后移除元素
                setTimeout(() => {
                    if (effectElement.parentNode) {
                        effectElement.parentNode.removeChild(effectElement);
                    }
                }, 2000);
                
            }, i * 150); // 每个特效延迟150ms出现
        }
        
        // 添加温和的震动提示
        if (this.isVibrationSupported) {
            navigator.vibrate([50, 30, 50]); // 温和震动模式
        }
    }

    // 添加元素的点击反馈动画
    addClickFeedback(element, type = 'normal') {
        switch (type) {
            case 'first':
                element.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    element.style.transform = '';
                }, 100);
                break;
            case 'double':
                element.classList.add('double-click-active');
                setTimeout(() => {
                    element.classList.remove('double-click-active');
                }, 200);
                break;
            case 'triple':
                element.classList.add('triple-click-active');
                setTimeout(() => {
                    element.classList.remove('triple-click-active');
                }, 300);
                break;
            default:
                element.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    element.style.transform = '';
                }, 150);
        }
    }
}
