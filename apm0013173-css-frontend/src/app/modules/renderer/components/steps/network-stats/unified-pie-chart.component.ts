import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-unified-pie-chart',
  template: `
    <div style="width: 100%;">
      <canvas #pieChart></canvas>
    </div>
  `
})
export class UnifiedPieChartComponent implements AfterViewInit, OnChanges {
  @Input() labels: string[] = [];
  @Input() data: number[] = [];
  @Input() backgroundColor: string[] = [];
  @Input() chartLabel: string = '';
  @ViewChild('pieChart') pieChartRef!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;
  @Output() segmentClick = new EventEmitter<string>();

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.chart) {
      this.chart.destroy();
      this.renderChart();
    }
  }

  renderChart() {
    if (!this.pieChartRef) return;
    // Softer, minimal color palette
    const softColors = [
      '#e3f2fd', // very light blue
      '#f1f8e9', // very light green
      '#fffde7', // very light yellow
      '#fce4ec', // very light pink
      '#f3e5f5', // very light purple
      '#e0f7fa', // very light cyan
      '#f9fbe7', // very light lime
      '#f5f5f5', // very light gray
      '#ede7f6', // very light lavender
      '#e8f5e9', // very light mint
      '#fff8e1', // very light amber
      '#fbe9e7'  // very light orange
    ];
    this.chart = new Chart(this.pieChartRef.nativeElement, {
      type: 'pie',
      data: {
        labels: this.labels,
        datasets: [{
          data: this.data,
          backgroundColor: this.backgroundColor && this.backgroundColor.length ? this.backgroundColor : softColors,
          label: this.chartLabel
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            bodyFont: {
              family: 'Inter, Roboto, Arial, sans-serif',
              size: 13,
              weight: 'normal'
            },
            titleFont: {
              family: 'Inter, Roboto, Arial, sans-serif',
              size: 14,
              weight: 'bold'
            },
            backgroundColor: '#f5f5f5',
            titleColor: '#333',
            bodyColor: '#555',
            borderColor: '#e0e0e0',
            borderWidth: 1
          }
        },
        onClick: (event, elements, chart) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const label = this.labels[idx];
            this.segmentClick.emit(label);
          }
        }
      }
    });
  }
}
