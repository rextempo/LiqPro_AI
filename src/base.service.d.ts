import { Repository, FindOneOptions, DeepPartial, ObjectLiteral } from 'typeorm';
import { DatabaseError } from '../index';
export declare abstract class BaseService<T extends ObjectLiteral> {
  protected repository: Repository<T>;
  constructor(repository: Repository<T>);
  findById(id: string): Promise<T | null>;
  findOne(options: FindOneOptions<T>): Promise<T | null>;
  find(options?: FindOneOptions<T>): Promise<T[]>;
  create(data: DeepPartial<T>): Promise<T>;
  update(id: string, data: DeepPartial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  protected handleError(error: unknown): DatabaseError;
}
//# sourceMappingURL=base.service.d.ts.map
