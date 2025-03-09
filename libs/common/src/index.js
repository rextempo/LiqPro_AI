"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHealthy = exports.DEFAULT_HEALTH_CHECK = void 0;
// Constants
exports.DEFAULT_HEALTH_CHECK = {
    status: 'ok'
};
// Utilities
function isHealthy(check) {
    return check.status === 'ok';
}
exports.isHealthy = isHealthy;
