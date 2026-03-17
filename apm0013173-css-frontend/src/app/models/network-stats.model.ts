export interface LinkStat {
  id?: string;
  name?: string;
  displayName?: string;
  edgeName?: string;
  bpsOfBestPathRx?: number;
  bpsOfBestPathTx?: number;
  bytesRx?: number;
  bytesTx?: number;
  bestLossPctRx?: number;
  bestLossPctTx?: number;
  bestLatencyMsRx?: number;
  bestLatencyMsTx?: number;
  bestJitterMsRx?: number;
  bestJitterMsTx?: number;
  scoreRx?: number;
  scoreTx?: number;
  linkIpAddress?: string;
  type?: string;
  interface?: string;
  hotStandby?: boolean;
  backupOnly?: boolean;
  isp?: string;
  // Add other properties as needed
  [key: string]: any;
}

export interface EdgeStat {
  id?: string;
  name?: string;
  modelNumber?: string;
  softwareVersion?: string;
  haState?: string;
  cpuPct?: number;
  flowCount?: number;
  handoffQueueDrops?: number;
  tunnelCount?: number;
  memoryPct?: number;
  cpuCoreTemp?: number;
  licenseName?: string;
  customInfo?: string;
  lon?: number;
  lat?: number;
  // Add other properties as needed
  [key: string]: any;
}
