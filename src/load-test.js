"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * API服务高并发测试脚本
 * 用于测试API服务在高并发情况下的性能
 */
const axios_1 = __importDefault(require("axios"));
const perf_hooks_1 = require("perf_hooks");
const config_1 = require("../../config");
// 测试配置
const TEST_CONFIG = {
    baseUrl: process.env.API_URL || 'http://localhost:3000',
    apiKey: process.env.API_KEY || config_1.config.apiKeys[0],
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '50', 10),
    requestsPerUser: parseInt(process.env.REQUESTS_PER_USER || '10', 10),
    delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS || '100', 10),
    endpoints: [
        '/api/signals',
        '/api/data',
        '/api/scoring',
        '/api'
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
/**
 * 发送单个请求
 * @param endpoint 请求端点
 * @returns 测试结果
 */
async function sendRequest(endpoint) {
    const startTime = perf_hooks_1.performance.now();
    try {
        const response = await client.get(endpoint);
        const endTime = perf_hooks_1.performance.now();
        return {
            endpoint,
            statusCode: response.status,
            responseTime: endTime - startTime,
            success: true
        };
    }
    catch (error) {
        const endTime = perf_hooks_1.performance.now();
        return {
            endpoint,
            statusCode: error.response?.status || 0,
            responseTime: endTime - startTime,
            success: false,
            error: error.message
        };
    }
}
/**
 * 模拟单个用户的请求
 * @param userId 用户ID
 * @returns 测试结果数组
 */
async function simulateUser(userId) {
    const results = [];
    for (let i = 0; i < TEST_CONFIG.requestsPerUser; i++) {
        // 随机选择一个端点
        const endpoint = TEST_CONFIG.endpoints[Math.floor(Math.random() * TEST_CONFIG.endpoints.length)];
        // 发送请求
        const result = await sendRequest(endpoint);
        results.push(result);
        // 添加延迟，模拟真实用户行为
        if (i < TEST_CONFIG.requestsPerUser - 1) {
            await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.delayBetweenRequests));
        }
    }
    return results;
}
/**
 * 运行负载测试
 */
async function runLoadTest() {
    console.log('=== API服务高并发测试 ===');
    console.log(`基础URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`并发用户数: ${TEST_CONFIG.concurrentUsers}`);
    console.log(`每用户请求数: ${TEST_CONFIG.requestsPerUser}`);
    console.log(`请求间延迟: ${TEST_CONFIG.delayBetweenRequests}ms`);
    console.log(`测试端点: ${TEST_CONFIG.endpoints.join(', ')}`);
    console.log('开始测试...\n');
    const startTime = perf_hooks_1.performance.now();
    // 创建并发用户
    const userPromises = Array.from({ length: TEST_CONFIG.concurrentUsers }, (_, i) => simulateUser(i + 1));
    // 等待所有用户完成请求
    const userResults = await Promise.all(userPromises);
    // 合并所有结果
    const allResults = userResults.flat();
    const endTime = perf_hooks_1.performance.now();
    const totalDuration = endTime - startTime;
    // 计算统计信息
    const totalRequests = allResults.length;
    const successfulRequests = allResults.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;
    // 响应时间统计
    const responseTimes = allResults.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    // 按端点分组统计
    const endpointStats = {};
    for (const result of allResults) {
        if (!endpointStats[result.endpoint]) {
            endpointStats[result.endpoint] = { count: 0, success: 0, avgTime: 0 };
        }
        endpointStats[result.endpoint].count++;
        if (result.success) {
            endpointStats[result.endpoint].success++;
        }
        endpointStats[result.endpoint].avgTime += result.responseTime;
    }
    // 计算每个端点的平均响应时间
    for (const endpoint in endpointStats) {
        endpointStats[endpoint].avgTime /= endpointStats[endpoint].count;
    }
    // 输出测试结果
    console.log('\n=== 测试结果 ===');
    console.log(`总请求数: ${totalRequests}`);
    console.log(`成功请求数: ${successfulRequests}`);
    console.log(`失败请求数: ${failedRequests}`);
    console.log(`成功率: ${successRate.toFixed(2)}%`);
    console.log(`总测试时间: ${totalDuration.toFixed(2)}ms`);
    console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`最小响应时间: ${minResponseTime.toFixed(2)}ms`);
    console.log(`最大响应时间: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`每秒请求数: ${((totalRequests / totalDuration) * 1000).toFixed(2)}`);
    console.log('\n=== 端点统计 ===');
    for (const endpoint in endpointStats) {
        const stats = endpointStats[endpoint];
        console.log(`${endpoint}:`);
        console.log(`  请求数: ${stats.count}`);
        console.log(`  成功数: ${stats.success}`);
        console.log(`  成功率: ${((stats.success / stats.count) * 100).toFixed(2)}%`);
        console.log(`  平均响应时间: ${stats.avgTime.toFixed(2)}ms`);
    }
    // 输出错误信息
    const errors = allResults.filter(r => !r.success);
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
runLoadTest()
    .then(() => {
    console.log('\n测试完成');
    process.exit(0);
})
    .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
});
//# sourceMappingURL=load-test.js.map