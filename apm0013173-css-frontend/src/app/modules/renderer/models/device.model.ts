export interface DeviceModel {
  ID: string | number;
  HOSTNAME: string;
  VENDOR: string;
  SERVICE: string;
  SERVICE_NAME: string;
  ADDRESS: string;
  CITY: string;
  STATE: string;
  ZIP: string;
  COUNTRY: string;
  GRUA?: string;
}
