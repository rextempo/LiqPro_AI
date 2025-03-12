// This file contains custom type declarations for modules that don't have their own type definitions

// For web-vitals
declare module 'web-vitals' {
  type MetricName = 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB';

  type Metric = {
    id: string;
    name: MetricName;
    value: number;
    delta?: number;
  };

  export type ReportHandler = (metric: Metric) => void;

  export function getCLS(onReport: ReportHandler): void;
  export function getFCP(onReport: ReportHandler): void;
  export function getFID(onReport: ReportHandler): void;
  export function getLCP(onReport: ReportHandler): void;
  export function getTTFB(onReport: ReportHandler): void;
}

// For CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// For image imports
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif'; 