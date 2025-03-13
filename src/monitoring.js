"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.httpRequestTotal = exports.httpRequestDuration = exports.metricsRegistry = void 0;
const prom_client_1 = require("prom-client");
const winston_1 = __importDefault(require("winston"));
const winston_elasticsearch_1 = require("winston-elasticsearch");
// Prometheus metrics setup
exports.metricsRegistry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register: exports.metricsRegistry });
// Custom metrics
exports.httpRequestDuration = new exports.metricsRegistry.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5],
});
exports.httpRequestTotal = new exports.metricsRegistry.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});
// Winston logger setup
exports.logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    defaultMeta: { service: 'data-service' },
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
        new winston_elasticsearch_1.ElasticsearchTransport({
            level: 'info',
            clientOpts: {
                node: 'http://elasticsearch:9200',
                maxRetries: 5,
                requestTimeout: 10000,
            },
            indexPrefix: 'liqpro-logs',
        }),
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb25maWcvbW9uaXRvcmluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2Q0FBOEQ7QUFDOUQsc0RBQThCO0FBQzlCLGlFQUErRDtBQUUvRCwyQkFBMkI7QUFDZCxRQUFBLGVBQWUsR0FBRyxJQUFJLHNCQUFRLEVBQUUsQ0FBQztBQUM5QyxJQUFBLG1DQUFxQixFQUFDLEVBQUUsUUFBUSxFQUFFLHVCQUFlLEVBQUUsQ0FBQyxDQUFDO0FBRXJELGlCQUFpQjtBQUNKLFFBQUEsbUJBQW1CLEdBQUcsSUFBSSx1QkFBZSxDQUFDLFNBQVMsQ0FBQztJQUMvRCxJQUFJLEVBQUUsK0JBQStCO0lBQ3JDLElBQUksRUFBRSxzQ0FBc0M7SUFDNUMsVUFBVSxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUM7SUFDOUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztDQUM3QixDQUFDLENBQUM7QUFFVSxRQUFBLGdCQUFnQixHQUFHLElBQUksdUJBQWUsQ0FBQyxPQUFPLENBQUM7SUFDMUQsSUFBSSxFQUFFLHFCQUFxQjtJQUMzQixJQUFJLEVBQUUsK0JBQStCO0lBQ3JDLFVBQVUsRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDO0NBQy9DLENBQUMsQ0FBQztBQUVILHVCQUF1QjtBQUNWLFFBQUEsTUFBTSxHQUFHLGlCQUFPLENBQUMsWUFBWSxDQUFDO0lBQ3pDLEtBQUssRUFBRSxNQUFNO0lBQ2IsTUFBTSxFQUFFLGlCQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNqRixXQUFXLEVBQUUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFO0lBQ3hDLFVBQVUsRUFBRTtRQUNWLElBQUksaUJBQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQzdCLE1BQU0sRUFBRSxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsaUJBQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDbkYsQ0FBQztRQUNGLElBQUksOENBQXNCLENBQUM7WUFDekIsS0FBSyxFQUFFLE1BQU07WUFDYixVQUFVLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLDJCQUEyQjtnQkFDakMsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsY0FBYyxFQUFFLEtBQUs7YUFDdEI7WUFDRCxXQUFXLEVBQUUsYUFBYTtTQUMzQixDQUFDO0tBQ0g7Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZWdpc3RyeSwgY29sbGVjdERlZmF1bHRNZXRyaWNzIH0gZnJvbSAncHJvbS1jbGllbnQnO1xuaW1wb3J0IHdpbnN0b24gZnJvbSAnd2luc3Rvbic7XG5pbXBvcnQgeyBFbGFzdGljc2VhcmNoVHJhbnNwb3J0IH0gZnJvbSAnd2luc3Rvbi1lbGFzdGljc2VhcmNoJztcblxuLy8gUHJvbWV0aGV1cyBtZXRyaWNzIHNldHVwXG5leHBvcnQgY29uc3QgbWV0cmljc1JlZ2lzdHJ5ID0gbmV3IFJlZ2lzdHJ5KCk7XG5jb2xsZWN0RGVmYXVsdE1ldHJpY3MoeyByZWdpc3RlcjogbWV0cmljc1JlZ2lzdHJ5IH0pO1xuXG4vLyBDdXN0b20gbWV0cmljc1xuZXhwb3J0IGNvbnN0IGh0dHBSZXF1ZXN0RHVyYXRpb24gPSBuZXcgbWV0cmljc1JlZ2lzdHJ5Lkhpc3RvZ3JhbSh7XG4gIG5hbWU6ICdodHRwX3JlcXVlc3RfZHVyYXRpb25fc2Vjb25kcycsXG4gIGhlbHA6ICdEdXJhdGlvbiBvZiBIVFRQIHJlcXVlc3RzIGluIHNlY29uZHMnLFxuICBsYWJlbE5hbWVzOiBbJ21ldGhvZCcsICdyb3V0ZScsICdzdGF0dXNfY29kZSddLFxuICBidWNrZXRzOiBbMC4xLCAwLjUsIDEsIDIsIDVdLFxufSk7XG5cbmV4cG9ydCBjb25zdCBodHRwUmVxdWVzdFRvdGFsID0gbmV3IG1ldHJpY3NSZWdpc3RyeS5Db3VudGVyKHtcbiAgbmFtZTogJ2h0dHBfcmVxdWVzdHNfdG90YWwnLFxuICBoZWxwOiAnVG90YWwgbnVtYmVyIG9mIEhUVFAgcmVxdWVzdHMnLFxuICBsYWJlbE5hbWVzOiBbJ21ldGhvZCcsICdyb3V0ZScsICdzdGF0dXNfY29kZSddLFxufSk7XG5cbi8vIFdpbnN0b24gbG9nZ2VyIHNldHVwXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gd2luc3Rvbi5jcmVhdGVMb2dnZXIoe1xuICBsZXZlbDogJ2luZm8nLFxuICBmb3JtYXQ6IHdpbnN0b24uZm9ybWF0LmNvbWJpbmUod2luc3Rvbi5mb3JtYXQudGltZXN0YW1wKCksIHdpbnN0b24uZm9ybWF0Lmpzb24oKSksXG4gIGRlZmF1bHRNZXRhOiB7IHNlcnZpY2U6ICdkYXRhLXNlcnZpY2UnIH0sXG4gIHRyYW5zcG9ydHM6IFtcbiAgICBuZXcgd2luc3Rvbi50cmFuc3BvcnRzLkNvbnNvbGUoe1xuICAgICAgZm9ybWF0OiB3aW5zdG9uLmZvcm1hdC5jb21iaW5lKHdpbnN0b24uZm9ybWF0LmNvbG9yaXplKCksIHdpbnN0b24uZm9ybWF0LnNpbXBsZSgpKSxcbiAgICB9KSxcbiAgICBuZXcgRWxhc3RpY3NlYXJjaFRyYW5zcG9ydCh7XG4gICAgICBsZXZlbDogJ2luZm8nLFxuICAgICAgY2xpZW50T3B0czoge1xuICAgICAgICBub2RlOiAnaHR0cDovL2VsYXN0aWNzZWFyY2g6OTIwMCcsXG4gICAgICAgIG1heFJldHJpZXM6IDUsXG4gICAgICAgIHJlcXVlc3RUaW1lb3V0OiAxMDAwMCxcbiAgICAgIH0sXG4gICAgICBpbmRleFByZWZpeDogJ2xpcXByby1sb2dzJyxcbiAgICB9KSxcbiAgXSxcbn0pO1xuIl19