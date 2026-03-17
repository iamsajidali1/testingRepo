export interface ProcessModel {
  order: number;
  title: string;
  action: string;
  status: 'running' | 'passed' | 'failed' | 'n/a';
  message: string;
  shouldExecute: boolean;
  allowSkipOnFail: boolean;
}
