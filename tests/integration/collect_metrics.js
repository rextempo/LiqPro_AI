/**
 * LiqPro DLMM 测试指标收集脚本
 * 
 * 此脚本用于收集和记录集成测试的性能和功能指标，便于后续分析
 */

const fs = require('fs');
const path = require('path');

// 确保路径存在
const metricsDir = path.join(__dirname, 'metrics');
if (!fs.existsSync(metricsDir)) {
  fs.mkdirSync(metricsDir, { recursive: true });
}

// 测试指标文件路径
const METRICS_FILE = path.join(metricsDir, 'test_metrics.json');

/**
 * 初始化和加载指标
 */
function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_FILE)) {
      const data = fs.readFileSync(METRICS_FILE, 'utf8');
      return JSON.parse(data);
    }
    
    // 初始化指标结构
    return {
      tests: [],
      summary: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        avgResponseTimes: {
          dataService: 0,
          signalService: 0,
          scoringService: 0
        },
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('加载指标文件时出错:', error);
    return {
      tests: [],
      summary: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        avgResponseTimes: {
          dataService: 0,
          signalService: 0,
          scoringService: 0
        },
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * 保存指标到文件
 */
function saveMetrics(metrics) {
  try {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
    console.log(`指标已保存到 ${METRICS_FILE}`);
  } catch (error) {
    console.error('保存指标文件时出错:', error);
  }
}

/**
 * 添加新的测试结果
 */
function addTestResult(params) {
  const { 
    testId = `test_${Date.now()}`,
    timestamp = new Date().toISOString(),
    duration,
    success,
    environment,
    responseTimes = {},
    errorCounts = {},
    testCounts = {},
    notes = ''
  } = params;
  
  const metrics = loadMetrics();
  
  // 添加新的测试结果
  const testResult = {
    testId,
    timestamp,
    duration,
    success,
    environment,
    responseTimes,
    errorCounts,
    testCounts,
    notes
  };
  
  metrics.tests.push(testResult);
  
  // 更新摘要
  metrics.summary.totalRuns++;
  if (success) {
    metrics.summary.successfulRuns++;
  } else {
    metrics.summary.failedRuns++;
  }
  
  // 更新平均响应时间
  if (responseTimes.dataService) {
    const prevTotal = metrics.summary.avgResponseTimes.dataService * (metrics.summary.totalRuns - 1);
    metrics.summary.avgResponseTimes.dataService = 
      (prevTotal + responseTimes.dataService) / metrics.summary.totalRuns;
  }
  
  if (responseTimes.signalService) {
    const prevTotal = metrics.summary.avgResponseTimes.signalService * (metrics.summary.totalRuns - 1);
    metrics.summary.avgResponseTimes.signalService = 
      (prevTotal + responseTimes.signalService) / metrics.summary.totalRuns;
  }
  
  if (responseTimes.scoringService) {
    const prevTotal = metrics.summary.avgResponseTimes.scoringService * (metrics.summary.totalRuns - 1);
    metrics.summary.avgResponseTimes.scoringService = 
      (prevTotal + responseTimes.scoringService) / metrics.summary.totalRuns;
  }
  
  // 更新最后更新时间
  metrics.summary.lastUpdated = timestamp;
  
  // 保存更新后的指标
  saveMetrics(metrics);
  
  return testResult;
}

/**
 * 从日志文件中解析指标
 */
function parseMetricsFromLog(logFilePath) {
  try {
    if (!fs.existsSync(logFilePath)) {
      console.error(`日志文件不存在: ${logFilePath}`);
      return null;
    }
    
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');
    
    // 解析基本信息
    const testId = `test_${path.basename(logFilePath).replace(/[^0-9]/g, '')}`;
    const timestamp = new Date().toISOString();
    
    // 提取持续时间
    const durationMatch = logContent.match(/测试持续时间: ([\d.]+) 秒/);
    const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;
    
    // 提取成功/失败信息
    const successMatch = logContent.includes('总体结果: 成功');
    
    // 提取环境信息
    const environmentMatch = logContent.match(/模拟服务|真实服务/);
    const environment = environmentMatch ? environmentMatch[0] : '未知';
    
    // 计算错误数
    const errorCount = (logContent.match(/\[ERROR\]/g) || []).length;
    const warningCount = (logContent.match(/\[WARN\]/g) || []).length;
    
    // 提取测试计数
    const dataServiceTestMatch = logContent.match(/数据服务.*?通过/);
    const signalServiceTestMatch = logContent.match(/信号服务.*?通过/);
    const scoringServiceTestMatch = logContent.match(/评分服务.*?通过/);
    const integrationTestMatch = logContent.match(/集成流程.*?通过/);
    
    // 响应时间估算（从日志中提取响应时间信息）
    // 这是一个简化的实现，实际项目中可能需要更精确的响应时间记录
    const responseTimeRegex = /\+(\d+\.\d+)s.*?获取.*?数据/g;
    const responseTimes = [];
    let match;
    while ((match = responseTimeRegex.exec(logContent)) !== null) {
      responseTimes.push(parseFloat(match[1]));
    }
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    
    // 构建结果对象
    const result = {
      testId,
      timestamp,
      duration,
      success: successMatch,
      environment,
      responseTimes: {
        dataService: avgResponseTime,
        signalService: avgResponseTime,
        scoringService: avgResponseTime
      },
      errorCounts: {
        errors: errorCount,
        warnings: warningCount
      },
      testCounts: {
        dataService: dataServiceTestMatch ? 1 : 0,
        signalService: signalServiceTestMatch ? 1 : 0,
        scoringService: scoringServiceTestMatch ? 1 : 0,
        integration: integrationTestMatch ? 1 : 0
      },
      notes: '从日志文件自动解析'
    };
    
    return result;
  } catch (error) {
    console.error('解析日志文件时出错:', error);
    return null;
  }
}

/**
 * 从日志目录解析所有日志并添加指标
 */
function processAllLogs(logsDir = path.join(__dirname, 'logs')) {
  try {
    if (!fs.existsSync(logsDir)) {
      console.error(`日志目录不存在: ${logsDir}`);
      return;
    }
    
    // 获取所有日志文件
    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('integration_test_') && file.endsWith('.log'));
    
    console.log(`发现 ${logFiles.length} 个日志文件...`);
    
    // 处理每个日志文件
    let processedCount = 0;
    for (const logFile of logFiles) {
      const logPath = path.join(logsDir, logFile);
      const metrics = parseMetricsFromLog(logPath);
      
      if (metrics) {
        addTestResult(metrics);
        processedCount++;
      }
    }
    
    console.log(`已处理 ${processedCount} 个日志文件的指标`);
  } catch (error) {
    console.error('处理日志目录时出错:', error);
  }
}

/**
 * 生成简单的指标摘要报告
 */
function generateReport() {
  try {
    const metrics = loadMetrics();
    const { summary } = metrics;
    
    // 计算成功率
    const successRate = summary.totalRuns > 0 
      ? (summary.successfulRuns / summary.totalRuns * 100).toFixed(2)
      : 0;
    
    // 按时间顺序对测试结果排序
    const sortedTests = [...metrics.tests].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // 取最近的10次测试
    const recentTests = sortedTests.slice(0, 10);
    
    // 生成报告
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        ...summary,
        successRate: `${successRate}%`
      },
      recentTests: recentTests.map(test => ({
        testId: test.testId,
        timestamp: test.timestamp,
        success: test.success,
        environment: test.environment,
        duration: test.duration,
        errorCount: test.errorCounts?.errors || 0
      }))
    };
    
    // 保存报告到文件
    const reportFile = path.join(metricsDir, 'metrics_report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`指标报告已生成: ${reportFile}`);
    return report;
  } catch (error) {
    console.error('生成报告时出错:', error);
    return null;
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case 'add':
      // 手动添加测试结果
      const success = args[1] === 'true';
      const duration = args[2] ? parseInt(args[2]) : 60;
      const environment = args[3] || '未知';
      
      addTestResult({
        success,
        duration,
        environment,
        notes: '通过命令行手动添加'
      });
      break;
      
    case 'process-logs':
      // 处理日志目录
      const logsDir = args[1] || path.join(__dirname, 'logs');
      processAllLogs(logsDir);
      break;
      
    case 'report':
      // 生成报告
      generateReport();
      break;
      
    case 'help':
    default:
      console.log(`
LiqPro DLMM 测试指标收集工具

用法:
  node collect_metrics.js <命令> [参数...]

命令:
  add <success> [duration] [environment] - 添加测试结果
    success: true 或 false
    duration: 测试持续时间（秒）
    environment: 测试环境描述
    
  process-logs [logsDir] - 处理日志目录中的所有日志文件
    logsDir: 日志目录路径（默认：./logs）
    
  report - 生成测试指标报告
  
  help - 显示此帮助信息
`);
      break;
  }
}

module.exports = {
  addTestResult,
  parseMetricsFromLog,
  processAllLogs,
  generateReport
}; 