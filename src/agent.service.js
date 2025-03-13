"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentService = void 0;
const typeorm_1 = require("typeorm");
const base_service_1 = require("./base.service");
class AgentService extends base_service_1.BaseService {
    constructor(repository) {
        super(repository);
    }
    async findByUserId(userId) {
        try {
            return await this.repository.find({
                where: { userId },
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
                order: { updatedAt: 'DESC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async findByHealthScoreRange(minScore, maxScore) {
        try {
            return await this.repository.find({
                where: {
                    healthScore: (0, typeorm_1.Between)(minScore, maxScore),
                },
                order: { healthScore: 'ASC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async findRiskyAgents(threshold) {
        try {
            return await this.repository.find({
                where: {
                    healthScore: (0, typeorm_1.LessThan)(threshold),
                    status: 'RUNNING',
                },
                order: { healthScore: 'ASC' },
            });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async updateHealthScore(id, healthScore) {
        try {
            await this.repository.update(id, { healthScore });
            return this.findById(id);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async updateStatus(id, status) {
        try {
            await this.repository.update(id, { status });
            return this.findById(id);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async updatePositions(id, positions) {
        try {
            await this.repository.update(id, { positions });
            return this.findById(id);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async updateBalances(id, totalValue, availableBalance) {
        try {
            await this.repository.update(id, { totalValue, availableBalance });
            return this.findById(id);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
}
exports.AgentService = AgentService;
//# sourceMappingURL=agent.service.js.map