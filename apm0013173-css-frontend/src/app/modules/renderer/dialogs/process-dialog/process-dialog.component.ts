import { Component, OnInit } from '@angular/core';
import { ProcessModel } from '../../models/process.model';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ProcessorService } from '../../services/processor.service';
import { UtilService } from '../../services/util.service';

@Component({
  selector: 'app-process-dialog',
  templateUrl: './process-dialog.component.html',
  styleUrls: ['./process-dialog.component.scss']
})
export class ProcessDialogComponent implements OnInit {
  processes: ProcessModel[];
  clonedProcesses: ProcessModel[];
  failedProcess: ProcessModel;
  failedProcessId: number;
  isAnyProcessFailed: boolean = false;
  constructor(
    public dialogRef: DynamicDialogRef,
    public config: DynamicDialogConfig,
    private processorService: ProcessorService,
    private utilService: UtilService
  ) {
    // Clone the process to be executed and filter
    this.processes = config.data
      .map((process: ProcessModel) => ({ ...process }))
      .filter((process: ProcessModel) => process.shouldExecute);
    // Keep another copy for reference j=in case of retry
    this.clonedProcesses = JSON.parse(JSON.stringify(this.processes));
  }

  ngOnInit(): void {
    this.startProcessing().then();
  }

  async startProcessing(fromProcessId?: number) {
    // Sort the processes by order
    this.processes.sort((actionA, actionB) => actionA.order - actionB.order);
    // Execute the processes in sequence
    this.isAnyProcessFailed = false;
    for (
      let processId = fromProcessId || 0;
      processId < this.processes.length;
      processId += 1
    ) {
      // Set the running status and reset the message from cloned processes
      // Used for Retry Operations
      this.processes[processId].status = 'running';
      this.processes[processId].message =
        this.clonedProcesses[processId].message;
      try {
        const result = await this.processorService.execute(
          this.processes[processId].action
        );
        this.processes[processId].status = 'passed';
        this.processes[processId].message = result.message;
      } catch (error: any) {
        this.processes[processId].status = 'failed';
        this.processes[processId].message = error.message;
        if (!this.processes[processId].allowSkipOnFail) {
          this.isAnyProcessFailed = true;
          this.failedProcessId = processId;
          this.failedProcess = this.processes[processId];
          break;
        }
      }
    }
    // Do the after execution cleanUp
    this.processorService.cleanUp();
    // If no Action Failed close Dialog in a positive note
    if (!this.isAnyProcessFailed) {
      // Wait for half a second and close
      await this.utilService.delay(500);
      this.dialogRef.close(true);
    }
  }

  onRetry() {
    this.startProcessing(this.failedProcessId).then();
  }
}
