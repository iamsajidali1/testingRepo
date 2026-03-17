import { Component, OnInit } from '@angular/core';
import { StateService } from '../../../services/state.service';
import { NameValueModel } from '../../../models/utils.model';
import { Router } from '@angular/router';
import { ChartService } from '../../../services/chart.service';
import { GeoAddressModel } from '../../../models/address.model';

import { jsPDF } from 'jspdf';

import jsonPath from 'jsonpath';
import domToImage from 'dom-to-image';
import { font } from 'src/assets/fonts/jspdf/ATTAleckSans_Rg-normal';

@Component({
  selector: 'app-network-insights',
  templateUrl: './network-insights.component.html',
  styleUrls: ['./network-insights.component.scss']
})
export class NetworkInsightsComponent implements OnInit {
  title: string;
  component: string = 'network-insights';
  insights: any;
  devices: NameValueModel[] = [];
  selectedDevice: string;
  timeSpans: NameValueModel[] = [];
  selectedTimespanInMinutes: number = 60;
  charts: any[] = [];
  data: any;
  options: any;
  pushpins: GeoAddressModel[] = [];
  colGroups: any[];
  summaryTableData: any[];
  isSummarySelected: boolean = true;
  isExporting: boolean = false;

  protected readonly Array = Array;

  constructor(
    private router: Router,
    private chartService: ChartService,
    private stateService: StateService
  ) {
    // Get the Title of the Component
    const currentStep = this.stateService.workflowSteps.find(
      (step) => step.routerLink === this.component
    );
    this.insights = stateService.getWorkflowData(this.component);
    this.title = currentStep
      ? currentStep.title || currentStep.label
      : 'Network Insights';
  }

  ngOnInit(): void {
    this.timeSpans = this.insights.metadata.timeSpans;
    this.devices = this.insights.metadata.devices;
    if (this.insights.metadata?.summary) {
      this.devices.unshift({ name: 'Summary', value: 'Summary' });
    }
    this.selectedDevice = this.devices[0].name;
    this.loadDashboard();
  }

  /**
   * Getter for the selected time span.
   *
   * This getter checks if an end time is defined in the insights metadata.
   * If it is, it calculates the start time by subtracting the selected timespan in minutes from the end time.
   * It then returns an object with the start and end times.
   * If no end time is defined in the insights metadata, it returns null.
   *
   * @returns {Object|null} An object with the start and end times, or null if no end time is defined.
   * The start and end times are in milliseconds since the Unix epoch (1 January 1970 00:00:00 UTC).
   *
   * @example
   * // Assuming `this.insights` is:
   * // {
   * //   metadata: {
   * //     endTime: '2022-01-01T00:00:00Z'
   * //   }
   * // }
   * // and `this.selectedTimespanInMinutes` is 60,
   * // this getter will return:
   * // {
   * //   startTime: 1640995200000, // '2021-12-31T23:00:00Z'
   * //   endTime: 1640998800000 // '2022-01-01T00:00:00Z'
   * // }
   */
  get selectedTimeSpan(): { startTime: number; endTime: number } | null {
    if (!this.insights?.metadata?.endTime) return null;
    const endTime = new Date(this.insights?.metadata?.endTime).getTime();
    return {
      startTime: endTime - this.selectedTimespanInMinutes * 60 * 1000,
      endTime
    };
  }

  onBack() {
    const { previous } = this.stateService.getWorkflowDriver(this.component);
    this.router.navigate(['config', previous]);
  }

