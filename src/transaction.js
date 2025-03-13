"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = exports.TransactionPriority = exports.TransactionType = void 0;
// 交易类型枚举
var TransactionType;
(function (TransactionType) {
    TransactionType["DEPOSIT"] = "DEPOSIT";
    TransactionType["WITHDRAW"] = "WITHDRAW";
    TransactionType["ADD_LIQUIDITY"] = "ADD_LIQUIDITY";
    TransactionType["REMOVE_LIQUIDITY"] = "REMOVE_LIQUIDITY";
    TransactionType["SWAP"] = "SWAP";
    TransactionType["SWAP_TO_SOL"] = "SWAP_TO_SOL";
    TransactionType["REBALANCE"] = "REBALANCE";
    TransactionType["EMERGENCY_EXIT"] = "EMERGENCY_EXIT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
// 交易优先级枚举
var TransactionPriority;
(function (TransactionPriority) {
    TransactionPriority["LOW"] = "LOW";
    TransactionPriority["MEDIUM"] = "MEDIUM";
    TransactionPriority["HIGH"] = "HIGH";
    TransactionPriority["CRITICAL"] = "CRITICAL";
})(TransactionPriority || (exports.TransactionPriority = TransactionPriority = {}));
// 交易状态枚举
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["SIGNING"] = "SIGNING";
    TransactionStatus["SENDING"] = "SENDING";
    TransactionStatus["CONFIRMING"] = "CONFIRMING";
    TransactionStatus["CONFIRMED"] = "CONFIRMED";
    TransactionStatus["FAILED"] = "FAILED";
    TransactionStatus["RETRYING"] = "RETRYING";
    TransactionStatus["CANCELLED"] = "CANCELLED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
//# sourceMappingURL=transaction.js.map