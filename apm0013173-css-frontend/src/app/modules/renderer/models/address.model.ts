export interface AddressModel {
  street: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export interface GeoAddressModel {
  title: string;
  address: string;
  country: string;
  latitude: number;
  longitude: number;
}
