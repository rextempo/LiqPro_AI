/**
 * 模块类型声明
 */

// 声明 cors 模块
declare module 'cors';

// 声明 helmet 模块
declare module 'helmet';

// 声明 compression 模块
declare module 'compression';

// 声明 socket.io-client 模块
declare module 'socket.io-client';

// 声明 redis 模块
declare module 'redis' {
  export interface RedisClientOptions {
    url?: string;
    socket?: {
      reconnectStrategy?: (retries: number) => Error | number | undefined;
    };
  }
  
  export interface RedisClientType {
    connect(): Promise<void>;
    on(event: string, listener: (arg: any) => void): void;
    set(key: string, value: string, options?: { EX?: number }): Promise<string>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    flushAll(): Promise<string>;
    quit(): Promise<string>;
  }
  
  export function createClient(options?: RedisClientOptions): RedisClientType;
}

/**
 * Module declarations for external libraries
 */

// Express rate limit
declare module 'express-rate-limit' {
  import { RequestHandler } from 'express';
  
  export interface Options {
    windowMs?: number;
    max?: number;
    message?: string | object;
    statusCode?: number;
    headers?: boolean;
    keyGenerator?: (req: any) => string;
    skip?: (req: any) => boolean;
    handler?: (req: any, res: any, next: any) => void;
  }
  
  export function rateLimit(options?: Options): RequestHandler;
  export default function rateLimit(options?: Options): RequestHandler;
}

// LRU Cache
declare module 'lru-cache' {
  export interface Options<K, V> {
    max?: number;
    ttl?: number;
    maxSize?: number;
    sizeCalculation?: (value: V, key: K) => number;
    dispose?: (value: V, key: K) => void;
    updateAgeOnGet?: boolean;
    updateAgeOnHas?: boolean;
    allowStale?: boolean;
    noDisposeOnSet?: boolean;
    noUpdateTTL?: boolean;
  }
  
  export default class LRUCache<K, V> {
    constructor(options?: Options<K, V> | number);
    
    set(key: K, value: V, options?: { ttl?: number }): this;
    get(key: K): V | undefined;
    peek(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    
    load(cacheEntries: Array<[K, V]>): void;
    dump(): Array<[K, V]>;
    
    readonly size: number;
    readonly max: number;
    readonly ttl: number;
    readonly maxSize: number | undefined;
    readonly calculatedSize: number;
  }
}

// Socket.io
declare module 'socket.io' {
  import { Server as HttpServer } from 'http';
  import { EventEmitter } from 'events';
  
  export interface ServerOptions {
    path?: string;
    serveClient?: boolean;
    adapter?: any;
    cors?: {
      origin?: string | string[] | boolean;
      methods?: string[];
      allowedHeaders?: string[];
      exposedHeaders?: string[];
      credentials?: boolean;
      maxAge?: number;
    };
    allowEIO3?: boolean;
    pingTimeout?: number;
    pingInterval?: number;
    upgradeTimeout?: number;
    maxHttpBufferSize?: number;
    transports?: string[];
    allowUpgrades?: boolean;
    perMessageDeflate?: boolean | object;
    httpCompression?: boolean | object;
    ws?: object;
    connectTimeout?: number;
  }
  
  export interface Socket {
    id: string;
    handshake: {
      headers: { [key: string]: string };
      time: string;
      address: string;
      xdomain: boolean;
      secure: boolean;
      issued: number;
      url: string;
      query: { [key: string]: string };
      auth: { [key: string]: any };
    };
    rooms: Set<string>;
    data: { [key: string]: any };
    connected: boolean;
    
    emit(event: string, ...args: any[]): boolean;
    join(room: string | string[]): Promise<void>;
    leave(room: string): Promise<void>;
    to(room: string | string[]): Socket;
    in(room: string | string[]): Socket;
    except(room: string | string[]): Socket;
    disconnect(close?: boolean): Socket;
    
    on(event: string, listener: (...args: any[]) => void): Socket;
    once(event: string, listener: (...args: any[]) => void): Socket;
    off(event: string, listener?: (...args: any[]) => void): Socket;
    
    onAny(listener: (event: string, ...args: any[]) => void): Socket;
    prependAny(listener: (event: string, ...args: any[]) => void): Socket;
    offAny(listener?: (event: string, ...args: any[]) => void): Socket;
    
    use(fn: (event: any[], next: (err?: Error) => void) => void): Socket;
  }
  
  export class Server extends EventEmitter {
    constructor(srv?: HttpServer, opts?: ServerOptions);
    
    engine: any;
    sockets: Namespace;
    
    serveClient(serve?: boolean): this;
    path(value?: string): string | this;
    adapter(adapterConstructor?: any): any | this;
    origins(value?: string | string[]): string | string[] | this;
    
    attach(srv: HttpServer, opts?: ServerOptions): this;
    listen(srv: HttpServer, opts?: ServerOptions): this;
    listen(port: number, opts?: ServerOptions): this;
    
    on(event: string, listener: (...args: any[]) => void): this;
    
    close(callback?: (err?: Error) => void): void;
  }
  
  export class Namespace extends EventEmitter {
    name: string;
    connected: { [id: string]: Socket };
    adapter: any;
    
    to(room: string | string[]): Namespace;
    in(room: string | string[]): Namespace;
    except(room: string | string[]): Namespace;
    
    emit(event: string, ...args: any[]): boolean;
    
    allSockets(): Promise<Set<string>>;
    
    use(fn: (socket: Socket, next: (err?: Error) => void) => void): this;
  }
  
  export function listen(srv: HttpServer, opts?: ServerOptions): Server;
  export function listen(port: number, opts?: ServerOptions): Server;
}

/**
 * Type declarations for external modules
 */

declare module 'socket.io-client' {
  export interface SocketOptions {
    /**
     * The path to connect to
     */
    path?: string;
    
    /**
     * Whether to reconnect automatically
     */
    reconnection?: boolean;
    
    /**
     * Number of reconnection attempts before giving up
     */
    reconnectionAttempts?: number;
    
    /**
     * How long to initially wait before attempting a new reconnection
     */
    reconnectionDelay?: number;
    
    /**
     * Maximum amount of time to wait between reconnections
     */
    reconnectionDelayMax?: number;
    
    /**
     * Connection timeout before a connect_error and connect_timeout events are emitted
     */
    timeout?: number;
    
    /**
     * Whether to automatically connect
     */
    autoConnect?: boolean;
    
    /**
     * List of transports to use
     */
    transports?: string[];
    
    /**
     * Authentication data
     */
    auth?: {
      [key: string]: any;
    };
  }
  
  export interface Socket {
    /**
     * Whether the socket is connected
     */
    connected: boolean;
    
    /**
     * Socket ID
     */
    id: string;
    
    /**
     * Connect the socket
     */
    connect(): Socket;
    
    /**
     * Disconnect the socket
     */
    disconnect(): Socket;
    
    /**
     * Emit an event
     */
    emit(event: string, ...args: any[]): boolean;
    
    /**
     * Listen for an event
     */
    on(event: string, callback: (...args: any[]) => void): Socket;
    
    /**
     * Listen for an event once
     */
    once(event: string, callback: (...args: any[]) => void): Socket;
    
    /**
     * Remove a listener
     */
    off(event: string, callback?: (...args: any[]) => void): Socket;
  }
  
  export function io(uri: string, opts?: SocketOptions): Socket;
} 