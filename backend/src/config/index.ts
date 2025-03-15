import { Config } from '../types/config';
import development from '@config/development';
import production from '@config/production';

const env = process.env.NODE_ENV || 'development';
const config: Config = env === 'production' ? production : development;

export default config; 