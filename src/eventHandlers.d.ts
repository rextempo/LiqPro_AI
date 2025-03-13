import { Event, AgentCreatedPayload } from './utils';
export declare function handleAgentCreated(event: Event<AgentCreatedPayload>): Promise<void>;
export declare function handleAgentStarted(event: Event<any>): Promise<void>;
export declare function handleAgentStopped(event: Event<any>): Promise<void>;
export declare function handleSignalGenerated(event: Event<any>): Promise<void>;
