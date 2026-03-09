import { Injectable } from '@angular/core';
import { StepperService } from './stepper.service';
import { StateService } from './state.service';
import { CoreService } from './core.service';
import { concatMap, forkJoin, Subscription, switchMap, tap } from 'rxjs';
import { IdNameModel, LabelValueModel } from '../models/utils.model';
import { UtilService } from './util.service';
import { ValidationModel } from '../models/validation.model';
import { DeviceModel } from '../models/device.model';

@Injectable()
export class ProcessorService {
  executionMap: any;
  subscriptions: Subscription[] = [];
  constructor(
    private coreService: CoreService,
    private stateService: StateService,
    private stepperService: StepperService,
    private utilService: UtilService
  ) {
    this.executionMap = {
      checkDeviceAvailability: this.checkDeviceAvailability.bind(this),
      createTransaction: this.createTransaction.bind(this),
      fetchFormControls: this.fetchFormControls.bind(this),
      generateConfiguration: this.generateConfiguration.bind(this),
      runPreValidationCommands: this.runPreValidationCommands.bind(this),
      setPreChangeCheckpoint: this.setPreChangeCheckpoint.bind(this),
      pushConfiguration: this.pushConfiguration.bind(this),
      runPostValidationCommands: this.runPostValidationCommands.bind(this),
      acceptConfigChanges: this.acceptConfigChanges.bind(this),
      rollbackConfigChanges: this.rollbackConfigChanges.bind(this),
      activateLan: this.activateLan.bind(this),
      saveDataCollection: this.saveDataCollection.bind(this),
      uploadSdsConfiguration: this.uploadSdsConfiguration.bind(this),
      getOrchestratorList: this.getOrchestratorList.bind(this),
      updateTransactionForSdWan: this.updateTransactionForSdWan.bind(this),
      generateMdsConfig: this.generateMdsConfig.bind(this),
      onBoardUsersToVco: this.onBoardUsersToVco.bind(this),
      fetchControlsFromInventory: this.fetchControlsFromInventory.bind(this),
      generateDeviceReports: this.generateDeviceReports.bind(this),
      provisionUsersToOrchestrator:
        this.provisionUsersToOrchestrator.bind(this),
      provisionEdgesToOrchestrator:
        this.provisionEdgesToOrchestrator.bind(this),
      createChangeRequest: this.createChangeRequest.bind(this),
      resumeCdcDataAndConfig: this.resumeCdcDataAndConfig.bind(this),
      cleanupAfterLanActivation: this.cleanupAfterLanActivation.bind(this),
      fetchNetworkInsights: this.fetchNetworkInsights.bind(this),
      fetchNetworkStats: this.fetchNetworkStats.bind(this),
      createBulkMacd : this.createBulkMacd.bind(this),
      generateBvoipReport: this.generateBvoipReport.bind(this)
    };
  }

  /**
   * Execute the passed process
   * @param process name of the function to execute
   * @returns Promise
   */
  execute(process: string) {
    const functionToExecute = this.executionMap[process];
    return functionToExecute();
  }

