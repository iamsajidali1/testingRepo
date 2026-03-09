import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { Chart } from 'chart.js';

@Injectable()
export class ChartService {
  metricToChartConfig: any;

  constructor(private utilService: UtilService) {
    this.metricToChartConfig = {
      cpuPct: {
        title: 'CPU Utilization',
        subtitle: 'Max: ${max}%, Min: ${min}%, Average: ${avg}%',
        type: 'line',
        fill: true,
        stepped: true,
        pointStyle: false,
        borderColor: '#e77e20',
        backgroundColor: 'rgba(228,168,114,0.8)',
        legend: false,
        tooltipSuffix: '%'
      },
      memoryPct: {
        title: 'Memory Utilization',
        subtitle: 'Max: ${max}%, Min: ${min}%, Average: ${avg}%',
        type: 'line',
        fill: true,
        stepped: true,
        pointStyle: false,
        borderColor: '#26a69c',
        backgroundColor: 'rgba(127,202,197,0.8)',
        legend: false,
        tooltipSuffix: '%'
      },
      tunnelCount: {
        title: 'Tunnel Count',
        subtitle: 'Max: ${max}, Min: ${min}, Average: ${avg}',
        type: 'line',
        fill: true,
        stepped: true,
        pointStyle: false,
        borderColor: '#f0ad4e',
        backgroundColor: 'rgba(240,173,78,0.8)',
        legend: false,
        tooltipSuffix: '',
        tooltipTransformFn: this.utilService.formatNumber,
        yScale: { ticks: { callback: this.utilService.formatNumber } }
      },
      byteRx: {
        title: 'Links Metrics - Bytes Received/Sent',
        subtitle: 'Max: ${max}, Min: ${min}, Average: ${avg}',
        type: 'line',
        legend: true,
        legendClickHandler: this.legendClickHandlerForSubChart,
        tooltipTransformFn: this.utilService.convertBytes,
        yScale: {
          title: {
            display: true,
            text: 'Received',
            padding: '6'
          },
          ticks: {
            // Convert the Bytes to KB, MB or GB
            callback: (value: number) => this.utilService.convertBytes(value)
          }
        }
      },
      byteTx: {
        subtitle: 'Max: ${max}, Min: ${min}, Average: ${avg}',
        type: 'line',
        legend: false,
        tooltipTransformFn: this.utilService.convertBytes,
        yScale: {
          title: {
            display: true,
            text: 'Sent',
            padding: '6'
          },
          ticks: {
            // Convert the Bytes to KB, MB or GB
            callback: (value: number) => this.utilService.convertBytes(value)
          }
        }
      },
      throughputRx: {
        title: 'Links Metrics - Throughput',
        subtitle: 'Max: ${max}, Min: ${min}, Average: ${avg}',
        legend: true,
        legendClickHandler: this.legendClickHandlerForSubChart,
        type: 'line',
        tooltipTransformFn: this.utilService.convertBytes,
        tooltipTransformFnParams: ['bps'],
        yScale: {
          title: {
            display: true,
            text: 'Downstream',
            padding: '6'
          },
          ticks: {
            // Convert the Bytes to KB, MB or GB
            callback: (value: number) =>
              this.utilService.convertBytes(value, 'bps')
          }
        }
      },
      throughputTx: {
        subtitle: 'Max: ${max}, Min: ${min}, Average: ${avg}',
        type: 'line',
        legend: false,
        tooltipTransformFn: this.utilService.convertBytes,
        tooltipTransformFnParams: ['bps'],
        yScale: {
          title: {
            display: true,
            text: 'Upstream',
            padding: '6'
          },
          ticks: {
            // Convert the Bytes to KB, MB or GB
            callback: (value: number) =>
              this.utilService.convertBytes(value, 'bps')
          }
        }
      },
      agrThroughputTx: {
        title: 'Links Metrics - Aggregate Throughput (All Links)',
        subtitle: 'Max: ${max}, Min: ${min}, Average: ${avg}',
        type: 'line',
        legend: true,
        tooltipTransformFn: this.utilService.convertBytes,
        tooltipTransformFnParams: ['bps'],
        yScale: {
          ticks: {
            // Convert the Bytes to KB, MB or GB
            callback: (value: number) =>
              this.utilService.convertBytes(value, 'bps')
          }
        }
      },
      agrThroughputRx: {
        tooltipTransformFn: this.utilService.convertBytes,
        tooltipTransformFnParams: ['bps'],
        yScale: {
          ticks: {
            // Convert the Bytes to KB, MB or GB
            callback: (value: number) =>
              this.utilService.convertBytes(value, 'bps')
          }
        }
      }
    };
  }

