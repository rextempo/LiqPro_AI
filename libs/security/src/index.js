"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
async function generateToken(payload) {
    // TODO: Implement proper secret key management
    return jsonwebtoken_1.default.sign(payload, 'temporary-secret', { expiresIn: '2h' });
}
exports.generateToken = generateToken;
async function verifyToken(token) {
    return jsonwebtoken_1.default.verify(token, 'temporary-secret');
}
exports.verifyToken = verifyToken;
