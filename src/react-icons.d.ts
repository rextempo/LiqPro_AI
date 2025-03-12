declare module 'react-icons/fi' {
  import { IconType } from 'react-icons';
  
  export const FiHome: IconType;
  export const FiUser: IconType;
  export const FiBell: IconType;
  export const FiSettings: IconType;
  export const FiMenu: IconType;
  export const FiX: IconType;
  export const FiChevronDown: IconType;
  export const FiChevronUp: IconType;
  export const FiEye: IconType;
  export const FiEyeOff: IconType;
  export const FiPlay: IconType;
  export const FiPause: IconType;
  export const FiAlertTriangle: IconType;
  export const FiInfo: IconType;
  export const FiRefreshCw: IconType;
  export const FiSave: IconType;
  export const FiTrash2: IconType;
  export const FiFilter: IconType;
  export const FiDownload: IconType;
  export const FiExternalLink: IconType;
  export const FiPlus: IconType;
  export const FiPlusCircle: IconType;
  export const FiDollarSign: IconType;
  export const FiTrendingUp: IconType;
  export const FiTrendingDown: IconType;
  export const FiActivity: IconType;
  export const FiArrowRight: IconType;
  export const FiWifi: IconType;
  export const FiWifiOff: IconType;
}

declare module 'react-icons' {
  import { ComponentType, SVGAttributes } from 'react';
  
  export interface IconBaseProps extends SVGAttributes<SVGElement> {
    size?: string | number;
    color?: string;
    title?: string;
  }
  
  export type IconType = ComponentType<IconBaseProps>;
} 