  /**
   * Getter for the basic chart options.
   *
   * @returns {Object} An object containing the basic chart options. These include:
   * - animation: A boolean indicating whether animation should be enabled for the chart. This is always false.
   * - interaction: An object containing options for how the user can interact with the chart. These include:
   *   - mode: The mode of interaction. This is always 'nearest', which means that the item nearest to the user's pointer will be interacted with.
   *   - axis: The axis along which to look for the nearest item. This is always 'x', which means that the item nearest to the user's pointer along the x-axis will be interacted with.
   *   - intersect: A boolean indicating whether an item needs to intersect with the user's pointer to be interacted with. This is always false, which means that the item does not need to intersect with the user's pointer to be interacted with.
   */
  get basicChartOptions(): object {
    return {
      animation: false,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };
  }

  /**
   * Handles the click event on the legend of a sub-chart.
   *
   * This method is called when a user clicks on the legend of a sub-chart.
   * It first retrieves the index of the dataset associated with the clicked legend item.
   * It then retrieves the current chart and the next chart in the Chart.js instances array.
   * If the dataset is currently visible in the current chart, it hides the dataset in both the current chart and the next chart, and sets the `hidden` property of the legend item to true.
   * If the dataset is not currently visible in the current chart, it shows the dataset in both the current chart and the next chart, and sets the `hidden` property of the legend item to false.
   *
   * @param {any} e - The event object for the click event.
   * @param {any} legendItem - The legend item that was clicked. This should include a `datasetIndex` property.
   * @param {any} legend - The legend object. This should include a `chart` property.
   *
   * @example
   * // Assuming `e` is the event object for the click event,
   * // `legendItem` is { datasetIndex: 0, hidden: false },
   * // and `legend` is { chart: { id: 0, isDatasetVisible: () => true, hide: () => {}, show: () => {} } },
   * // this method will hide the dataset in both the current chart and the next chart, and set `legendItem.hidden` to true.
   * legendClickHandlerForSubChart(e, legendItem, legend);
   */
  legendClickHandlerForSubChart(e: any, legendItem: any, legend: any) {
    const index = legendItem.datasetIndex;
    const currentChart = legend.chart;
    const nextChart = Chart.instances[currentChart.id + 1];
    if (currentChart.isDatasetVisible(index)) {
      currentChart.hide(index);
      nextChart.hide(index);
      legendItem.hidden = true;
    } else {
      currentChart.show(index);
      nextChart.show(index);
      legendItem.hidden = false;
    }
  }

