"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const common_1 = require("@liqpro/common");
const database_1 = require("@liqpro/database");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use(express_1.default.json());
app.get('/health', async (_req, res) => {
    const dbHealth = await (0, database_1.checkDatabaseConnection)();
    res.json({
        ...common_1.DEFAULT_HEALTH_CHECK,
        database: dbHealth
    });
});
app.listen(port, () => {
    console.log(`Data service listening at http://localhost:${port}`);
});
