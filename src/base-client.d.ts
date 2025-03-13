import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Logger } from '../utils/logger';
/**
 * 基础服务客户端类
 * 提供通用的HTTP请求方法和错误处理
 */
export declare class BaseClient {
    protected client: AxiosInstance;
    protected serviceName: string;
    protected logger: Logger;
    protected baseUrl: string;
    /**
     * 创建基础客户端实例
     * @param serviceName 服务名称
     * @param baseUrl 服务基础URL
     * @param timeout 请求超时时间(毫秒)
     */
    constructor(serviceName: string, baseUrl: string, timeout?: number);
    /**
     * 发送GET请求
     * @param url 请求路径
     * @param config 请求配置
     * @returns 响应数据
     */
    protected get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    /**
     * 发送POST请求
     * @param url 请求路径
     * @param data 请求数据
     * @param config 请求配置
     * @returns 响应数据
     */
    protected post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    /**
     * 发送PUT请求
     * @param url 请求路径
     * @param data 请求数据
     * @param config 请求配置
     * @returns 响应数据
     */
    protected put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    /**
     * 发送DELETE请求
     * @param url 请求路径
     * @param config 请求配置
     * @returns 响应数据
     */
    protected delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    /**
     * 处理请求错误
     * @param error 错误对象
     * @param method HTTP方法
     * @param url 请求URL
     */
    private handleError;
    /**
     * 检查服务健康状态
     * @returns 服务是否健康
     */
    healthCheck(): Promise<boolean>;
}