  /**
   * Loads the summary data for the network insights dashboard.
   *
   * This method is called when the selected device is 'Summary'.
   * It first checks if a map is defined in the summary metadata.
   * If it is, it retrieves the location data from the insights data using the map.
   * It then maps each location to a pushpin object with the display name, latitude, longitude, and address.
   * If a table is defined in the summary metadata, it sets the column groups to the table and maps each device in the insights data to a summary table row.
   * Each row includes the hostname and the minimum, maximum, and average values for each column group.
   * It also includes the aggregate throughput for both received and sent data.
   *
   * @example
   * // Assuming `this.insights` is:
   * // {
   * //   data: [
   * //     {
   * //       hostname: 'device1',
   * //       cpuPct: [10, 20, 30, 40, 50],
   * //       agrThroughput: [
   * //         { metric: 'agrThroughputTx', values: [100, 200, 300, 400, 500] },
   * //         { metric: 'agrThroughputRx', values: [50, 100, 150, 200, 250] }
   * //       ]
   * //     }
   * //   ],
   * //   metadata: {
   * //     summary: {
   * //       map: '$.data[*].location',
   * //       table: [
   * //         { id: 'cpuPct', dataSrc: '$.cpuPct' },
   * //         { id: 'agrThroughput', dataSrc: '$.agrThroughput' }
   * //       ]
   * //     }
   * //   }
   * // }
   * // this method will set `this.pushpins` to an array with a single pushpin object for 'device1',
   * // and `this.summaryTableData` to an array with a single row object for 'device1'.
   */
  loadSummary() {
    if (this.insights?.metadata?.summary?.map) {
      const locData = jsonPath.query(
        { data: this.insights.data },
        this.insights.metadata.summary.map
      );
      this.pushpins = locData.map((loc, index) => ({
        title: this.insights.data[index].hostname,
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: ``, // TODO: Use this field to give more information about the edge
        country: '' // TODO: Use this field to give more information about the edge
      }));
      if (this.insights.metadata.summary.table) {
        this.colGroups = this.insights.metadata.summary.table;
        this.summaryTableData = this.insights.data.map((device: any) => {
          const attributes: any = {};
          this.colGroups.forEach((colGroup) => {
            const [attribute] = jsonPath.query(device, colGroup.dataSrc);
            attributes[colGroup.id] = this.chartService.getMinMaxAvg(
              attribute,
              this.selectedTimespanInMinutes
            );
          });
          // TODO: Move these special Cases to Backend Later
          // Get Aggregate Throughput
          const [throughputTx] = jsonPath.query(
            device,
            '$.agrThroughput[?(@.metric==\'agrThroughputTx\')]'
          );
          const [throughputRx] = jsonPath.query(
            device,
            '$.agrThroughput[?(@.metric==\'agrThroughputRx\')]'
          );
          attributes['agrThroughput'] = {
            throughputRx: this.chartService.getMinMaxAvg(
              throughputTx,
              this.selectedTimespanInMinutes
            ),
            throughputTx: this.chartService.getMinMaxAvg(
              throughputRx,
              this.selectedTimespanInMinutes
            )
          };
          return { hostname: device.hostname, ...attributes };
        });
      }
    }
  }

  /**
   * Retrieves chart data based on the provided metadata and generates a chart configuration.
   *
   * @param {any} data - The data from which the chart data is to be retrieved.
   * @param {any} chartMetadata - The metadata for the chart. This includes:
   * - id: The identifier for the chart.
   * - dataSrc: The JSONPath expression to retrieve the chart data from the provided data.
   *
   * @returns {any} The chart configuration object. This includes the chart title, subtitle, type, data, and options. If no configuration is found for the given metric, null is returned.
   *
   * @example
   * // returns a chart configuration object for the 'cpuPct' metric
   * getChart({ cpuPct: [10, 20, 30, 40, 50] }, { id: 'cpuPct', dataSrc: '$.cpuPct' });
   */
  getChart(data: any, chartMetadata: any): any {
    const chartData = jsonPath.query(data, chartMetadata.dataSrc);
    return this.chartService.getMetricsChart(
      chartMetadata.id,
      chartData,
      this.selectedTimespanInMinutes
    );
  }

  /**
   * Loads the dashboard with the charts based on the selected device and insights metadata.
   *
   * It first finds the data for the selected device from the insights data.
   * Then, it checks if there are any charts defined in the insights metadata.
   * If there are, it maps each chart to a chart configuration object.
   * If a chart has subcharts, it creates a 'multi' type chart with the main chart and all subcharts.
   * Otherwise, it just creates a single chart.
   * The resulting array of chart configurations is then assigned to the `charts` property.
   *
   * @example
   * // Assuming `this.insights` is:
   * // {
   * //   data: [{ hostname: 'device1', cpuPct: [10, 20, 30, 40, 50] }],
   * //   metadata: {
   * //     charts: [{ id: 'cpuPct', dataSrc: '$.cpuPct' }]
   * //   }
   * // }
   * // and `this.selectedDevice` is 'device1',
   * // this method will set `this.charts` to an array with a single chart configuration object for the 'cpuPct' metric.
   */
  loadDashboard() {
    this.isSummarySelected = this.selectedDevice === 'Summary';
    if (this.isSummarySelected) {
      this.loadSummary();
      return;
    }
    const deviceData = this.insights.data.find(
      (device: any) => device.hostname === this.selectedDevice
    );
    if (
      this.insights?.metadata?.charts &&
      this.insights.metadata.charts.length
    ) {
      this.charts = this.insights.metadata.charts.map((chart: any) => {
        if (chart && chart?.subCharts && chart.subCharts.length) {
          return {
            type: 'multi',
            subCharts: [
              this.getChart(deviceData, chart),
              ...chart.subCharts.map((subChart: any) =>
                this.getChart(deviceData, subChart)
              )
            ]
          };
        }
        return this.getChart(deviceData, chart);
      });
    }
  }

  onHostSelectionChange(data: any) {
    this.selectedDevice = data.hostname;
    this.loadDashboard();
  }

  downloadPdf() {
    this.isExporting = true;
    setTimeout(() => {
      // Copy the networkInsight div to a new div
      const node = document.getElementById('networkInsight');
      const width = node.clientWidth;
      const height = node.clientHeight;
      // Check if the orientation is landscape or portrait
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
}
