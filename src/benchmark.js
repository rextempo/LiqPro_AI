"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * API服务性能基准测试脚本
 * 用于测试API服务的性能基准
 */
const axios_1 = __importDefault(require("axios"));
const perf_hooks_1 = require("perf_hooks");
const config_1 = require("../../config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// 测试配置
const TEST_CONFIG = {
    baseUrl: process.env.API_URL || 'http://localhost:3000',
    apiKey: process.env.API_KEY || config_1.config.apiKeys[0],
    iterations: parseInt(process.env.ITERATIONS || '5', 10),
    warmupIterations: parseInt(process.env.WARMUP_ITERATIONS || '2', 10),
    requestsPerIteration: parseInt(process.env.REQUESTS_PER_ITERATION || '100', 10),
    concurrency: parseInt(process.env.CONCURRENCY || '10', 10),
    outputFile: process.env.OUTPUT_FILE || 'benchmark-results.json',
    endpoints: [
        {
            name: 'API Root',
            path: '/api',
            expectedStatus: 200
        },
        {
            name: 'Signals List',
            path: '/api/signals',
            expectedStatus: 200
        },
        {
            name: 'Data List',
            path: '/api/data',
            expectedStatus: 200
        },
        {
            name: 'Scoring List',
            path: '/api/scoring',
            expectedStatus: 200
        },
        {
            name: 'Health Check',
            path: '/health',
            expectedStatus: 200
        },
        {
            name: 'Cache Health',
            path: '/health/cache',
            expectedStatus: 200
        },
        {
            name: 'Performance Metrics',
            path: '/performance',
            expectedStatus: 200
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
    timeout: 30000
});
/**
 * 发送单个请求
 * @param endpoint 请求端点配置
 * @returns 请求结果
 */
async function sendRequest(endpoint) {
    const startTime = perf_hooks_1.performance.now();
    try {
        const response = await client.get(endpoint.path);
        const endTime = perf_hooks_1.performance.now();
        return {
            endpoint: endpoint.name,
            statusCode: response.status,
            responseTime: endTime - startTime,
            success: response.status === endpoint.expectedStatus,
            responseSize: JSON.stringify(response.data).length
        };
    }
    catch (error) {
        const endTime = perf_hooks_1.performance.now();
        return {
            endpoint: endpoint.name,
            statusCode: error.response?.status || 0,
            responseTime: endTime - startTime,
            success: false,
            error: error.message
        };
    }
}
/**
 * 计算百分位数
 * @param values 数值数组
 * @param percentile 百分位数（0-100）
 * @returns 百分位数值
 */
function calculatePercentile(values, percentile) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}
/**
 * 运行单次迭代
 * @param isWarmup 是否为预热迭代
 * @returns 请求结果数组
 */
async function runIteration(isWarmup) {
    const results = [];
    const iterationType = isWarmup ? '预热' : '测试';
    console.log(`开始${iterationType}迭代，发送 ${TEST_CONFIG.requestsPerIteration} 个请求...`);
    // 创建请求任务
    const tasks = [];
    for (let i = 0; i < TEST_CONFIG.requestsPerIteration; i++) {
        // 循环使用端点
        const endpoint = TEST_CONFIG.endpoints[i % TEST_CONFIG.endpoints.length];
        tasks.push(sendRequest(endpoint));
        // 控制并发数
        if (tasks.length >= TEST_CONFIG.concurrency || i === TEST_CONFIG.requestsPerIteration - 1) {
            const batchResults = await Promise.all(tasks);
            results.push(...batchResults);
            tasks.length = 0; // 清空任务数组
            // 输出进度
            const progress = Math.min(100, Math.round((results.length / TEST_CONFIG.requestsPerIteration) * 100));
            process.stdout.write(`\r${iterationType}进度: ${progress}% (${results.length}/${TEST_CONFIG.requestsPerIteration})`);
        }
    }
    console.log('\n');
    return results;
}
/**
 * 分析结果
 * @param allResults 所有迭代的结果
 * @returns 基准测试结果
 */
function analyzeResults(allResults) {
    // 按端点分组
    const endpointResults = {};
    for (const result of allResults) {
        if (!endpointResults[result.endpoint]) {
            endpointResults[result.endpoint] = [];
        }
        endpointResults[result.endpoint].push(result);
    }
    // 计算每个端点的统计信息
    const endpoints = [];
    for (const endpoint of TEST_CONFIG.endpoints) {
        const results = endpointResults[endpoint.name] || [];
        const responseTimes = results.map(r => r.responseTime);
        const successResults = results.filter(r => r.success);
        // 收集错误信息
        const errors = {};
        for (const result of results.filter(r => !r.success)) {
            const errorMessage = result.error || `Status: ${result.statusCode}`;
            errors[errorMessage] = (errors[errorMessage] || 0) + 1;
        }
        // 计算响应大小
        const responseSizes = results
            .filter(r => r.responseSize !== undefined)
            .map(r => r.responseSize);
        endpoints.push({
            name: endpoint.name,
            path: endpoint.path,
            requests: results.length,
            success: successResults.length,
            successRate: results.length > 0 ? (successResults.length / results.length) * 100 : 0,
            minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
            maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
            avgResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
            p50ResponseTime: calculatePercentile(responseTimes, 50),
            p90ResponseTime: calculatePercentile(responseTimes, 90),
            p95ResponseTime: calculatePercentile(responseTimes, 95),
            p99ResponseTime: calculatePercentile(responseTimes, 99),
            avgResponseSize: responseSizes.length > 0 ? responseSizes.reduce((a, b) => a + b, 0) / responseSizes.length : 0,
            errors
        });
    }
    // 计算总体统计信息
    const allResponseTimes = allResults.map(r => r.responseTime);
    const totalSuccess = allResults.filter(r => r.success).length;
    // 获取系统信息
    const cpus = require('os').cpus();
    return {
        timestamp: new Date().toISOString(),
        config: TEST_CONFIG,
        totalRequests: allResults.length,
        totalSuccess,
        totalSuccessRate: (totalSuccess / allResults.length) * 100,
        totalAvgResponseTime: allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length,
        totalMinResponseTime: Math.min(...allResponseTimes),
        totalMaxResponseTime: Math.max(...allResponseTimes),
        totalP95ResponseTime: calculatePercentile(allResponseTimes, 95),
        endpoints,
        systemInfo: {
            platform: process.platform,
            arch: process.arch,
            cpus: cpus.length,
            memory: {
                total: require('os').totalmem(),
                free: require('os').freemem()
            },
            nodeVersion: process.version
        }
    };
}
/**
 * 保存结果到文件
 * @param result 基准测试结果
 */
function saveResults(result) {
    const outputPath = path_1.default.resolve(process.cwd(), TEST_CONFIG.outputFile);
    fs_1.default.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`结果已保存到: ${outputPath}`);
}
/**
 * 打印结果摘要
 * @param result 基准测试结果
 */