  /**
   * Generates a chart configuration for a given metric.
   *
   * @param {string} metric - The metric for which the chart configuration is to be generated.
   * @param {any[]} input - An array of datasets for the chart.
   * @param {number} [timespan] - The timespan for the chart in milliseconds. If provided, only the data within this timespan will be included in the chart.
   *
   * @returns {any} The chart configuration object. This includes the chart title, subtitle, type, data, and options. If no configuration is found for the given metric, null is returned.
   *
   * @example
   * // returns a chart configuration object for the 'cpuPct' metric
   * getMetricsChart('cpuPct', [{ startTime: 1628006400000, tickInterval: 60000, data: [10, 20, 30, 40, 50] }]);
   *
   * @example
   * // returns a chart configuration object for the 'memoryPct' metric, including only the data within the last hour
   * getMetricsChart('memoryPct', [{ startTime: 1628006400000, tickInterval: 60000, data: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] }], 3600000);
   */
  getMetricsChart(metric: string, input: any[], timespan?: number): any {
    // Get the first dataset
    const [{ startTime, tickInterval, data }] = input;
    // Get the chart config
    const chartConfig = this.metricToChartConfig[metric];
    if (!chartConfig) return null;
    // Create the timestamp array from startTime and tickInterval from data
    const timestamps: any[] = [];
    for (let index = 0; index < data.length; index++) {
      timestamps.push(
        new Date(startTime + index * tickInterval).toLocaleString('en-US', {
          timeStyle: 'short',
          dateStyle: 'medium'
        })
      );
    }
    // Get the chart labels (X-Axis)
    const chartLabels = timespan
      ? timestamps.slice(
          timestamps.length - timespan / (tickInterval / 60 / 1000),
          timestamps.length
        )
      : timestamps;
    // Get the chart data (Y-Axis)
    // Can be multiple datasets
    const chartDataset = input.map((item) => {
      return {
        label: item?.label || chartConfig.title,
        data: timespan
          ? item.data.slice(
              item.data.length - timespan / (tickInterval / 60 / 1000),
              item.data.length
            )
          : item.data
      };
    });
    // Calculate Min Max and Average of the data
    // There can be more than one dataset
    const allDataSets = chartDataset.map((item) => item.data).flat();
    const chartDataPoints: any = {
      min: Math.min(...allDataSets),
      max: Math.max(...allDataSets),
      avg: (
        allDataSets.reduce((itemA: number, itemB: number) => itemA + itemB) /
        allDataSets.length
      ).toFixed(2)
    };
    // Add proper units or format the chartDataAttributes
    Object.keys(chartDataPoints).forEach((key) => {
      if (chartConfig?.tooltipTransformFn) {
        const params: any[] = chartConfig?.tooltipTransformFnParams || [];
        chartDataPoints[key] = chartConfig.tooltipTransformFn(
          chartDataPoints[key],
          ...params
        );
      }
    });
    // Create chart scales
    // x ticks will be always timespan related
    // y tick might vary based on metric
    const scales = {
      y: chartConfig?.yScale ? chartConfig.yScale : {},
      x: {
        ticks: {
          callback: function (value: number) {
            return new Date(chartLabels[value]).toLocaleString(
              'en-US',
              timespan && timespan <= 12 * 60 // if the timespan is mentioned and less than 12 hours
                ? { timeStyle: 'short' }
                : { timeStyle: 'short', dateStyle: 'short' }
            );
          }
        }
      }
    };
    // Create and return the chart object
    return {
      title: chartConfig.title,
      subtitle: this.utilService.replaceTemplateStrings(
        chartConfig?.subtitle,
        chartDataPoints
      ),
      type: chartConfig.type,
      data: {
        labels: chartLabels,
        datasets: chartDataset.map((chartData) => ({
          label: chartData.label,
          data: chartData.data,
          fill: chartConfig.fill,
          stepped: chartConfig.stepped,
          pointStyle: chartConfig.pointStyle,
          borderColor: chartConfig.borderColor,
          backgroundColor: chartConfig.backgroundColor
        }))
      },
      options: {
        ...this.basicChartOptions,
        scales,
        plugins: {
          legend: {
            display: chartConfig.legend,
            onClick: chartConfig.legendClickHandler
          },
          tooltip: {
            callbacks: {
              label: function (context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  if (chartConfig?.tooltipTransformFn) {
                    const params: any[] = [context.parsed.y];
                    if (chartConfig?.tooltipTransformFnParams) {
                      params.push(...chartConfig.tooltipTransformFnParams);
                    }
                    label += chartConfig.tooltipTransformFn(...params);
                  } else if (chartConfig?.tooltipSuffix) {
                    label += context.parsed.y + chartConfig.tooltipSuffix;
                  } else {
                    label += context.parsed.y;
                  }
                }
                return label;
              }
            }
          }
        }
      }
    };
  }

  /**
   * Calculates the minimum, maximum, and average values from a given dataset.
   *
   * @param {any} input - The input object containing the metric, data, and tick interval.
   * @param {string} input.metric - The metric for which the minimum, maximum, and average values are to be calculated.
   * @param {number[]} input.data - The dataset from which the minimum, maximum, and average values are to be calculated.
   * @param {number} input.tickInterval - The interval between each data point in the dataset.
   * @param {number} [timespan] - The timespan for which the minimum, maximum, and average values are to be calculated. If provided, only the data within this timespan will be included in the calculation.
   *
   * @returns {Object} An object containing the minimum, maximum, and average values. Each value is an object with two properties: 'name' and 'value'. The 'name' property is a string representation of the value, formatted according to the tooltip transform function or suffix defined in the chart configuration for the given metric. The 'value' property is the actual numerical value.
   *
   * @example
   * // returns { min: { name: '10', value: 10 }, max: { name: '50', value: 50 }, avg: { name: '30', value: 30 } }
   * getMinMaxAvg({ metric: 'cpuPct', data: [10, 20, 30, 40, 50], tickInterval: 60000 });
   *
   * @example
   * // returns { min: { name: '40', value: 40 }, max: { name: '50', value: 50 }, avg: { name: '45', value: 45 } }
   * getMinMaxAvg({ metric: 'cpuPct', data: [10, 20, 30, 40, 50], tickInterval: 60000 }, 120000);
   */
  getMinMaxAvg(input: any, timespan?: number): object {
    const { metric, data, tickInterval } = input;
    const filteredData = timespan
      ? data.slice(
        data.length - timespan / (tickInterval / 60 / 1000),
        data.length
      )
      : data;
    const min = Math.min(...filteredData)
      .toFixed(2)
      .replace(/[.,]00$/, '');
    const max = Math.max(...filteredData)
      .toFixed(2)
      .replace(/[.,]00$/, '');
    const avg = (
      filteredData.reduce((itemA: number, itemB: number) => itemA + itemB) /
      filteredData.length
    )
      .toFixed(2)
      .replace(/[.,]00$/, '');
    const chartDataPoints: any = {
      min: { name: min, value: min },
      max: { name: max, value: max },
      avg: { name: avg, value: avg }
    };
    const chartConfig = this.metricToChartConfig[metric];
    Object.keys(chartDataPoints).forEach((key) => {
      if (chartConfig?.tooltipTransformFn) {
        const params: any[] = chartConfig?.tooltipTransformFnParams || [];
        chartDataPoints[key]['name'] = chartConfig.tooltipTransformFn(
          chartDataPoints[key]['value'],
          ...params
        );
      } else if (chartConfig?.tooltipSuffix) {
        chartDataPoints[key]['name'] += chartConfig.tooltipSuffix;
      }
    });
    return chartDataPoints;
  }
}
