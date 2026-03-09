export interface SummaryModel {
  sessionId: string;
  transactionId: string;
  customerName: string;
  customerId: number;
  customerBcId: string;
  serviceName: string;
  serviceId: number;
  actionName: string;
  actionDescription: string;
  hostname: string;
  vendorType: string;
  changeType: string;
  configTemplateName: string;
  requester: string;
}

export interface NuanceSummaryModel {
  sessionId: string;
  transactionId: string;
  bcCustomerId: string;
  customerName: string;
  serviceName: string;
  actionName: string;
  hostname: string;
  vendorType: string;
  changeType: string;
  configTemplateName: string;
  requester: string;
  logUrl: string;
}
