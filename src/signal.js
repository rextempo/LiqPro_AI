"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalReliability = exports.SignalStrength = exports.TimeFrame = exports.SignalType = void 0;
/**
 * 信号类型枚举
 */
var SignalType;
(function (SignalType) {
    SignalType["ENTRY"] = "entry";
    SignalType["EXIT"] = "exit";
    SignalType["REBALANCE"] = "rebalance";
    SignalType["RISK_WARNING"] = "risk_warning";
    SignalType["OPPORTUNITY"] = "opportunity";
})(SignalType || (exports.SignalType = SignalType = {}));
/**
 * 时间框架枚举
 */
var TimeFrame;
(function (TimeFrame) {
    TimeFrame["SHORT_TERM"] = "short_term";
    TimeFrame["MEDIUM_TERM"] = "medium_term";
    TimeFrame["LONG_TERM"] = "long_term";
})(TimeFrame || (exports.TimeFrame = TimeFrame = {}));
/**
 * 信号强度枚举
 */
var SignalStrength;
(function (SignalStrength) {
    SignalStrength[SignalStrength["VERY_WEAK"] = 1] = "VERY_WEAK";
    SignalStrength[SignalStrength["WEAK"] = 2] = "WEAK";
    SignalStrength[SignalStrength["MODERATE"] = 3] = "MODERATE";
    SignalStrength[SignalStrength["STRONG"] = 4] = "STRONG";
    SignalStrength[SignalStrength["VERY_STRONG"] = 5] = "VERY_STRONG";
})(SignalStrength || (exports.SignalStrength = SignalStrength = {}));
/**
 * 信号可靠性枚举
 */
var SignalReliability;
(function (SignalReliability) {
    SignalReliability[SignalReliability["VERY_LOW"] = 1] = "VERY_LOW";
    SignalReliability[SignalReliability["LOW"] = 2] = "LOW";
    SignalReliability[SignalReliability["MEDIUM"] = 3] = "MEDIUM";
    SignalReliability[SignalReliability["HIGH"] = 4] = "HIGH";
    SignalReliability[SignalReliability["VERY_HIGH"] = 5] = "VERY_HIGH";
})(SignalReliability || (exports.SignalReliability = SignalReliability = {}));
//# sourceMappingURL=signal.js.map