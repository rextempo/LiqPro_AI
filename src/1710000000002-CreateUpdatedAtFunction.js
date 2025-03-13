"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUpdatedAtFunction1710000000002 = void 0;
class CreateUpdatedAtFunction1710000000002 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP FUNCTION IF EXISTS update_updated_at_column()');
    }
}
exports.CreateUpdatedAtFunction1710000000002 = CreateUpdatedAtFunction1710000000002;
//# sourceMappingURL=1710000000002-CreateUpdatedAtFunction.js.map