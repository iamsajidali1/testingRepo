import { ContentType } from './conf-template-models/content-type'
import { TemplateType } from './conf-template-models/template-type'
import { VendorType } from './conf-template-models/vendor-type'
import { Service } from './serviceModel'
import { Customer } from './customerModel'


export interface IConfigTemplateRequest {
    contractid?: string; 
    service?: string;
    name: string;
    body: string;
    deviceModel: string;
    version? : number;
    templateType: string;
    vendorType: string; 
}

export interface IConfigTemplateResponse{
    contractid?: Customer; 
    services?: Service;
    name: string;
    body: string;
    deviceModel: ContentType;
    version : number;
    templateType: TemplateType;
    vendorType: VendorType; 
    dataCreated: string;
    path: string;
    id: number; 
}