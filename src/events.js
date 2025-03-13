"use strict";
// Define all event types and their payloads for type safety
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
var EventType;
(function (EventType) {
    // Agent events
    EventType["AGENT_CREATED"] = "agent.created";
    EventType["AGENT_UPDATED"] = "agent.updated";
    EventType["AGENT_DELETED"] = "agent.deleted";
    EventType["AGENT_STARTED"] = "agent.started";
    EventType["AGENT_STOPPED"] = "agent.stopped";
    EventType["AGENT_ERROR"] = "agent.error";
    // LP position events
    EventType["LP_POSITION_CREATED"] = "lp.position.created";
    EventType["LP_POSITION_UPDATED"] = "lp.position.updated";
    EventType["LP_POSITION_CLOSED"] = "lp.position.closed";
    // Signal events
    EventType["SIGNAL_GENERATED"] = "signal.generated";
    EventType["SIGNAL_UPDATED"] = "signal.updated";
    EventType["SIGNAL_EXPIRED"] = "signal.expired";
    // Transaction events
    EventType["TRANSACTION_CREATED"] = "transaction.created";
    EventType["TRANSACTION_CONFIRMED"] = "transaction.confirmed";
    EventType["TRANSACTION_FAILED"] = "transaction.failed";
    // Market events
    EventType["MARKET_PRICE_UPDATED"] = "market.price.updated";
    EventType["MARKET_LIQUIDITY_UPDATED"] = "market.liquidity.updated";
    // System events
    EventType["SYSTEM_ERROR"] = "system.error";
    EventType["SYSTEM_WARNING"] = "system.warning";
    EventType["SYSTEM_INFO"] = "system.info";
})(EventType || (exports.EventType = EventType = {}));
//# sourceMappingURL=events.js.map