function printSummary(result) {
    console.log('\n=== 性能基准测试结果摘要 ===');
    console.log(`总请求数: ${result.totalRequests}`);
    console.log(`成功率: ${result.totalSuccessRate.toFixed(2)}%`);
    console.log(`平均响应时间: ${result.totalAvgResponseTime.toFixed(2)}ms`);
    console.log(`最小响应时间: ${result.totalMinResponseTime.toFixed(2)}ms`);
    console.log(`最大响应时间: ${result.totalMaxResponseTime.toFixed(2)}ms`);
    console.log(`P95响应时间: ${result.totalP95ResponseTime.toFixed(2)}ms`);
    console.log('\n=== 端点性能 ===');
    // 按平均响应时间排序
    const sortedEndpoints = [...result.endpoints].sort((a, b) => b.avgResponseTime - a.avgResponseTime);
    for (const endpoint of sortedEndpoints) {
        console.log(`\n${endpoint.name} (${endpoint.path}):`);
        console.log(`  请求数: ${endpoint.requests}`);
        console.log(`  成功率: ${endpoint.successRate.toFixed(2)}%`);
        console.log(`  响应时间: ${endpoint.avgResponseTime.toFixed(2)}ms (min: ${endpoint.minResponseTime.toFixed(2)}ms, max: ${endpoint.maxResponseTime.toFixed(2)}ms)`);
        console.log(`  P95响应时间: ${endpoint.p95ResponseTime.toFixed(2)}ms`);
        console.log(`  平均响应大小: ${(endpoint.avgResponseSize / 1024).toFixed(2)} KB`);
        if (Object.keys(endpoint.errors).length > 0) {
            console.log('  错误:');
            for (const [error, count] of Object.entries(endpoint.errors)) {
                console.log(`    - ${error}: ${count}次`);
            }
        }
    }
    console.log('\n=== 系统信息 ===');
    console.log(`平台: ${result.systemInfo.platform} (${result.systemInfo.arch})`);
    console.log(`CPU核心数: ${result.systemInfo.cpus}`);
    console.log(`内存: 总计 ${(result.systemInfo.memory.total / (1024 * 1024 * 1024)).toFixed(2)} GB, 可用 ${(result.systemInfo.memory.free / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`Node.js版本: ${result.systemInfo.nodeVersion}`);
    console.log('\n=== 建议 ===');
    // 根据结果提供优化建议
    if (result.totalP95ResponseTime > 500) {
        console.log('- 响应时间较长，考虑优化慢速端点或增加缓存');
    }
    if (result.totalSuccessRate < 95) {
        console.log('- 成功率较低，检查错误日志并修复问题');
    }
    const slowEndpoints = result.endpoints.filter(e => e.avgResponseTime > 200);
    if (slowEndpoints.length > 0) {
        console.log(`- 慢速端点 (>200ms): ${slowEndpoints.map(e => e.name).join(', ')}`);
    }
    const highVarianceEndpoints = result.endpoints.filter(e => (e.maxResponseTime - e.minResponseTime) / e.avgResponseTime > 5);
    if (highVarianceEndpoints.length > 0) {
        console.log(`- 响应时间波动较大的端点: ${highVarianceEndpoints.map(e => e.name).join(', ')}`);
    }
}
/**
 * 运行基准测试
 */
async function runBenchmark() {
    console.log('=== API服务性能基准测试 ===');
    console.log(`基础URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`迭代次数: ${TEST_CONFIG.iterations} (预热: ${TEST_CONFIG.warmupIterations})`);
    console.log(`每次迭代请求数: ${TEST_CONFIG.requestsPerIteration}`);
    console.log(`并发数: ${TEST_CONFIG.concurrency}`);
    console.log(`测试端点: ${TEST_CONFIG.endpoints.map(e => e.path).join(', ')}`);
    console.log('开始测试...\n');
    // 预热迭代
    for (let i = 0; i < TEST_CONFIG.warmupIterations; i++) {
        console.log(`预热迭代 ${i + 1}/${TEST_CONFIG.warmupIterations}`);
        await runIteration(true);
    }
    // 测试迭代
    const allResults = [];
    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
        console.log(`测试迭代 ${i + 1}/${TEST_CONFIG.iterations}`);
        const results = await runIteration(false);
        allResults.push(...results);
    }
    // 分析结果
    const benchmarkResult = analyzeResults(allResults);
    // 保存结果
    saveResults(benchmarkResult);
    // 打印摘要
    printSummary(benchmarkResult);
}
// 运行基准测试
runBenchmark()
    .then(() => {
    console.log('\n基准测试完成');
    process.exit(0);
})
    .catch(error => {
    console.error('基准测试失败:', error);
    process.exit(1);
});
//# sourceMappingURL=benchmark.js.map