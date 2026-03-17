// Type alias for stats cache
type StatsCache = {
  [timespan: string]: {
    linkStats: { [name: string]: any };
    edgeStats: { [edgeName: string]: any };
  };
};

import { Component, OnInit } from '@angular/core';
import { CoreService } from '../../../services/core.service';
import { StateService } from '../../../services/state.service';
import { SelectItem } from 'primeng/api';
import { DomSanitizer } from '@angular/platform-browser';
import { GeoAddressModel } from '../../../models/address.model';
import { LinkStat, EdgeStat } from 'src/app/models/network-stats.model';


@Component({
  selector: 'app-network-stats',
  templateUrl: './network-stats.component.html',
  styleUrls: ['./network-stats.component.scss']
})
export class NetworkStatsComponent implements OnInit {
    // Returns conditional class for cpu/mem columns
    getStatClass(col: string, value: any): string {
      // Map display column to property key
      const cpuCols = ['Max_CPU', 'cpuPct'];
      const memCols = ['Max_Mem', 'memoryPct'];
      const utilCols = ['Max_Utilization_tx', 'Max_Utilization_rx'];
      // Accept both display and property keys
      if (cpuCols.includes(col) || memCols.includes(col) || utilCols.includes(col) || utilCols.includes(value?.key)) {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (!isNaN(num)) {
          if (num >= 0 && num <= 60) return 'stat-green';
          if (num > 60 && num <= 80) return 'stat-orange';
          if (num > 80 && num <= 100) return 'stat-red';
          if (num > 100) return 'stat-red';
        }
      }
      return '';
    }
  // ...existing code...
  constructor(
    private coreService: CoreService,
    public stateService: StateService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.workflowData = this.stateService.getWorkflowData('network-stats');
    this.statsType = 'edge';
    this.loadTimeSpans();
    if (this.timespanOptions.length) {
      this.selectedTimeSpanKey = this.timespanOptions[0].value;
    }
    this.loadDashboard();
    this.updateLinkPieCharts();
    this.updateEdgePieCharts();
  }

  // Getter for displayedStats (memoized)
  get displayedStats() {
    if (
      this.statsType === this.cachedStatsType &&
      ((this.statsType === 'link' && this.linkStats === this.cachedLinkStats) ||
        (this.statsType === 'edge' && this.edgeStats === this.cachedEdgeStats))
    ) {
      return this.cachedDisplayedStats;
    }
    const stats = this.statsType === 'link' ? this.linkStats : this.edgeStats;
    const columnMap =
      this.statsType === 'link'
        ? this.linkStatsColumnMap
        : this.edgeStatsColumnMap;
    const result = stats.map((stat) => {
      const roundedStat: any = {};
      for (const label of this.displayedColumns) {
        const key = columnMap[label];
        let value = stat[key];
        if (typeof value === 'number') {
          if (label === 'Score_RX' || label === 'Score_TX' || key === 'scoreRx' || key === 'scoreTx') {
            value = value.toFixed(7);
          } else if (label === 'Max_CPU' || key === 'cpuPct') {
            value = (Math.round(value * 10) / 10) + ' %';
          } else if (label === 'Max_Mem' || key === 'memoryPct') {
            value = (Math.round(value * 10) / 10) + ' %';
          } else if (label === 'Max_Utilization_tx' || label === 'Max_Utilization_rx' || key === 'Max_Utilization_tx' || key === 'Max_Utilization_rx') {
            value = (Math.round(value * 10) / 10) + ' %';
          } else if (label === 'Max_t_CPU' || key === 'cpuCoreTemp') {
            value = (Math.round(value * 10) / 10) + ' C°';
          } else if (this.statsType === 'link') {
            if (label === 'MaxBW_RX' || label === 'MaxBW_TX') {
              value = Math.round(value / 1e6) + ' Mbps';
            } else if (label === 'MaxTP_RX' || label === 'MaxTP_TX') {
              value = Math.round((value * 8) / 300 / 1e6) + ' Mbps';
            } else if (label === 'MaxPL_RX' || label === 'MaxPL_TX' || key === 'bestLossPctRx' || key === 'bestLossPctTx') {
              value = (Math.round(value * 10) / 10) + '%';
            } else if (label === 'MaxLat_RX' || label === 'MaxLat_TX' || key === 'bestLatencyMsRx' || key === 'bestLatencyMsTx') {
              value = (Math.round(value * 10) / 10) + ' ms';
            } else if (label === 'MaxJit_RX' || label === 'MaxJit_TX' || key === 'bestJitterMsRx' || key === 'bestJitterMsTx') {
              value = (Math.round(value * 10) / 10) + ' ms';
            } else if (this.roundStats.includes(key)) {
              value = Math.round(value * 10) / 10;
            }
          } else if (label === 'MaxPL_RX' || label === 'MaxPL_TX' || key === 'bestLossPctRx' || key === 'bestLossPctTx') {
            value = (Math.round(value * 10) / 10) + '%';
          } else if (label === 'MaxLat_RX' || label === 'MaxLat_TX' || key === 'bestLatencyMsRx' || key === 'bestLatencyMsTx') {
            value = (Math.round(value * 10) / 10) + ' ms';
          } else if (label === 'MaxJit_RX' || label === 'MaxJit_TX' || key === 'bestJitterMsRx' || key === 'bestJitterMsTx') {
            value = (Math.round(value * 10) / 10) + ' ms';
          } else if (this.roundStats.includes(key)) {
            value = Math.round(value * 10) / 10;
          }
        }
        roundedStat[label] = value;
      }
      return roundedStat;
    });
    this.cachedDisplayedStats = result;
    this.cachedStatsType = this.statsType;
    this.cachedLinkStats = this.linkStats;
    this.cachedEdgeStats = this.edgeStats;
    return result;
  }

