"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * API服务故障恢复测试脚本
 * 用于测试API服务在故障情况下的恢复能力
 */
const axios_1 = __importDefault(require("axios"));
const perf_hooks_1 = require("perf_hooks");
const config_1 = require("../../config");
// 测试配置
const TEST_CONFIG = {
    baseUrl: process.env.API_URL || 'http://localhost:3000',
    apiKey: process.env.API_KEY || config_1.config.apiKeys[0],
    testDuration: parseInt(process.env.TEST_DURATION || '60', 10) * 1000, // 默认60秒
    requestInterval: parseInt(process.env.REQUEST_INTERVAL || '500', 10), // 默认500毫秒
    endpoints: [
        '/api/signals',
        '/api/data',
        '/api/scoring',
        '/api'
    ],
    // 故障模拟配置
    faults: [
        {
            type: 'timeout',
            duration: 5000, // 5秒超时
            startAt: 10000, // 测试开始10秒后
            description: '模拟网络超时'
        },
        {
            type: 'error',
            duration: 5000, // 5秒错误
            startAt: 25000, // 测试开始25秒后
            description: '模拟服务器错误'
        },
        {
            type: 'slowdown',
            duration: 5000, // 5秒慢速
            startAt: 40000, // 测试开始40秒后
            description: '模拟服务器响应变慢'
        }
    ]
};
// 创建HTTP客户端
const client = axios_1.default.create({
    baseURL: TEST_CONFIG.baseUrl,
    headers: {
        'X-API-Key': TEST_CONFIG.apiKey,
        'Content-Type': 'application/json'
    },
    timeout: 10000
});
// 当前活动的故障
let activeFault = undefined;
/**
 * 发送单个请求
 * @param endpoint 请求端点
 * @returns 测试结果
 */
