"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const typeorm_1 = require("typeorm");
const base_service_1 = require("./base.service");
class TransactionService extends base_service_1.BaseService {
    constructor(repository) {
        super(repository);
    }
    async findByAgentId(agentId) {
        try {
            return await this.repository.find({
                where: { agentId },
                order: { createdAt: 'DESC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async findByPoolAddress(poolAddress) {
        try {
            return await this.repository.find({
                where: { poolAddress },
                order: { createdAt: 'DESC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async findByDateRange(startDate, endDate) {
        try {
            return await this.repository.find({
                where: {
                    createdAt: (0, typeorm_1.Between)(startDate, endDate),
                },
                order: { createdAt: 'DESC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async findByType(type) {
        try {
            return await this.repository.find({
                where: { type },
                order: { createdAt: 'DESC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async findByStatus(status) {
        try {
            return await this.repository.find({
                where: { status },
                order: { createdAt: 'DESC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async findPendingTransactions() {
        try {
            return await this.repository.find({
                where: { status: 'PENDING' },
                order: { createdAt: 'ASC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async updateStatus(id, status, metadata) {
        try {
            const updateData = { status };
            if (metadata) {
                updateData.metadata = metadata;
            }
            await this.repository.update(id, updateData);
            return this.findById(id);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getAgentTransactionStats(agentId) {
        try {
            const transactions = await this.repository.find({
                where: { agentId },
            });
            const totalTransactions = transactions.length;
            const successfulTransactions = transactions.filter(t => t.status === 'CONFIRMED').length;
            const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
            return {
                totalTransactions,
                totalAmount,
                successRate: totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0,
            };
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async getPoolTransactionStats(poolAddress) {
        try {
            const transactions = await this.repository.find({
                where: { poolAddress },
            });
            const totalTransactions = transactions.length;
            const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
            const totalPriceImpact = transactions.reduce((sum, t) => sum + Number(t.priceImpact), 0);
            return {
                totalTransactions,
                totalAmount,
                averagePriceImpact: totalTransactions > 0 ? totalPriceImpact / totalTransactions : 0,
            };
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=transaction.service.js.map