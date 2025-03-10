/**
 * LiqPro Signal System Integration Test Logger
 * 
 * 提供增强的日志记录功能，用于集成测试
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 100
};

// 当前日志级别（可通过环境变量配置）
const currentLevel = process.env.LOG_LEVEL ? 
  LOG_LEVELS[process.env.LOG_LEVEL] : LOG_LEVELS.INFO;

// 创建日志目录
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

// 创建唯一的日志文件名
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFilePath = path.join(logDirectory, `integration_test_${timestamp}.log`);
const errorLogFilePath = path.join(logDirectory, `integration_test_errors_${timestamp}.log`);

// 写入日志文件头
fs.writeFileSync(logFilePath, `--- LiqPro Signal System Integration Test Log ---\n`);
fs.writeFileSync(errorLogFilePath, `--- LiqPro Signal System Integration Test Error Log ---\n`);

// 颜色配置 (用于控制台输出)
const colors = {
  reset: '\x1b[0m',
  debug: '\x1b[90m', // 灰色
  info: '\x1b[36m',  // 青色
  warn: '\x1b[33m',  // 黄色
  error: '\x1b[31m', // 红色
  success: '\x1b[32m' // 绿色
};

class Logger {
  constructor() {
    this.testStartTime = Date.now();
    this.counters = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };
  }

  /**
   * 格式化日志消息
   */
  _formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const elapsed = ((Date.now() - this.testStartTime) / 1000).toFixed(3);
    let formattedMessage = `[${timestamp}] [+${elapsed}s] [${level}] ${message}`;
    
    if (data !== null) {
      if (data instanceof Error) {
        formattedMessage += `\n${data.stack || data.message || data}`;
      } else if (typeof data === 'object') {
        try {
          formattedMessage += '\n' + util.inspect(data, { depth: 5, colors: false });
        } catch (e) {
          formattedMessage += '\n' + JSON.stringify(data, null, 2);
        }
      } else {
        formattedMessage += '\n' + data;
      }
    }
    
    return formattedMessage;
  }

  /**
   * 输出到控制台和日志文件
   */
  _log(level, levelStr, message, data = null) {
    if (level < currentLevel) return;
    
    const formattedMessage = this._formatMessage(levelStr, message, data);
    
    // 增加计数器
    if (levelStr.toLowerCase() in this.counters) {
      this.counters[levelStr.toLowerCase()]++;
    }
    
    // 输出到控制台（带颜色）
    const colorKey = levelStr.toLowerCase();
    const color = colors[colorKey] || colors.reset;
    console.log(`${color}${formattedMessage}${colors.reset}`);
    
    // 写入日志文件
    fs.appendFileSync(logFilePath, formattedMessage + '\n');
    
    // 如果是错误，同时写入错误日志
    if (level >= LOG_LEVELS.ERROR) {
      fs.appendFileSync(errorLogFilePath, formattedMessage + '\n');
    }
  }

  debug(message, data = null) {
    this._log(LOG_LEVELS.DEBUG, 'DEBUG', message, data);
  }

  info(message, data = null) {
    this._log(LOG_LEVELS.INFO, 'INFO', message, data);
  }

  warn(message, data = null) {
    this._log(LOG_LEVELS.WARN, 'WARN', message, data);
  }

  error(message, data = null) {
    this._log(LOG_LEVELS.ERROR, 'ERROR', message, data);
  }

  success(message, data = null) {
    this._log(LOG_LEVELS.INFO, 'SUCCESS', message, data);
  }

  /**
   * 记录测试开始
   */
  startTest(testName) {
    this._log(LOG_LEVELS.INFO, 'TEST', `Starting test: ${testName}`);
  }

  /**
   * 记录测试结束
   */
  endTest(testName, success, data = null) {
    const status = success ? 'PASSED' : 'FAILED';
    const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
    const levelStr = success ? 'SUCCESS' : 'ERROR';
    
    this._log(level, levelStr, `Test ${testName}: ${status}`, data);
  }

  /**
   * 记录服务请求
   */
  request(service, endpoint, params = null) {
    this._log(LOG_LEVELS.DEBUG, 'REQUEST', `${service} -> ${endpoint}`, params);
  }

  /**
   * 记录服务响应
   */
  response(service, endpoint, responseData, status = 200) {
    const level = status >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;
    const levelStr = status >= 400 ? 'ERROR' : 'RESPONSE';
    
    this._log(level, levelStr, `${service} <- ${endpoint} (${status})`, responseData);
  }

  /**
   * 打印测试摘要
   */
  printSummary() {
    const elapsed = ((Date.now() - this.testStartTime) / 1000).toFixed(2);
    
    const summaryMessage = `
==========================================================
  LiqPro Signal System Integration Test Summary
==========================================================
  测试持续时间: ${elapsed} 秒
  信息日志数量: ${this.counters.info}
  警告日志数量: ${this.counters.warn}
  错误日志数量: ${this.counters.error}
  调试日志数量: ${this.counters.debug}
==========================================================
  日志文件保存在: ${logFilePath}
  错误日志保存在: ${errorLogFilePath}
==========================================================`;
    
    console.log(summaryMessage);
    fs.appendFileSync(logFilePath, summaryMessage + '\n');
  }
}

module.exports = new Logger(); 