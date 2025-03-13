"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
class BaseService {
    constructor(repository) {
        this.repository = repository;
    }
    async findById(id) {
        try {
            return await this.repository.findOneBy({ id });
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async findOne(options) {
        try {
            return await this.repository.findOne(options);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async find(options) {
        try {
            return await this.repository.find(options);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async create(data) {
        try {
            const entity = this.repository.create(data);
            return await this.repository.save(entity);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async update(id, data) {
        try {
            await this.repository.update(id, data);
            return this.findById(id);
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    async delete(id) {
        try {
            const result = await this.repository.delete(id);
            return result.affected ? result.affected > 0 : false;
        }
        catch (error) {
            throw this.handleError(error);
        }
    }
    handleError(error) {
        const dbError = {
            name: 'DatabaseError',
            message: 'Database operation failed',
        };
        if (error instanceof Error) {
            dbError.message = error.message;
            dbError.stack = error.stack;
            if ('code' in error) {
                dbError.code = error.code;
            }
            if ('detail' in error) {
                dbError.detail = error.detail;
            }
        }
        return dbError;
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base.service.js.map