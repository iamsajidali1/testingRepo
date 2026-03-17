import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-chart-modal',
  templateUrl: './chart-modal.component.html',
  styleUrls: ['./chart-modal.component.scss']
})
export class ChartModalComponent implements OnChanges {
  // Only one yAxisLabel getter should exist
  @Input() chartData: any;
  @Input() displayedColumns: string[] = [];
  @Input() columnMap: { [key: string]: string } = {};
  @Input() chartType: string = 'line';
  @Input() visible: boolean = false;
  @Input() title: string = '';
  @Output() closed = new EventEmitter<void>();

  selectedStat: string = '';
  chartConfig: ChartConfiguration<'line' | 'bar'> | null = null;

  statOptions: { label: string, value: string }[] = [];

  get selectedChart() {
    return this.chartData?.find((c: any) => c.name === this.selectedStat);
  }

  get yAxisLabel(): string {
    const opt: { label: string, value: string } | undefined = this.statOptions?.find((o: { label: string, value: string }) => o.value === this.selectedStat);
    return opt ? opt.label : (this.selectedChart?.name || '');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chartData'] && this.chartData?.length) {
      // Always reset to first stat when chartData changes
      this.selectedStat = this.chartData[0].name;
      // Only show numeric stats that are displayed in the table, with table labels
      this.statOptions = this.displayedColumns
        .map(label => {
          const key = this.columnMap[label];
          // Find chartData object for this key
          const chartObj = this.chartData.find((c: any) => c.name === key && Array.isArray(c.series) && c.series.length > 0 && typeof c.series[0].value === 'number');
          if (chartObj) {
            return { label, value: key };
          }
          return null;
        })
        .filter(opt => !!opt) as { label: string, value: string }[];
    }
    // Always update chart config when chartData or selectedStat changes
    this.updateChartConfig();
  }

  updateChartConfig() {
    const chart = this.selectedChart;
    if (!chart || !chart.series || chart.series.length === 0) {
      this.chartConfig = null;
      return;
    }
    // Find the label for the selected stat key
    let yAxisLabel = chart.name;
    const statOption = this.statOptions.find(opt => opt.value === this.selectedStat);
    if (statOption) {
      yAxisLabel = statOption.label;
    }
    if (chart.type === 'bar') {
      this.chartConfig = {
        type: 'bar',
        data: {
          labels: chart.series.map((s: any) => s.name),
          datasets: [{
            label: chart.name,
            data: chart.series.map((s: any) => s.value),
            backgroundColor: '#1976d2',
            borderColor: '#1976d2',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true },
            tooltip: { enabled: true }
          },
          scales: {
            x: { title: { display: true, text: 'Timestamp' } },
            y: { title: { display: true, text: yAxisLabel } }
          }
        }
      };
    } else {
      this.chartConfig = {
        type: 'line',
        data: {
          labels: chart.series.map((s: any) => s.name),
          datasets: [{
            label: chart.name,
            data: chart.series.map((s: any) => s.value),
            fill: false,
            borderColor: '#42A5F5',
            backgroundColor: '#42A5F5',
            pointBackgroundColor: '#42A5F5',
            pointBorderColor: '#fff',
            pointRadius: 5,
            pointHoverRadius: 7,
            showLine: true,
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: true },
            tooltip: { enabled: true }
          },
          scales: {
            x: { title: { display: true, text: 'Timestamp' } },
            y: { title: { display: true, text: yAxisLabel } }
          }
        }
      };
    }
  }

  close() {
    this.closed.emit();
  }
}
