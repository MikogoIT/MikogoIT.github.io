/**
 * 金猪刷新监控系统 - 配置文件
 */

// 游戏配置
export const GAME_CONFIG = {
    // 线路配置
    TOTAL_LINES: 400,
    GRID_ROWS: 20,
    GRID_COLS: 20,
    
    // 计时器配置
    NORMAL_TIMER: 24 * 60 * 60 * 1000, // 24小时（毫秒）
    TEST_TIMER: 10 * 1000, // 10秒（毫秒）
    
    // 动画配置
    PIG_EMOJIS: ['🐷', '🐽', '🐖', '🥓', '🍖'],
    REFRESH_EMOJIS: ['✨', '🌟', '💫', '🎉', '🎊', '🔮', '💎'],
    CELEBRATION_EMOJIS: ['🎉', '🎊', '✨', '🌟', '💫', '🔥'],
    
    // 动画样式
    ANIMATION_TYPES: ['pig-drop', 'pig-bounce', 'pig-fly'],
    
    // 里程碑配置
    MILESTONE_INTERVAL: 10, // 每10次击杀触发庆祝动画
    
    // 手机端配置
    MOBILE_TRIPLE_CLICK_TIMEOUT: 800, // 三连击超时时间（毫秒）
    MOBILE_ACTION_DELAY: 300, // 单击/双击延迟时间（毫秒）
    
    // 存储键名
    STORAGE_KEYS: {
        LINE_STATE: 'line-',
        KILL_TIME: 'killTime-',
        KILL_EVENTS: 'killEvents',
        USER_NOTES: 'user-notes'
    }
};

// 设备检测
export const DEVICE_CONFIG = {
    // 移动设备检测正则表达式
    MOBILE_REGEX: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i,
    
    // 移动设备屏幕宽度阈值
    MOBILE_WIDTH_THRESHOLD: 768,
    
    // 检测是否为移动设备
    isMobile: () => {
        return DEVICE_CONFIG.MOBILE_REGEX.test(navigator.userAgent) || 
               window.innerWidth <= DEVICE_CONFIG.MOBILE_WIDTH_THRESHOLD;
    }
};

// 图表配置
export const CHART_CONFIG = {
    // Canvas设置
    DEFAULT_DPR: window.devicePixelRatio || 1,
    
    // 图表样式
    COLORS: {
        PRIMARY: '#3498db',
        DANGER: '#e74c3c',
        WARNING: '#f1c40f',
        SUCCESS: '#2ecc71',
        INFO: '#3498db',
        LIGHT: '#bdc3c7',
        WHITE: '#ecf0f1',
        GOLD: '#f1c40f'
    },
    
    // 图表配置
    PADDING: 60,
    GRID_LINES: 5,
    FONT_SIZES: {
        TITLE: '18px',
        LABEL: '12px',
        AXIS: '11px',
        DATA: '12px'
    }
};

// 消息和提示文本
export const MESSAGES = {
    TOOLTIPS: {
        DEFAULT: '左键击杀开始倒计时，右键击杀但不知时间',
        KILLED: '双击取消击杀状态',
        REFRESHED: '金猪已刷新，左键击杀开始倒计时，右键击杀但不知时间'
    },
    
    STATUS: {
        RUNNING: '运行中',
        RESTORED: '已恢复所有倒计时',
        KILLED: (line) => `线路 ${line} 已标记击杀 🐷`,
        KILLED_UNKNOWN: (line) => `线路 ${line} 已标记击杀（时间未知）🐷`,
        REFRESHED: (line) => `线路 ${line} 金猪已刷新 🎉`,
        CANCELLED: (line) => `已取消线路 ${line} 的击杀标记`,
        RESET_ALL: '所有状态已重置',
        RESET_TIMERS: '倒计时状态已重置，统计数据已保留',
        TEST_MODE_ON: '测试模式已开启 - 倒计时仅10秒',
        TEST_MODE_OFF: '测试模式已关闭 - 恢复24小时倒计时'
    },
    
    MOBILE: {
        HINT_INITIAL: '💡 点击格子标记击杀，三连击标记不知时间',
        HINT_TRIPLE: '三连击标记击杀但不知时间 ⚡',
        INSTRUCTION: '点击格子标记击杀，三连击标记不知时间'
    },
    
    CONFIRMATIONS: {
        RESET_ALL: '确定要重置所有线路状态吗？这将清除所有倒计时和标记状态！',
        RESET_TIMERS: '确定要重置所有倒计时状态吗？这将清除所有线路的击杀标记，但保留历史统计数据！'
    }
};
