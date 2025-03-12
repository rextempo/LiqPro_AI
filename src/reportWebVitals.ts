// Define the ReportHandler type since we don't have @types/web-vitals
type ReportHandler = (metric: {
  id: string;
  name: string;
  value: number;
  delta?: number;
}) => void;

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    }).catch(error => {
      console.error('Error loading web-vitals:', error);
    });
  }
};

export default reportWebVitals; 