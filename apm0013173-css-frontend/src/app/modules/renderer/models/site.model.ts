export interface SiteModel {
  ID: number;
  DEVICE: string;
  TEMPLATE_ID: number;
  TEMPLATE: {
    ID: number;
    NAME: string;
    DESCRIPTION: string;
  };
  ORGANIZATION_ID: number;
  STATUS: string;
  SR: string;
  SNOW_STATUS: string;
  ADDRESS: {
    STREET: string;
    CITY: string;
    STATE: string;
    COUNTRY: string;
    COUNTRY_CODE: string;
    ZIP: string;
    LONGITUDE: number;
    LATITUDE: number;
  };
  CREATE_DATE: string | Date;
  UPDATE_DATE: string | Date;
}
