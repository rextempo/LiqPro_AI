import { Config } from '@liqpro/shared/src/types/config';

declare module '*/config/development' {
  const config: Config;
  export default config;
}

declare module '*/config/production' {
  const config: Config;
  export default config;
}

declare module '*/config/default' {
  const config: Config;
  export default config;
} 