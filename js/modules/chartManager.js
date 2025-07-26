// 图表管理器 - 处理图表绘制和Canvas操作
export class ChartManager {
    constructor(statsManager) {
        this.statsManager = statsManager;
        this.canvas = document.getElementById('stats-chart');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.currentChartType = 'daily';
        this.initChart();
    }

    // 初始化图表
    initChart() {
        try {
            // 确保 Canvas 元素存在
            if (!this.canvas) {
                console.error('找不到图表容器 stats-chart');
                return;
            }
            
            // 添加标签页切换事件
            document.querySelectorAll('.chart-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    // 更新活动标签
                    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    
                    // 根据选择的图表类型渲染
                    const chartType = e.currentTarget.dataset.chart;
                    this.currentChartType = chartType;
                    
                    try {
                        // 延迟一点确保Canvas大小正确
                        setTimeout(() => {
                            this.renderChart(chartType);
                        }, 50);
                    } catch (error) {
                        console.error('图表渲染错误:', error);
                    }
                });
            });
            
            // 默认显示每日击杀图表，延迟一点确保Canvas大小正确
            setTimeout(() => {
                this.renderChart('daily');
            }, 100);
            
        } catch (error) {
            console.error('初始化图表错误:', error);
        }
    }

    // 渲染图表
    renderChart(chartType) {
        if (!this.canvas || !this.ctx) return;
        
        switch (chartType) {
            case 'daily':
                this.renderDailyChart();
                break;
            case 'total':
                this.renderTotalChart();
                break;
            case 'hourly':
                this.renderHourlyChart();
                break;
            default:
                this.renderDailyChart();
        }
    }

    // 更新当前图表
    updateChart() {
        try {
            const activeTab = document.querySelector('.chart-tab.active');
            if (!activeTab) {
                this.renderChart(this.currentChartType);
                return;
            }
            
            const chartType = activeTab.dataset.chart;
            this.renderChart(chartType);
        } catch (error) {
            console.error('更新图表错误:', error);
        }
    }

    // 渲染每日图表
    renderDailyChart() {
        try {
            // 设置Canvas尺寸
            this.setupCanvas();
            
            // 清除画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 获取数据
            const chartData = this.statsManager.getDailyKillData(7);
            
            // 绘制折线图
            this.drawLineChart(chartData.labels, chartData.data, '每日金猪击杀趋势', '#3498db');
            
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
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        // 设置Canvas样式尺寸
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
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
}

// 导出图表管理器
export { ChartManager };
