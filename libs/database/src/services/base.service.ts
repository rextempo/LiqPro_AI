import { Repository, FindOptionsWhere, FindOneOptions, DeepPartial, ObjectLiteral } from 'typeorm';
import { DatabaseError } from '../index';

export abstract class BaseService<T extends ObjectLiteral> {
    constructor(protected repository: Repository<T>) {}

    async findById(id: string): Promise<T | null> {
        try {
            return await this.repository.findOneBy({ id } as unknown as FindOptionsWhere<T>);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async findOne(options: FindOneOptions<T>): Promise<T | null> {
        try {
            return await this.repository.findOne(options);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async find(options?: FindOneOptions<T>): Promise<T[]> {
        try {
            return await this.repository.find(options);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async create(data: DeepPartial<T>): Promise<T> {
        try {
            const entity = this.repository.create(data);
            return await this.repository.save(entity);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async update(id: string, data: DeepPartial<T>): Promise<T | null> {
        try {
            await this.repository.update(id, data);
            return this.findById(id);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async delete(id: string): Promise<boolean> {
        try {
            const result = await this.repository.delete(id);
            return result.affected ? result.affected > 0 : false;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    protected handleError(error: unknown): DatabaseError {
        const dbError: DatabaseError = {
            name: 'DatabaseError',
            message: 'Database operation failed',
        };

        if (error instanceof Error) {
            dbError.message = error.message;
            dbError.stack = error.stack;
            if ('code' in error) {
                dbError.code = (error as any).code;
            }
            if ('detail' in error) {
                dbError.detail = (error as any).detail;
            }
        }

        return dbError;
    }
} 