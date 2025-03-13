"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const common_1 = require("@liqpro/common");
const app = (0, express_1.default)();
const port = process.env.PORT || 3003;
app.use(express_1.default.json());
app.get('/health', async (_req, res) => {
    res.json({
        ...common_1.DEFAULT_HEALTH_CHECK,
        service: 'scoring-service'
    });
});
app.listen(port, () => {
    console.log(`Scoring service listening at http://localhost:${port}`);
});