async function sendRequest(endpoint) {
    const timestamp = Date.now();
    const startTime = perf_hooks_1.performance.now();
    try {
        // 根据当前活动的故障模拟不同的行为
        if (activeFault === 'timeout') {
            // 模拟超时，设置一个不可能达到的超时时间
            client.defaults.timeout = 1;
        }
        else if (activeFault === 'error') {
            // 模拟错误，请求一个不存在的端点
            const response = await client.get(`${endpoint}-not-exist`);
            const endTime = perf_hooks_1.performance.now();
            return {
                timestamp,
                endpoint,
                responseTime: endTime - startTime,
                success: true,
                statusCode: response.status,
                faultActive: activeFault
            };
        }
        else if (activeFault === 'slowdown') {
            // 模拟慢速，添加人为延迟
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        // 重置超时设置
        if (activeFault === 'timeout') {
            client.defaults.timeout = 10000;
        }
        const response = await client.get(endpoint);
        const endTime = perf_hooks_1.performance.now();
        return {
            timestamp,
            endpoint,
            responseTime: endTime - startTime,
            success: true,
            statusCode: response.status,
            faultActive: activeFault
        };
    }
    catch (error) {
        const endTime = perf_hooks_1.performance.now();
        return {
            timestamp,
            endpoint,
            responseTime: endTime - startTime,
            success: false,
            statusCode: error.response?.status || 0,
            error: error.message,
            faultActive: activeFault
        };
    }
}
/**
 * 运行故障恢复测试
 */
async function runRecoveryTest() {
    console.log('=== API服务故障恢复测试 ===');
    console.log(`基础URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`测试时长: ${TEST_CONFIG.testDuration / 1000}秒`);
    console.log(`请求间隔: ${TEST_CONFIG.requestInterval}ms`);
    console.log(`测试端点: ${TEST_CONFIG.endpoints.join(', ')}`);
    console.log('故障模拟:');
    TEST_CONFIG.faults.forEach(fault => {
        console.log(`  - ${fault.description} (${fault.type}): 开始于${fault.startAt / 1000}秒, 持续${fault.duration / 1000}秒`);
    });
    console.log('开始测试...\n');
    const results = [];
    const startTime = Date.now();
    const endTime = startTime + TEST_CONFIG.testDuration;
    // 设置故障定时器
    TEST_CONFIG.faults.forEach(fault => {
        setTimeout(() => {
            console.log(`激活故障: ${fault.description} (${fault.type})`);
            activeFault = fault.type;
        }, fault.startAt);
        setTimeout(() => {
            console.log(`故障结束: ${fault.description} (${fault.type})`);
            activeFault = undefined;
        }, fault.startAt + fault.duration);
    });
    // 持续发送请求，直到测试结束
    while (Date.now() < endTime) {
        // 随机选择一个端点
        const endpoint = TEST_CONFIG.endpoints[Math.floor(Math.random() * TEST_CONFIG.endpoints.length)];
        // 发送请求
        const result = await sendRequest(endpoint);
        results.push(result);
        // 输出实时结果
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const statusSymbol = result.success ? '✓' : '✗';
        console.log(`[${elapsedSeconds}s] ${statusSymbol} ${endpoint} - ${result.responseTime.toFixed(0)}ms ${result.faultActive ? `(故障: ${result.faultActive})` : ''}`);
        // 等待下一个请求间隔
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.requestInterval));
    }
    // 计算统计信息
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;
    // 响应时间统计
    const responseTimes = results.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    // 按故障类型分组统计
    const faultStats = {
        'no-fault': { requests: 0, success: 0, avgTime: 0 }
    };
    for (const result of results) {
        const faultType = result.faultActive || 'no-fault';
        if (!faultStats[faultType]) {
            faultStats[faultType] = { requests: 0, success: 0, avgTime: 0 };
        }
        faultStats[faultType].requests++;
        if (result.success) {
            faultStats[faultType].success++;
        }
        faultStats[faultType].avgTime += result.responseTime;
    }
    // 计算每种故障类型的平均响应时间
    for (const faultType in faultStats) {
        if (faultStats[faultType].requests > 0) {
            faultStats[faultType].avgTime /= faultStats[faultType].requests;
        }
    }
    // 计算恢复时间
    const recoveryTimes = {};
    for (const fault of TEST_CONFIG.faults) {
        const faultEndTime = startTime + fault.startAt + fault.duration;
        const postFaultResults = results.filter(r => r.timestamp >= faultEndTime);
        if (postFaultResults.length > 0) {
            // 找到故障结束后第一个成功的请求
            const firstSuccessAfterFault = postFaultResults.find(r => r.success);
            if (firstSuccessAfterFault) {
                recoveryTimes[fault.type] = firstSuccessAfterFault.timestamp - faultEndTime;
            }
            else {
                recoveryTimes[fault.type] = -1; // 没有恢复
            }
        }
    }
    // 输出测试结果
    console.log('\n=== 测试结果 ===');
    console.log(`总请求数: ${totalRequests}`);
    console.log(`成功请求数: ${successfulRequests}`);
    console.log(`失败请求数: ${failedRequests}`);
    console.log(`成功率: ${successRate.toFixed(2)}%`);
    console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`最小响应时间: ${minResponseTime.toFixed(2)}ms`);
    console.log(`最大响应时间: ${maxResponseTime.toFixed(2)}ms`);
    console.log('\n=== 故障统计 ===');
    for (const faultType in faultStats) {
        const stats = faultStats[faultType];
        console.log(`${faultType === 'no-fault' ? '正常状态' : faultType}:`);
        console.log(`  请求数: ${stats.requests}`);
        console.log(`  成功数: ${stats.success}`);
        console.log(`  成功率: ${stats.requests > 0 ? ((stats.success / stats.requests) * 100).toFixed(2) : '0.00'}%`);
        console.log(`  平均响应时间: ${stats.avgTime.toFixed(2)}ms`);
    }
    console.log('\n=== 恢复时间 ===');
    for (const faultType in recoveryTimes) {
        const recoveryTime = recoveryTimes[faultType];
        console.log(`${faultType}: ${recoveryTime >= 0 ? `${recoveryTime}ms` : '未恢复'}`);
    }
    // 输出错误信息
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
        console.log('\n=== 错误信息 ===');
        const errorGroups = {};
        for (const error of errors) {
            const errorMessage = error.error || 'Unknown error';
            errorGroups[errorMessage] = (errorGroups[errorMessage] || 0) + 1;
        }
        for (const errorMessage in errorGroups) {
            console.log(`${errorMessage}: ${errorGroups[errorMessage]}次`);
        }
    }
}
// 运行测试
runRecoveryTest()
    .then(() => {
    console.log('\n测试完成');
    process.exit(0);
})
    .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
});
//# sourceMappingURL=recovery-test.js.map