  // Getter for displayedColumns
  get displayedColumns() {
    return this.statsType === 'link'
      ? this.linkStatsColumns
      : this.edgeStatsColumns;
  }
  statsCache: StatsCache = {};
  sortColumn: string | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  // Sorted stats getter
  get sortedStats() {
    const stats = this.displayedStats;
    if (!this.sortColumn) return stats;
    // Helper to extract numeric value from string (e.g., '75 ms' -> 75)
    const extractNumber = (val: any): number | null => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        // Match first number (integer or float) in string
        const match = val.match(/-?\d+(\.\d+)?/);
        if (match) return parseFloat(match[0]);
      }
      return null;
    };
    return [...stats].sort((a, b) => {
      const valA = a[this.sortColumn!];
      const valB = b[this.sortColumn!];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const numA = extractNumber(valA);
      const numB = extractNumber(valB);
      if (numA !== null && numB !== null) {
        return this.sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      return this.sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }

  // Sort handler
  onSort(col: string) {
    if (this.sortColumn === col) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = col;
      this.sortDirection = 'asc';
    }
  }
  timespanOptions: SelectItem[] = [];
  selectedTimeSpanKey: string | null = null;
  timespanKeyToValue: { [key: string]: any } = {};
  isSummarySelected: boolean = true;
  chartModalVisible: boolean = false;
  chartModalData: any = null;
  chartModalTitle: string = '';
  statsType: 'link' | 'edge' = 'edge';
  filteredStats: any[] | null = null;
  linkStats: LinkStat[] = [];
  edgeStats: EdgeStat[] = [];
  pushPins: GeoAddressModel[] = [];
  workflowData: any = {};
  roundStats: string[] = [
    'cpuPct',
    'memoryPct',
    'bestLatencyMsTx',
    'bestLatencyMsRx',
    'bestJitterMsRx',
    'bestJitterMsTx',
    'bestLossPctRx',
    'bestLossPctTx',
    'scoreRx',
    'scoreTx',
    'bytesRx',
    'bytesTx',
    'bpsOfBestPathRx',
    'bpsOfBestPathTx'
  ];
  chartDataCache: Map<any, any[]> = new Map();
  cachedDisplayedStats: any[] = [];
  cachedStatsType: 'link' | 'edge' = 'edge';
  cachedLinkStats: any[] = [];
  cachedEdgeStats: any[] = [];
  edgeStatsColumns: string[] = [
    'Host',
    'Model',
    'Max_CPU',
    'Max_Mem',
    'Max_t_CPU',
    'Max_Flows',
    'Max_Drops',
    'Max_Tunnels',
    'SW',
    'HA',
    'Lic',
    'Info'
  ];
  linkStatsColumns: string[] = [
    'Link Name',
    'Hostname',
    'Max_Utilization_rx',
    'Max_Utilization_tx',
    'MaxLat_RX',
    'MaxLat_TX',
    'MaxPL_RX',
    'MaxPL_TX',
    'MaxJit_RX',
    'MaxJit_TX',
    'MaxBW_RX',
    'MaxBW_TX',
    'MaxTP_RX',
    'MaxTP_TX',
    'Intf',
    'IP',
    'Type',
    'Score_RX',
    'Score_TX',
    'HotSB_Mode',
    'Bkp_Mode',
    'Prov'
  ];
  edgeStatsColumnMap: { [key: string]: string } = {
    Host: 'name',
    Model: 'modelNumber',
    'Max_CPU': 'cpuPct',
    Max_Mem: 'memoryPct',
    'Max_t_CPU': 'cpuCoreTemp',
    Max_Flows: 'flowCount',
    Max_Drops: 'handoffQueueDrops',
    Max_Tunnels: 'tunnelCount',
    SW: 'softwareVersion',
    HA: 'haState',
    Lic: 'licenseName',
    Info: 'customInfo'
  };
  linkStatsColumnMap: { [key: string]: string } = {
    'Link Name': 'displayName',
    Hostname: 'edgeName',
    Max_Utilization_tx: 'Utilization_TX',
    Max_Utilization_rx: 'Utilization_RX',
    MaxLat_RX: 'bestLatencyMsRx',
    MaxLat_TX: 'bestLatencyMsTx',
    MaxPL_RX: 'bestLossPctRx',
    MaxPL_TX: 'bestLossPctTx',
    MaxJit_RX: 'bestJitterMsRx',
    MaxJit_TX: 'bestJitterMsTx',
    MaxBW_RX: 'bpsOfBestPathRx',
    MaxBW_TX: 'bpsOfBestPathTx',
    MaxTP_RX: 'bytesRx',
    MaxTP_TX: 'bytesTx',
    Intf: 'interface',
    IP: 'linkIpAddress',
    Type: 'type',
    Score_RX: 'scoreRx',
    Score_TX: 'scoreTx',
    HotSB_Mode: 'hotStandby',
    Bkp_Mode: 'backupOnly',
    Prov: 'isp'
  };
  // ...methods follow below...
  // ...existing code...

  cacheAllChartData() {
    const stats = this.statsType === 'link' ? this.linkStats : this.edgeStats;
    this.chartDataCache.clear();
    for (const stat of stats) {
      const statKeys = Object.keys(stat).filter(
        (k) => typeof stat[k] === 'number'
      );
      this.chartDataCache.set(
        stat,
        statKeys.map((k) => this.buildTimeSeriesChart(stat, k))
      );
    }
  }

  // Add missing onBack method for template
  onBack() {
    this.isSummarySelected = true;
  }

  buildTimeSeriesChart(stat: any, statKey: string): any {
    const statId = stat.name || stat.displayName || stat.id;
    const series: any[] = [];
    let timestamps: string[] = Object.keys(this.workflowData.result).sort(
      (a, b) => a.localeCompare(b)
    );
    if (this.selectedTimeSpanKey) {
      const value = this.timespanKeyToValue[this.selectedTimeSpanKey];
      if (Array.isArray(value)) {
        timestamps = timestamps.filter((ts) => value.includes(ts));
      }
    }
    for (const timestamp of timestamps) {
      const statsObj = this.workflowData[timestamp];
      const statsArr =
        this.statsType === 'link' ? statsObj?.linkStats : statsObj?.edgeStats;
      if (Array.isArray(statsArr)) {
        const found = statsArr.find(
          (s: any) => (s.name || s.displayName || s.id) === statId
        );
        if (found && typeof found[statKey] === 'number') {
          series.push({ name: timestamp, value: found[statKey] });
        }
      }
    }
    return { series };
  }

  onTimespanChange() {
    this.loadDashboard();

  }

  loadDashboard() {
    // New logic for timeSpanStats
    let statsArr: any[] = [];
    this.linkStats = [];
    this.edgeStats = [];
    if (
      this.workflowData &&
      this.workflowData.timeSpanStats &&
      this.selectedTimeSpanKey &&
      this.workflowData.timeSpanStats[this.selectedTimeSpanKey]
    ) {
      const timeSpanObj = this.workflowData.timeSpanStats[this.selectedTimeSpanKey];
      if (this.statsType === 'link' && timeSpanObj.linkStatsSummary) {
        // linkStatsSummary is an object: { [edgeName]: { data: {...} } }
        statsArr = Object.entries(timeSpanObj.linkStatsSummary).map(([edgeName, obj]: [string, any]) => {
          return { edgeName, ...(obj || {}) };
        });
        this.linkStats = statsArr;
      } else if (this.statsType === 'edge' && timeSpanObj.edgeStatsSummary) {
        // edgeStatsSummary is an object: { [name]: { data: {...} } }
        statsArr = Object.entries(timeSpanObj.edgeStatsSummary).map(([name, obj]: [string, any]) => {
          return { name, ...(obj || {}) };
        });
        this.edgeStats = statsArr;
      }
    }
    this.filteredStats = null;
    this.updatePushPins();
    this.updateLinkPieCharts();
    this.updateEdgePieCharts();
  }

  // Handle stats type change and reload relevant data
  onStatsTypeChange(type: 'link' | 'edge') {
    this.statsType = type;
    this.filteredStats = null;
    this.selectedTimeSpanKey = null;
    if (this.timespanOptions.length) {
      this.selectedTimeSpanKey = this.timespanOptions[0].value;
    }
    this.loadDashboard();
    this.updatePushPins();
    if (type === 'link') this.updateLinkPieCharts();
    if (type === 'edge') this.updateEdgePieCharts();
  }

  loadTimeSpans() {
    this.timespanOptions = [];
    this.timespanKeyToValue = {};
    const humanLabels: { [key: string]: string } = {
      lastHour: 'Last 1 hour',
      last8Hours: 'Last 8 hours',
      last12Hours: 'Last 12 hours',
      last24Hours: 'Last 24 hours',
      last3Days: 'Last 3 days',
      last7Days: 'Last 7 days'
    };
    if (
      this.workflowData?.timeSpan &&
      Object.keys(this.workflowData.timeSpan).length > 0
    ) {
      Object.keys(this.workflowData.timeSpan).forEach((key) => {
        this.timespanOptions.push({
          label: humanLabels[key] || key,
          value: key
        });
        // If value is array, use first element; else use value directly
        const tsValue = Array.isArray(this.workflowData.timeSpan[key])
          ? this.workflowData.timeSpan[key][0]
          : this.workflowData.timeSpan[key];
        this.timespanKeyToValue[key] = tsValue;
      });
      if (this.timespanOptions.length && !this.selectedTimeSpanKey) {
        this.selectedTimeSpanKey = this.timespanOptions[0].value;
      }
    }

  }

  onChartSegmentClick(key: string, event: any) {
    // event is the value to filter by, key is the chart label (not the property key)
    const value = event;
    // Find the correct property key for the label
    const columnMap =
      this.statsType === 'link'
        ? this.linkStatsColumnMap
        : this.edgeStatsColumnMap;
    const propertyKey = columnMap[key] || key;
    if (key === 'Link Mode Backup') {
      // For Link Mode Backup, filter by label ('Backup'/'Not Backup') or boolean value in displayedStats
      this.filteredStats = this.displayedStats.filter((stat) => {
        // Match label
        if (stat[key] === value) return true;
        // Fallback: match boolean value if present
        if (value === 'Backup' && stat[key] === true) return true;
        if (value === 'Not Backup' && stat[key] === false) return true;
        return false;
      });
    } else {
      this.filteredStats = this.displayedStats.filter(
        (stat) => stat[key] === value || stat[propertyKey] === value
      );
    }
  }

  onRowClick(stat: any, colLabel?: string, rowIndex?: number) {
    const columnMap = this.statsType === 'link' ? this.linkStatsColumnMap : this.edgeStatsColumnMap;
    const propertyKey = columnMap[colLabel!] || colLabel;
    const statId = stat.name || stat.displayName || stat.id;
    let timestamps: string[] = [];

    // Use workflowData.result for timestamps if available, else use workflowData keys
    if (this.workflowData?.result && typeof this.workflowData.result === 'object') {
      timestamps = Object.keys(this.workflowData.result).sort((a, b) => a.localeCompare(b));
    } else {
      timestamps = Object.keys(this.workflowData)
        .filter(ts => ts !== 'timeSpan' && ts !== 'timeSpanStats')
        .sort((a, b) => a.localeCompare(b));
    }

    // Filter timestamps by selected time span if applicable
    if (this.selectedTimeSpanKey) {
      const value = this.timespanKeyToValue[this.selectedTimeSpanKey];
      if (Array.isArray(value)) {
        timestamps = timestamps.filter((ts) => value.includes(ts));
      }
    }

    const series: any[] = [];
    for (const timestamp of timestamps) {
      // Use workflowData.result[timestamp] if available, else workflowData[timestamp]
      let statsObj = undefined;
      if (this.workflowData.result && this.workflowData.result[timestamp]) {
        statsObj = this.workflowData.result[timestamp];
      } else if (this.workflowData[timestamp]) {
        statsObj = this.workflowData[timestamp];
      }
      const statsArr = this.statsType === 'link' ? statsObj?.linkStats : statsObj?.edgeStats;
      if (Array.isArray(statsArr)) {
        const found = statsArr.find((s: any) => (s.name || s.displayName || s.id) === statId);
        if (found && typeof found[propertyKey] === 'number') {
          series.push({ name: timestamp, value: found[propertyKey] });
        }
      }
    }
    // Always pass chart type for modal
    this.chartModalData = [{ name: propertyKey, series, type: 'line' }];
    this.chartModalTitle = `${colLabel} for ${statId}`;
    this.chartModalVisible = true;
  }

  updatePushPins() {
    this.pushPins = this.edgeStats
      .filter(
        (e) => typeof e.lon === 'number' && typeof e.lat === 'number' && e.name
      )
      .map((e) => ({
        longitude: e.lon,
        latitude: e.lat,
        title: e.name,
        address: '',
        country: ''
      }));
  }
  title = 'Network Statistics';
  devices: SelectItem[] = [];
  selectedDevice: any;
  timeSpans: SelectItem[] = [];
  isExporting = false;
  summaryTableData: any[] = [];
  colGroups: any[] = [];
  orchestrators: any[] = [];
  orchestrator: string = 'https://vco206-fra1.velocloud.net/';
  protected readonly Array = Array;
  isEdges: boolean = true;

  linkPieCharts: { type: any; hotStandby: any; backupOnly: any } = {
    type: null,
    hotStandby: null,
    backupOnly: null
  };
  edgePieCharts: { license: any; model: any; ha: any } = {
    license: null,
    model: null,
    ha: null
  };

  // PIE CHART LOGIC
  updateLinkPieCharts() {
    if (!this.linkStats || !this.linkStats.length) {
      this.linkPieCharts = { type: null, hotStandby: null, backupOnly: null };
      return;
    }
    // Pie for 'Type'
    const typeCounts: { [key: string]: number } = {};
    const interfaceCounts: { [key: string]: number } = {};
    const backupOnlyCounts: { [key: string]: number } = {};
    for (const stat of this.linkStats) {
      // Type
      const type = stat.type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      // Interface
      const iface = stat.interface || 'Unknown';
      interfaceCounts[iface] = (interfaceCounts[iface] || 0) + 1;
      // Backup Only
      const backup = stat.backupOnly ? 'Backup' : 'Not Backup';
      backupOnlyCounts[backup] = (backupOnlyCounts[backup] || 0) + 1;
    }
    const pastelColors = [
      '#64b5f6', // soft blue
      '#81c784', // soft green
      '#ffd54f', // soft yellow
      '#ba68c8', // soft purple
      '#4dd0e1', // soft cyan
      '#ffb74d', // soft orange
      '#a1887f', // soft brown
      '#90caf9', // lighter blue
      '#e57373', // soft red
      '#f06292', // soft pink
      '#9575cd', // soft lavender
      '#aed581' // soft lime
    ];
    this.linkPieCharts.type = {
      labels: Object.keys(typeCounts),
      datasets: [
        {
          data: Object.values(typeCounts),
          backgroundColor: pastelColors
        }
      ]
    };
    this.linkPieCharts.hotStandby = {
      labels: Object.keys(interfaceCounts),
      datasets: [
        {
          data: Object.values(interfaceCounts),
          backgroundColor: pastelColors
        }
      ]
    };
    this.linkPieCharts.backupOnly = {
      labels: Object.keys(backupOnlyCounts),
      datasets: [
        {
          data: Object.values(backupOnlyCounts),
          backgroundColor: pastelColors
        }
      ]
    };
  }

  updateEdgePieCharts() {
    if (!this.edgeStats || !this.edgeStats.length) {
      this.edgePieCharts = { license: null, model: null, ha: null };
      return;
    }
    const licenseCounts: { [key: string]: number } = {};
    const modelCounts: { [key: string]: number } = {};
    const haCounts: { [key: string]: number } = {};
    for (const stat of this.edgeStats) {
      const license = stat.licenseName || 'Unknown';
      licenseCounts[license] = (licenseCounts[license] || 0) + 1;
      const model = stat.modelNumber || 'Unknown';
      modelCounts[model] = (modelCounts[model] || 0) + 1;
      const ha = stat.haState || 'Unknown';
      haCounts[ha] = (haCounts[ha] || 0) + 1;
    }
    const pastelColors = [
      '#64b5f6', // soft blue
      '#81c784', // soft green
      '#ffd54f', // soft yellow
      '#ba68c8', // soft purple
      '#4dd0e1', // soft cyan
      '#ffb74d', // soft orange
      '#a1887f', // soft brown
      '#90caf9', // lighter blue
      '#e57373', // soft red
      '#f06292', // soft pink
      '#9575cd', // soft lavender
      '#aed581' // soft lime
    ];
    this.edgePieCharts.license = {
      labels: Object.keys(licenseCounts),
      datasets: [
        {
          data: Object.values(licenseCounts),
          backgroundColor: pastelColors
        }
      ]
    };
    this.edgePieCharts.model = {
      labels: Object.keys(modelCounts),
      datasets: [
        {
          data: Object.values(modelCounts),
          backgroundColor: pastelColors
        }
      ]
    };
    this.edgePieCharts.ha = {
      labels: Object.keys(haCounts),
      datasets: [
        {
          data: Object.values(haCounts),
          backgroundColor: pastelColors
        }
      ]
    };
  }

  loadLinksForOrchestrator(workflowData: any): any[] {
    if (!workflowData) return [];
    const dateKeys = Object.keys(workflowData);
    if (dateKeys.length === 0) return [];
    const firstDateKey = dateKeys[0];
    const statsObj = workflowData[firstDateKey];
    return statsObj && Array.isArray(statsObj.linkStats)
      ? statsObj.linkStats
      : [];
  }

  /*
  downloadPdf() {
    this.isExporting = true;
    setTimeout(() => {
      const node = document.getElementById('networkInsight');
      const width = node.clientWidth;
      const height = node.clientHeight;
      const orientation = width > height ? 'l' : 'p';
      domToImage
        .toPng(node)
        .then((png) => {
          const pdf = new jsPDF(
            orientation,
            'pt',
            [width + 100, height + 300],
            true
          );
          pdf.addImage(
            '../../../../assets/images/logos/att_biz_hz_alt_rgb_pos.png',
            'PNG',
            50,
            50,
            185,
            120
          );
          pdf.addFileToVFS('ATTAleckSans_Rg.ttf', font);
          pdf.addFont('ATTAleckSans_Rg.ttf', 'ATTAleckSans', 'normal');
          pdf.setFont('ATTAleckSans');
          pdf.setFontSize(18);
          pdf.text(
            this.stateService.inputParams?.customer.name || 'N/A',
            width + 30,
            105,
            { align: 'right' }
          );
          pdf.setFontSize(10);
          pdf.text(
            'Network Utilization Insights generated by CSS',
            width + 30,
            120,
            { align: 'right' }
          );
          pdf.addImage(png, 'PNG', 50, 175, width, height, 'FAST');
          pdf.setFontSize(12);
          pdf.text(
            `© ${new Date().getFullYear()} AT&T Intellectual Property. All rights reserved.`,
            width / 2,
            height + 260,
            { align: 'center' }
          );
          pdf.setFontSize(8);
          pdf.text(
            'AT&T, the AT&T logo and all other AT&T marks contained herein are trademarks of AT&T intellectual property and/or AT&T affiliated companies. All other marks are the property of their respective owners.',
            width / 2,
            height + 280,
            { align: 'center' }
          );
          pdf.save(
            `${
              this.stateService.inputParams?.customer.name +
              'NetUtilizationReport'
            }.pdf`
          );
        })
        .catch((error) => {
          console.error('Unable to export!', error);
        })
        .finally(() => {
          this.isExporting = false;
        });
    }, 0);
  }
  */
}