  /**
   * To check if the device is available for configuration
   * @returns Promise
   */
  checkDeviceAvailability() {
    return new Promise((resolve, reject) => {
      const { customer, service } = this.stateService.inputParams;
      const device = this.stateService.deviceName;
      const subscription = this.coreService
        .checkAvailability(device, customer.id, service.id)
        .subscribe({
          next: (response: any) => {
            if ('result' in response && response.result === 'success') {
              return resolve({
                message: `${device} is available and ready to be configured.`
              });
            } else if ('result' in response && response.result === 'failed') {
              return reject(
                new Error(
                  `${device} is currently not available for configuration!`
                )
              );
            }
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To create a transaction for the configuration
   * @returns Promise
   */
  createTransaction() {
    return new Promise((resolve, reject) => {
      const { action, customer, service } = this.stateService.inputParams;
      const device = this.stateService.deviceName;
      const subscription = this.coreService
        .createTransaction('action', action.id, service.id, customer.id, device)
        .pipe(switchMap(() => this.coreService.cookieReader('transactionId')))
        .subscribe({
          next: (transactionId) => {
            this.stateService.transactionId = transactionId;
            return resolve({
              message: `Transaction: ${transactionId} created successfully.`
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To fetch form control data from device
   * @returns Promise
   */
  fetchFormControls() {
    return new Promise((resolve, reject) => {
      // Check if there is script in the question
      let questions = [...this.stateService.inputParams.action.questions];
      questions = this.utilService.groomQuestions(questions);
      const scripts: LabelValueModel[] =
        this.utilService.getScriptsFromQuestions(questions);
      // If no Script just complete this Process
      if (!scripts.length) {
        this.stateService.questions = [...questions];
        return resolve({
          message: 'Successfully fetched all the required form controls.'
        });
      }
      // Otherwise, execute the script using long polling
      const promises: any[] = [];
      scripts.forEach((script) =>
        promises.push(this.coreService.runMcapScript(script.value))
      );
      const subscription = forkJoin(promises).subscribe({
        next: (results) => {
          this.stateService.cachedScripts = scripts.map((script, index) => ({
            script: script.value,
            result: results[index]
          }));
          // Fix the script results to the questions
          this.stateService.questions =
            this.utilService.setScriptResultsToQuestions(
              questions,
              this.stateService.cachedScripts
            );
          // Resolve when everything is good
          return resolve({
            message:
              'Successfully fetched all required controls from inventory.'
          });
        },
        error: (err) => reject(new Error(err))
      });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To execute pre-validation commands onto the device
   * @returns Promise
   */
  runPreValidationCommands() {
    return new Promise((resolve, reject) => {
      // Get if any data collection data is there
      const data: any = this.stateService.getWorkflowData('data-collection');
      // Prepare validation Input Data
      const validationData: any = { data: [], failedValidation: [] };
      if (data) {
        Object.keys(data).forEach((key: string) => {
          validationData.data.push({
            dataCollectionVariable: key,
            variable: data[key]
          });
        });
      }
      const subscription = this.coreService
        .runValidation(validationData)
        .subscribe({
          next: (preVal) => {
            // Check if there is any Invalid Input Error
            preVal.forEach((val: ValidationModel) => {
              if (val.output && val.output.includes('Invalid input')) {
                val.status = 'failed';
              }
            });
            this.stateService.setWorkflowData('pre-validation', preVal);
            return resolve({
              message:
                'Successfully executed pre-validation show commands onto the device.'
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To generate configuration using carche
   * @returns Promise
   */
  generateConfiguration() {
    return new Promise((resolve, reject) => {
      const { carcheTemplate } = this.stateService.inputParams.action;
      if (!carcheTemplate || !carcheTemplate.name)
        return reject(
          new Error('No carche template found against the selected action!')
        );
      const data = this.stateService.getWorkflowData('data-collection');
      // Filter out primitive and non primitive data types
      const linearDataConstructs: any = {},
        nonLinearDataConstructs: any = {};
      Object.keys(data).forEach((key) => {
        // Loop through the questions and find out if the controlType is list or file
        ['list', 'file'].includes(
          this.stateService.questions.find((ques) => ques.key === key)
            ?.controlType
        )
          ? (nonLinearDataConstructs[key] = data[key])
          : (linearDataConstructs[key] = data[key]);
      });

      const templateName = carcheTemplate.name;
      // Get the Data Collection Variables
      const variables = {
        Hostname: this.stateService.deviceName,
        ...linearDataConstructs
      };

      // Generate configuration
      const subscription = this.coreService
        .generateConfig(templateName, variables, nonLinearDataConstructs)
        .subscribe({
          next: (data) => {
            this.stateService.setWorkflowData('configuration', data);
            return resolve({
              message: 'Configuration generated successfully.'
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To set rollback checkpoint if in case rollback
   * @returns Promise
   */
  setPreChangeCheckpoint() {
    return new Promise((resolve, reject) => {
      // Check if the device needs to set a Checkpoint manually
      // For non-Cisco No need to set checkpoint, it is set automatically
      const { device } = this.stateService.inputParams;
      const { HOSTNAME } = device;
      if (device.VENDOR && !this.utilService.isCiscoDevice(device.VENDOR)) {
        return resolve({
          message: `Pre-change config state checkpoint sets automatically for ${HOSTNAME}.`
        });
      }
      const subscription = this.coreService.setPreChangeCheckpoint().subscribe({
        next: (data: any) => {
          if (this.utilService.checkIfMcapPassed(data)) {
            return reject({
              message: `Unable to capture pre-change config state checkpoint for ${HOSTNAME}!`
            });
          }
          return resolve({
            message: `Successfully captured pre-change config state checkpoint for ${HOSTNAME}.`
          });
        },
        error: (err) => reject(new Error(err))
      });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To push/ execute configuration script onto the device
   * @returns Promise
   */
  pushConfiguration() {
    return new Promise((resolve, reject) => {
      const configData = this.stateService.getWorkflowData('configuration');
      if (!('templateId' in configData && 'templateUUID' in configData)) {
        return reject(
          new Error('Generated config does not have a valid ID and UUID!')
        );
      }
      const { templateId, templateUUID } = configData;
      const subscription = this.coreService
        .pushConfiguration(templateId, templateUUID)
        .subscribe({
          next: (data: any) => {
            const device = this.stateService.deviceName;
            if (this.utilService.checkIfMcapPassed(data)) {
              return reject({
                message: `Unable to execute configuration script onto ${device}!`
              });
            }
            // Set the status as pending-confirmation
            this.stateService.status = 'pending-confirmation';
            return resolve({
              message: `Configuration script is successfully executed onto ${device}.`
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To execute post-validation commands onto the device
   * @returns Promise
   */
  runPostValidationCommands() {
    return new Promise((resolve, reject) => {
      // Get if any data collection data is there
      const data: any = this.stateService.getWorkflowData('data-collection');
      // Prepare validation Input Data
      const validationData: any = { data: [], failedValidation: [] };
      if (data) {
        Object.keys(data).forEach((key: string) => {
          validationData.data.push({
            dataCollectionVariable: key,
            variable: data[key]
          });
        });
      }
      const subscription = this.coreService
        .runValidation(validationData)
        .subscribe({
          next: (postVal) => {
            this.stateService.setWorkflowData('post-validation', postVal);
            return resolve({
              message:
                'Successfully executed post-validation show commands onto the device.'
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To accept the changes executed on the device
   * @returns Promise
   */
  acceptConfigChanges() {
    return new Promise((resolve, reject) => {
      const subscription = this.coreService.confirmChanges().subscribe({
        next: (data: any) => {
          const device = this.stateService.deviceName;
          if (this.utilService.checkIfMcapPassed(data)) {
            return reject({
              message: `Unable to confirm configuration changes for ${device}!`
            });
          }
          // Set the status as completed
          this.stateService.status = 'completed';
          return resolve({
            message: `Successfully confirmed configuration changes for ${device}.`
          });
        },
        error: (err) => reject(new Error(err))
      });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To roll back the changes executed on the device
   * @returns Promise
   */
  rollbackConfigChanges() {
    return new Promise((resolve, reject) => {
      const subscription = this.coreService.rollbackNow().subscribe({
        next: (data: any) => {
          const device = this.stateService.deviceName;
          if (this.utilService.checkIfMcapPassed(data)) {
            return reject({
              message: `Unable to rollback configuration changes for ${device}!`
            });
          }
          // Set the status as rolled-back
          this.stateService.status = 'rolled-back';
          return resolve({
            message: `Successfully rolled back configuration changes to the previous state.`
          });
        },
        error: (err) => reject(new Error(err))
      });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * Post Change Request After Changes are Accepted and Committed
   * @returns Promise
   */
  createChangeRequest() {
    return new Promise((resolve, reject) => {
      const subscription = this.coreService
        .postChangeRequest(this.stateService.summary)
        .subscribe({
          next: (data: any) => {
            if ('status' in data && data.status >= 400) {
              return reject(data.message);
            }
            // Set the Data
            if ('status' in data && data.status === 201) {
              this.stateService.changeRequestData = data.data;
            }
            return resolve({
              message:
                data.messsage ||
                `Successfully executed checks to create change request!`
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To activate LAN Interface of the selected device
   * @returns Promise
   */
  activateLan() {
    return new Promise((resolve, reject) => {
      const subscription = this.coreService.activateLan().subscribe({
        next: (data: any) => {
          // Assign Data Respectively
          if ('prevalidation' in data && data.prevalidation) {
            this.stateService.setWorkflowData(
              'pre-validation',
              this.utilService.groomValidationResponse(data.prevalidation)
            );
          }
          if ('generatedConfig' in data && data.generatedConfig) {
            this.stateService.setWorkflowData(
              'configuration',
              data.generatedConfig
            );
          }
          if ('postValidation' in data && data.postValidation) {
            this.stateService.setWorkflowData(
              'post-validation',
              this.utilService.groomValidationResponse(data.postValidation)
            );
          }
          return resolve({
            message: `Successfully activated lan interface for the selected device.`
          });
        },
        error: (err) => reject(new Error(err))
      });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To clean the action and other stuff after successful Lan Activation
   * @returns {Promise}
   */
  cleanupAfterLanActivation() {
    return new Promise((resolve, reject) => {
      const { id } = this.stateService.inputParams.action;
      const subscription = this.coreService.disableAction(id).subscribe({
        next: () =>
          resolve({
            message: `Successfully executed post lan activation activities.`
          }),
        error: (err) => reject(new Error(err))
      });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To save the collected information on the Data-Collection step
   * @returns Promise
   */
  saveDataCollection() {
    return new Promise((resolve, reject) => {
      // Get the data from data-collection step
      const collectedData =
        this.stateService.getWorkflowData('data-collection');
      const options = this.stateService.getWorkflowOptions('data-collection');
      const { device } = this.stateService.inputParams;
      const collectedFor = {
        tdcId: device.ID,
        device: device.HOSTNAME,
        grua: device?.GRUA,
        transactionId: this.stateService.transactionId,
        options
      };
      const subscription = this.coreService
        .saveDataCollection(collectedData, collectedFor)
        .subscribe({
          next: (data: any) => {
            if (!('COLLECTED_DATA' in data) || !data.COLLECTED_DATA) {
              return reject(
                new Error(
                  'Could not save the collected data into the inventory!'
                )
              );
            }
            // Set the status as completed
            this.stateService.status = 'completed';
            this.stateService.statusMessage =
              'Successfully saved the collected data into the inventory!';
            return resolve({
              message: `Successfully saved the collected data into the inventory.`
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
      // !!! Exception, Clean up the options
      this.stateService.setWorkflowOptions('data-collection', {});
    });
  }

  /**
   * To upload the SDS configuration
   * @returns Promise
   */
  uploadSdsConfiguration() {
    return new Promise((resolve, reject) => {
      const { device } = this.stateService.inputParams;
      const configData = this.stateService.getWorkflowData('configuration');
      if (!('templateId' in configData && 'templateUUID' in configData)) {
        return reject(
          new Error('Generated config does not have a valid ID and UUID!')
        );
      }
      const subscription = this.coreService
        .uploadSdsConfiguration(Number(device.ID), configData.config)
        .subscribe({
          next: (data: any) => {
            // Set the status as completed
            this.stateService.status = 'completed';
            this.stateService.statusMessage =
              'TDC Completed! Successfully uploaded the configuration onto the Ericsson Orchestrator!';
            return resolve({
              message: `Successfully uploaded the configuration onto the Ericsson Orchestrator.`
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To get the list of Orchestrators
   * @returns Promise
   */
  getOrchestratorList() {
    return new Promise((resolve, reject) => {
      const subscription = this.coreService.getOrchestratorList().subscribe({
        next: (result) => {
          this.stateService.cachedScripts.push({
            script: '/api/internal/css/getVcoList',
            result
          });
          return resolve({
            message: 'Successfully fetched all the required form controls.'
          });
        },
        error: (err) => reject(new Error(err))
      });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To update a transaction for the MDS Config
   * @returns Promise
   */
  updateTransactionForSdWan() {
    return new Promise((resolve, reject) => {
      const { action, customer, service } = this.stateService.inputParams;
      const credData = this.stateService.getWorkflowData('credential');
      const subscription = this.coreService
        .createTransaction(
          '',
          action.id,
          service.id,
          customer.id,
          null,
          credData.vco
        )
        .subscribe({
          next: (data) => {
            if (data.message === 'Successful!') {
              return resolve({
                message: `Transaction: ${this.stateService.transactionId} updated successfully.`
              });
            }
            return reject({
              message: `Something went wrong, transaction could not be updated!`
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * Generate MDS configuration
   */
  generateMdsConfig() {
    return new Promise((resolve, reject) => {
      const credData = this.stateService.getWorkflowData('credential');
      const credentials: any = {
        VCO_USERNAME: credData.username,
        VCO_PASSWORD: credData.password
      };
      if (credData.usersEmail && credData.usersEmail.length > 0) {
        credentials['usersEmail'] = credData.usersEmail;
      }
      const subscription = this.coreService
        .generateMdsConfig(credentials, 'excel')
        .subscribe({
          next: (data: any) => {
            const blob = new Blob([data], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const fileName = `MDS_${this.stateService.inputParams.customer.name
              .split(' ')
              .join('_')}.xlsx`;
            this.utilService.saveBase64BlobToFile(blob, blob.type, fileName);
            this.stateService.status = 'completed';
            this.stateService.statusMessage =
              'Successfully generated MDS Config!';
            return resolve({
              message: `Successfully generated MDS Config. Downloading file ${fileName}.`
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * Onboard Users onto the VCO
   */
  onBoardUsersToVco() {
    return new Promise((resolve, reject) => {
      const credData = this.stateService.getWorkflowData('credential');
      const credentials: any = {
        VCO_USERNAME: credData.username,
        VCO_PASSWORD: credData.password,
        usersProvisioiningSwitch: credData.userType === 'Tenant'
      };
      const configData = this.stateService.getWorkflowData('configuration');
      const { templateId, templateUUID } = configData;
      const subscription = this.coreService
        .createVcoUsers(credentials, templateId, templateUUID)
        .subscribe({
          next: () => {
            return resolve({
              message: `Successfully generated MDS Config. Downloading file`
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To fetch form control data from inventory
   * @returns Promise
   */
  fetchControlsFromInventory() {
    return new Promise((resolve, reject) => {
      // Check if there is script in the question
      let questions = [...this.stateService.inputParams.action.questions];
      questions = this.utilService.groomQuestions(questions);
      const scripts: LabelValueModel[] =
        this.utilService.getScriptsFromQuestions(questions);
      // If no Script just complete this Process
      if (!scripts.length) {
        this.stateService.questions = [...questions];
        return resolve({
          message: 'Successfully fetched all the required form controls.'
        });
      }
      // Dictionary of Inventory Calls
      const inventoryMap = {
        '/api/internal/css/getVcoList': this.coreService.getOrchestratorList()
      };
      // Otherwise, execute the script using long polling
      const promises: any[] = [];
      scripts.forEach((script) => {
        const { value } = script;
        if (value && value in inventoryMap) {
          // @ts-ignore
          promises.push(inventoryMap[value]);
        }
      });
      const subscription = forkJoin(promises).subscribe({
        next: (results) => {
          this.stateService.cachedScripts = scripts.map((script, index) => ({
            script: script.value,
            result: results[index]
          }));
          // Fix the script results to the questions
          this.stateService.questions =
            this.utilService.setScriptResultsToQuestions(
              questions,
              this.stateService.cachedScripts
            );
          // Resolve when everything is good
          return resolve({
            message:
              'Successfully fetched all required controls from inventory.'
          });
        },
        error: (err) => reject(new Error(err))
      });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To generate the Device report using the new camunda flow
   * @returns Promise
   */
  generateDeviceReports() {
    return new Promise((resolve, reject) => {
      const data = this.stateService.getWorkflowData('data-collection');
      // Attach the vendor to the data
      data['vendor'] = this.stateService.inputParams.action.vendorType;
      const subscription = this.coreService
        .generateDeviceReports(data)
        .subscribe({
          next: (response: any) => {
            const { status, statusCode, userMessage, message } = response;
            if (status === 'OK' && statusCode === 200) {
              this.stateService.status = 'completed';
              this.stateService.statusMessage =
                'Report generation in progress. It will be emailed once completed!' +
                `\n Please note the Request Id: "${userMessage}" for future reference.`;
              return resolve({ message });
            } else {
              this.stateService.status = 'failed';
              this.stateService.statusMessage =
                'Failed to generate the report, please contact support!';
              reject(new Error('Something went wrong, please retry!'));
            }
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To provision users to the orchestrator
   * @returns Promise
   */
  provisionUsersToOrchestrator() {
    return new Promise((resolve, reject) => {
      const data = this.stateService.getWorkflowData('data-collection');
      const { orchestrator, usersEmail } = data;
      const { config } = this.stateService.getWorkflowData('configuration');
      const subscription = this.coreService
        .provisionUsersToOrchestrator(orchestrator, usersEmail, config)
        .subscribe({
          next: (response: any) => {
            const { status, statusCode, userMessage, message } = response;
            if (status === 'OK' && statusCode === 200) {
              this.stateService.status = 'completed';
              this.stateService.statusMessage =
                'User Provisioning is in progress. We will be email you once completed!' +
                `\n Please note the Request Id: "${userMessage}" for future reference.`;
              return resolve({ message });
            } else {
              this.stateService.status = 'failed';
              this.stateService.statusMessage =
                'Failed to provision the users, please contact support!';
              reject(new Error('Something went wrong, please retry!'));
            }
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To provision Edges to the orchestrator
   * @returns Promise
   */
  provisionEdgesToOrchestrator() {
    return new Promise((resolve, reject) => {
      const data = this.stateService.getWorkflowData('data-collection');
      const { orchestrator, usersEmail } = data;
      const { config } = this.stateService.getWorkflowData('configuration');
      const subscription = this.coreService
        .provisionEdgesToOrchestrator(orchestrator, usersEmail, config)
        .subscribe({
          next: (response: any) => {
            const { status, statusCode, userMessage, message } = response;
            if (status === 'OK' && statusCode === 200) {
              this.stateService.status = 'completed';
              this.stateService.statusMessage =
                'Edge Provisioning is in progress. We will be email you once completed!' +
                `\n Please note the Request Id: "${userMessage}" for future reference.`;
              return resolve({ message });
            } else {
              this.stateService.status = 'failed';
              this.stateService.statusMessage =
                'Failed to provision the edge(s), please contact support!';
              reject(new Error('Something went wrong, please retry!'));
            }
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * To resume the Customer Data Collection Config
   * @returns Promise
   */
  resumeCdcDataAndConfig() {
    return new Promise((resolve, reject) => {
      const TDC_WORKFLOW_ID = 2;
      const TDC_WORKFLOW_TYPE = 'Data collection';
      let deviceDetails: DeviceModel = null;
      let customerDetails: IdNameModel = null;
      const subscription = forkJoin([
        this.stepperService.loadSteps(TDC_WORKFLOW_ID),
        this.coreService.loadDataCollectionByTransaction(
          this.stateService.transactionId
        )
      ])
        .pipe(
          tap(([stepConfig, cdcResponse]) => {
            this.stateService.workflowSteps = stepConfig.steps;
            this.stateService.workflowDrivers = stepConfig.drivers;
            const { dataCollection, tdcData, customer } = cdcResponse;
            // Set the previous data collection if the status is anything other than In Progress
            if (
              tdcData.STATUS !== 'Not Started' &&
              'COLLECTED_DATA' in dataCollection
            ) {
              this.stateService.setWorkflowData(
                'data-collection',
                dataCollection['COLLECTED_DATA']
              );
            }
            // Set READ ONLY true is SNOW_STATUS != 'enable'
            if (tdcData.SNOW_STATUS != 'enable') {
              this.stateService.setWorkflowOptions('data-collection', {
                readOnly: true
              });
            }
            deviceDetails = {
              ID: tdcData.ID,
              HOSTNAME: tdcData.DEVICE,
              VENDOR: 'N/A',
              SERVICE: 'N/A',
              SERVICE_NAME: 'N/A',
              ADDRESS: tdcData.STREET,
              CITY: tdcData.CITY,
              STATE: tdcData.STATE,
              ZIP: tdcData.ZIP,
              COUNTRY: tdcData.COUNTRY,
              GRUA: tdcData.CUSTOMER_GRUA
            };
            customerDetails = { id: customer.ID, name: customer.NAME };
          })
        )
        .pipe(
          concatMap(([stepConfig, cdcResponse]) =>
            this.coreService.loadActionTemplateById(
              cdcResponse.tdcData.TEMPLATE_ID
            )
          )
        )
        .subscribe({
          next: (action: any) => {
            this.stateService.inputParams = {
              customer: customerDetails,
              service: { id: 1, name: 'TDC' },
              device: deviceDetails,
              actionType: TDC_WORKFLOW_TYPE,
              action: {
                ...action,
                workflow: TDC_WORKFLOW_TYPE,
                workflowId: TDC_WORKFLOW_ID
              }
            };
            resolve({
              message:
                'Successfully fetched the data and config for the transaction'
            });
          },
          error: (err) => reject(new Error(err))
        });
      this.subscriptions.push(subscription);
    });
  }

  /**
   * Fetches network insights by generating a utilization report.
   *
   * This method retrieves the data required for pulling the utilization report from the workflow data under the key 'data-collection'.
   * It then calls the `generateUtilizationReport` method from the `coreService` with the retrieved data.
   * The response from the `generateUtilizationReport` method is processed as follows:
   * - If the status code in the response is not 200, it sets the workflow status to 'failed', the status message to 'Failed to generate network insights!', and the workflow data under the key 'network-insights' to an empty object. It then rejects the promise with the status message.
   * - If the status code in the response is 200, it sets the workflow status to 'completed', the status message to 'Successfully generated the network insights for selected orchestrator.', and the workflow data under the key 'network-insights' to the data from the response. It then resolves the promise with the status message.
   * The subscription to the `generateUtilizationReport` method is added to the `subscriptions` array for later cleanup.
   *
   * @returns {Promise} A promise that resolves with a message indicating the success of the operation, or rejects with an error message.
   */
  fetchNetworkInsights(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get the input data for pulling utilization report
      const data = this.stateService.getWorkflowData('data-collection');
      const subscription = this.coreService
        .generateUtilizationReport(data)
        .subscribe({
          next: (response: any) => {
            const { statusCode, message, data } = response;
            if (statusCode !== 200) {
              this.stateService.status = 'failed';
              this.stateService.statusMessage =
                'Failed to generate network insights!';
              this.stateService.setWorkflowData('network-insights', {});
              return reject(new Error(this.stateService.statusMessage));
            }
            this.stateService.status = 'completed';
            this.stateService.statusMessage =
              'Successfully generated the network insights for selected orchestrator.';
            this.stateService.setWorkflowData('network-insights', data);
            return resolve({ message: this.stateService.statusMessage });
          },
          error: (err) => reject(new Error(err))
        });

      this.subscriptions.push(subscription);
    });
  }


fetchNetworkStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get the input data for pulling network stats
      const subscription = this.coreService
        .generateNetworkStatistics()
        .subscribe({
          next: (response: any) => {
            const { statusCode, message, data } = response;
            if (statusCode !== 200) {
              this.stateService.status = 'failed';
              this.stateService.statusMessage =
                'Failed to generate network statistics!';     
              this.stateService.setWorkflowData('network-stats', {});
              return reject(new Error(this.stateService.statusMessage));
            }
            this.stateService.status = 'completed';
            this.stateService.statusMessage =
              'Successfully generated the network statistics for selected orchestrator.';
            this.stateService.setWorkflowData('network-stats', data);
            return resolve({ message: this.stateService.statusMessage });
          },
          error: (err) => reject(new Error(err))
        });

      this.subscriptions.push(subscription);
    });
  }

  createBulkMacd(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get the input data for pulling network stats
      const data = this.stateService.getWorkflowData('data-collection');
      const subscription = this.coreService
        .createBulkMacd(data)
        .subscribe({
          next: (response: any) => {
            const { statusCode, message, data } = response;
            if (statusCode !== 200) {
              this.stateService.status = 'failed';
              this.stateService.statusMessage =
                'Failed to generate network statistics!';     
              this.stateService.setWorkflowData('bulk-macd', {});
              return reject(new Error(this.stateService.statusMessage));
            }
            this.stateService.status = 'completed';
            this.stateService.statusMessage =
              'Successfully generated the network statistics for selected orchestrator.';
            this.stateService.setWorkflowData('bulk-macd', data);
            return resolve({ message: this.stateService.statusMessage });
          },
          error: (err) => reject(new Error(err))
        });

      this.subscriptions.push(subscription);
    });
  }

    generateBvoipReport(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Get the input data for pulling network stats
      const data = this.stateService.getWorkflowData('data-collection');
      const subscription = this.coreService
        .generateBvoipReport(data)
        .subscribe({
          next: (response: any) => {
            const { statusCode, message, data } = response;
            if (statusCode !== 200) {
              this.stateService.status = 'failed';
              this.stateService.statusMessage =
                'Failed to generate BVOIP CSR Report!';     
              this.stateService.setWorkflowData('bvoip-report', {});
              return reject(new Error(this.stateService.statusMessage));
            }
            this.stateService.status = 'completed';
            this.stateService.statusMessage =
              'Successfully generated BVOIP CSR Report.';
            this.stateService.setWorkflowData('bvoip-report', data);
            return resolve({ message: this.stateService.statusMessage });
          },
          error: (err) => reject(new Error(err))
        });

      this.subscriptions.push(subscription);
    });
  }


  /**
   * To clean up all the subscriptions used
   * @returns Void
   */
  cleanUp() {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
  }
}
