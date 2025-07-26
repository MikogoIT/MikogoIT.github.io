// 图表管理器 - 处理图表绘制和Canvas操作
export class ChartManager {
    constructor(statsManager) {
        console.log('ChartManager 构造函数开始');
        this.statsManager = statsManager;
        this.canvas = document.getElementById('stats-chart');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.currentChartType = 'daily';
        
        console.log('Canvas 元素:', this.canvas);
        console.log('Canvas 上下文:', this.ctx);
        console.log('StatsManager:', this.statsManager);
        
        // 延迟初始化图表，确保DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM加载完成，初始化图表');
                this.initChart();
            });
        } else {
            // DOM已经加载完成
            setTimeout(() => {
                console.log('延迟初始化图表');
                this.initChart();
            }, 100);
        }
    }

    // 初始化图表
    initChart() {
        try {
            console.log('开始初始化图表...');
            
            // 确保 Canvas 元素存在
            if (!this.canvas) {
                console.error('找不到图表容器 stats-chart');
                // 尝试重新获取canvas元素
                this.canvas = document.getElementById('stats-chart');
                if (!this.canvas) {
                    console.error('重新获取canvas失败');
                    return;
                }
                this.ctx = this.canvas.getContext('2d');
            }
            
            console.log('Canvas元素找到:', this.canvas);
            console.log('Canvas尺寸:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
            
            // 添加标签页切换事件
            const chartTabs = document.querySelectorAll('.chart-tab');
            console.log('找到图表标签页:', chartTabs.length, '个');
            
            chartTabs.forEach((tab, index) => {
                console.log(`绑定标签页 ${index + 1} 事件:`, tab.dataset.chart);
                tab.addEventListener('click', (e) => {
                    console.log('图表标签页点击:', e.currentTarget.dataset.chart);
                    
                    // 更新活动标签
                    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    
                    // 根据选择的图表类型渲染
                    const chartType = e.currentTarget.dataset.chart;
                    this.currentChartType = chartType;
                    
                    try {
                        console.log('开始渲染图表:', chartType);
                        // 延迟一点确保Canvas大小正确
                        setTimeout(() => {
                            this.renderChart(chartType);
                        }, 50);
                    } catch (error) {
                        console.error('图表渲染错误:', error);
                    }
                });
            });
            
            console.log('图表标签页事件绑定完成');
            
            // 确保statsManager的方法存在
            if (typeof this.statsManager.getDailyKillData !== 'function') {
                console.error('statsManager.getDailyKillData 方法不存在');
                return;
            }
            
            console.log('开始渲染默认图表...');
            // 默认显示每日击杀图表，延迟一点确保Canvas大小正确
            setTimeout(() => {
                try {
                    this.renderChart('daily');
                    console.log('默认图表渲染完成');
                } catch (renderError) {
                    console.error('默认图表渲染失败:', renderError);
                }
            }, 200);
            
        } catch (error) {
            console.error('初始化图表错误:', error);
        }
    }

    // 渲染图表
    renderChart(chartType) {
        console.log('renderChart 被调用，图表类型:', chartType);
        
        if (!this.canvas || !this.ctx) {
            console.error('Canvas 或上下文不存在');
            console.log('Canvas:', this.canvas);
            console.log('Context:', this.ctx);
            return;
        }
        
        console.log('开始渲染图表:', chartType);
        
        try {
            switch (chartType) {
                case 'daily':
                    console.log('渲染每日图表');
                    this.renderDailyChart();
                    break;
                case 'total':
                    console.log('渲染总击杀图表');
                    this.renderTotalChart();
                    break;
                case 'hourly':
                    console.log('渲染小时图表');
                    this.renderHourlyChart();
                    break;
                default:
                    console.log('默认渲染每日图表');
                    this.renderDailyChart();
            }
            console.log('图表渲染完成:', chartType);
        } catch (error) {
            console.error('渲染图表时发生错误:', error);
        }
    }

    // 更新当前图表
    updateChart() {
        try {
            console.log('updateChart 被调用');
            
            if (!this.canvas || !this.ctx) {
                console.error('Canvas 或上下文不存在，无法更新图表');
                return;
            }
            
            const activeTab = document.querySelector('.chart-tab.active');
            console.log('当前活动标签页:', activeTab);
            
            if (!activeTab) {
                console.log('没有活动标签页，使用默认图表类型:', this.currentChartType);
                this.renderChart(this.currentChartType);
                return;
            }
            
            const chartType = activeTab.dataset.chart;
            console.log('更新图表类型:', chartType);
            this.renderChart(chartType);
        } catch (error) {
            console.error('更新图表错误:', error);
        }
    }

    // 渲染每日图表
    renderDailyChart() {
        try {
            console.log('开始渲染每日图表');
            
            // 设置Canvas尺寸
            this.setupCanvas();
            console.log('Canvas尺寸设置完成');
            
            // 清除画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            console.log('画布清除完成');
            
            // 获取数据
            console.log('获取每日击杀数据...');
            const chartData = this.statsManager.getDailyKillData(7);
            console.log('每日击杀数据:', chartData);
            
            // 绘制折线图
            console.log('开始绘制折线图');
            this.drawLineChart(chartData.labels, chartData.data, '每日金猪击杀趋势', '#3498db');
            console.log('每日图表绘制完成');
            
        } catch (error) {
            console.error('渲染每日图表出错:', error);
        }
    }

    // 渲染总击杀图表
    renderTotalChart() {
        try {
            // 设置Canvas尺寸
            this.setupCanvas();
            
            // 清除画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 获取数据
            const chartData = this.statsManager.getDailyKillData(7);
            
            // 绘制柱状图
            this.drawBarChart(chartData.labels, chartData.data, '每日击杀统计', '#e74c3c');
            
        } catch (error) {
            console.error('渲染总击杀图表出错:', error);
        }
    }

    // 渲染小时图表
    renderHourlyChart() {
        try {
            // 设置Canvas尺寸
            this.setupCanvas();
            
            // 清除画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 获取数据（只显示前12个小时避免图表过于拥挤）
            const hourlyData = this.statsManager.getHourlyKillData(24);
            const displayLabels = hourlyData.labels.slice(0, 12);
            const displayData = hourlyData.data.slice(0, 12);
            
            // 绘制柱状图
            this.drawBarChart(displayLabels, displayData, '24小时击杀效率分析 (0-11点)', '#f1c40f');
            
        } catch (error) {
            console.error('渲染小时图表出错:', error);
        }
    }

    // 设置Canvas尺寸和分辨率
    setupCanvas() {
        try {
            console.log('开始设置Canvas尺寸');
            
            if (!this.canvas) {
                console.error('Canvas元素不存在');
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            console.log('Canvas getBoundingClientRect:', rect);
            
            // 如果Canvas没有尺寸，设置默认尺寸
            if (rect.width === 0 || rect.height === 0) {
                console.warn('Canvas尺寸为0，设置默认尺寸');
                this.canvas.style.width = '800px';
                this.canvas.style.height = '300px';
                // 重新获取尺寸
                const newRect = this.canvas.getBoundingClientRect();
                console.log('设置默认尺寸后:', newRect);
            }
            
            const dpr = window.devicePixelRatio || 1;
            console.log('设备像素比:', dpr);
            
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            
            console.log('Canvas实际尺寸:', this.canvas.width, 'x', this.canvas.height);
            
            this.ctx.scale(dpr, dpr);
            
            // 设置Canvas样式尺寸
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            
            console.log('Canvas尺寸设置完成');
        } catch (error) {
            console.error('设置Canvas尺寸出错:', error);
        }
    }

    // 绘制折线图
    drawLineChart(labels, data, title, color) {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const padding = 60;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...data, 1);
        
        // 设置字体
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        
        // 绘制标题
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText(title, width / 2, 30);
        
        // 重置字体
        this.ctx.font = '12px Arial';
        
        // 绘制坐标轴
        this.drawAxes(width, height, padding);
        
        // 绘制Y轴刻度和网格线
        this.drawYAxisAndGrid(width, height, padding, chartHeight, maxValue);
        
        // 绘制X轴标签
        this.drawXAxisLabels(labels, width, height, padding, chartWidth);
        
        // 绘制折线
        this.drawLine(labels, data, width, height, padding, chartWidth, chartHeight, maxValue, color);
    }

    // 绘制柱状图
    drawBarChart(labels, data, title, color) {
        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const padding = 60;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...data, 1);
        const barWidth = chartWidth / labels.length * 0.8;
        const barSpacing = chartWidth / labels.length * 0.2;
        
        // 设置字体
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        
        // 绘制标题
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText(title, width / 2, 30);
        
        // 重置字体
        this.ctx.font = '12px Arial';
        
        // 绘制坐标轴
        this.drawAxes(width, height, padding);
        
        // 绘制Y轴刻度和网格线
        this.drawYAxisAndGrid(width, height, padding, chartHeight, maxValue);
        
        // 绘制柱状图
        this.drawBars(data, width, height, padding, chartWidth, chartHeight, maxValue, barWidth, barSpacing, color);
        
        // 绘制X轴标签
        this.drawXAxisLabelsForBars(labels, width, height, padding, chartWidth);
    }

    // 绘制坐标轴
    drawAxes(width, height, padding) {
        this.ctx.strokeStyle = '#bdc3c7';
        this.ctx.lineWidth = 1;
        
        // Y轴
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, height - padding);
        this.ctx.stroke();
        
        // X轴
        this.ctx.beginPath();
        this.ctx.moveTo(padding, height - padding);
        this.ctx.lineTo(width - padding, height - padding);
        this.ctx.stroke();
    }

    // 绘制Y轴刻度和网格线
    drawYAxisAndGrid(width, height, padding, chartHeight, maxValue) {
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.textAlign = 'right';
        
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            const value = Math.round(maxValue * (5 - i) / 5);
            this.ctx.fillText(value.toString(), padding - 10, y + 5);
            
            // 绘制网格线
            if (i > 0) {
                this.ctx.strokeStyle = 'rgba(189, 195, 199, 0.3)';
                this.ctx.beginPath();
                this.ctx.moveTo(padding, y);
                this.ctx.lineTo(width - padding, y);
                this.ctx.stroke();
            }
        }
    }

    // 绘制X轴标签（折线图）
    drawXAxisLabels(labels, width, height, padding, chartWidth) {
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.textAlign = 'center';
        const stepX = chartWidth / (labels.length - 1);
        
        labels.forEach((label, index) => {
            const x = padding + stepX * index;
            this.ctx.fillText(label, x, height - padding + 20);
        });
    }

    // 绘制X轴标签（柱状图）
    drawXAxisLabelsForBars(labels, width, height, padding, chartWidth) {
        this.ctx.fillStyle = '#bdc3c7';
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'center';
        
        labels.forEach((label, index) => {
            const x = padding + (chartWidth / labels.length) * index + (chartWidth / labels.length) / 2;
            this.ctx.fillText(label, x, height - padding + 20);
        });
    }

    // 绘制折线
    drawLine(labels, data, width, height, padding, chartWidth, chartHeight, maxValue, color) {
        const stepX = chartWidth / (labels.length - 1);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + stepX * index;
            const y = height - padding - (value / maxValue) * chartHeight;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            // 绘制数据点
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
        });
        
        this.ctx.stroke();
        
        // 绘制数据标签
        this.ctx.fillStyle = '#ecf0f1';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        
        data.forEach((value, index) => {
            const x = padding + stepX * index;
            const y = height - padding - (value / maxValue) * chartHeight - 15;
            this.ctx.fillText(value.toString(), x, y);
        });
    }

    // 绘制柱状图柱子
    drawBars(data, width, height, padding, chartWidth, chartHeight, maxValue, barWidth, barSpacing, color) {
        data.forEach((value, index) => {
            const x = padding + (chartWidth / data.length) * index + barSpacing / 2;
            const barHeight = (value / maxValue) * chartHeight;
            const y = height - padding - barHeight;
            
            // 创建渐变色
            const gradient = this.ctx.createLinearGradient(0, y, 0, height - padding);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, color + '80'); // 添加透明度
            
            // 绘制柱子
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            // 绘制柱子边框
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y, barWidth, barHeight);
            
            // 绘制数据标签
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            if (value > 0) {
                this.ctx.fillText(value.toString(), x + barWidth / 2, y - 8);
            }
        });
    }

    // 获取Canvas数据（用于导出）
    getCanvasDataURL() {
        return this.canvas ? this.canvas.toDataURL() : null;
    }

    // 重置Canvas大小
    resize() {
        if (this.canvas) {
            this.setupCanvas();
            this.updateChart();
        }
    }

    // 测试图表绘制
    testChart() {
        console.log('开始测试图表绘制');
        
        if (!this.canvas || !this.ctx) {
            console.error('Canvas 或上下文不存在');
            return false;
        }
        
        try {
            // 设置Canvas尺寸
            this.setupCanvas();
            
            // 清除画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 绘制简单的测试图案
            const rect = this.canvas.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            
            // 绘制背景
            this.ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
            this.ctx.fillRect(0, 0, width, height);
            
            // 绘制测试文字
            this.ctx.fillStyle = '#f1c40f';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('图表测试', width / 2, height / 2);
            
            this.ctx.fillStyle = '#ecf0f1';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('如果您看到此消息，说明Canvas正常工作', width / 2, height / 2 + 40);
            
            console.log('测试图表绘制完成');
            return true;
        } catch (error) {
            console.error('测试图表绘制失败:', error);
            return false;
        }
    }
}

// 导出图表管理器
export { ChartManager };
