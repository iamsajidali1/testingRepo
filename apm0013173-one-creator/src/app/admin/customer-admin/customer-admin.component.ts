import { Component, OnInit, Input, OnChanges,ViewEncapsulation, Output, EventEmitter } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormBuilder, FormControl, Validators, FormGroup } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {ControllerService} from '../../services/controller.service';
import {finalize} from "rxjs/operators";

@Component({
  selector: 'app-customer-admin',
  templateUrl: './customer-admin.component.html',
  styleUrls: ['./customer-admin.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CustomerAdminComponent implements OnInit, OnChanges {
  @Input() selectedCustomer: any = {};
  @Output() eventEmitter = new EventEmitter<any>();
  form: FormGroup;
  serviceForm: FormGroup;
  tagForm: FormGroup;
  customerServices: any[];
  orchestratorList: any[] = undefined;
  actionNames: any[];
  modalVisible = false;
  service: any = {};
  title = '';
  services: any[];
  isDisabled = true;
  mcapCredentials: any = undefined;
  autoCreateCrConfig: any = {};
  showSpinner = false;
  arrayOfGruaData: any[] = undefined;
  updateBtnDisable = false;
  assignedAttributes: any = null;
  generated = false;
  attributes: any[] = null;
  showButton = false;
  credentilas: any[] = null;
  tagModal = false;
  chosenOrchestrator: any = null;
  orchestratorTags: any[] = [];
  validationModal = false;
  missingFields: string[] = [];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private controllerService: ControllerService,
    private confirmationService: ConfirmationService
  ) {
    this.serviceForm = this.fb.group({});
    this.tagForm = this.fb.group({
      tag: new FormControl('', Validators.required),
    });
  }

  ngOnInit() {
    this.generateFormGroup();
    if (this.selectedCustomer['id']) {
      this.mcapCredentials = undefined;
      this.loadAllAvailableServices();
      this.showSpinner = true;
      this.loadGrua(this.selectedCustomer['id']);
      this.loadCustomer(this.selectedCustomer['id']);
      this.loadServices(this.selectedCustomer['id']);
    }
  }

  ngOnChanges() {
    this.generateFormGroup();
    if (this.selectedCustomer['id']) {
      this.showButton = false;
      this.generated = false;
      this.mcapCredentials = undefined;
      this.loadAllAvailableServices();
      this.showSpinner = true;
      this.loadGrua(this.selectedCustomer['id']);
      this.loadCustomer(this.selectedCustomer['id']);
      this.loadServices(this.selectedCustomer['id']);
      this.loadMcapCredential();
    }
  }

  /**
   * Load customer properties and atributes to customer manager
   * @params customerId
   */
  private loadCustomer(customerId: string): void {
    this.controllerService.getCustomerById(customerId).subscribe(
      (customer) => {
        this.isDisabled = false;
        this.showSpinner = false;
        this.form.get('name').setValue(customer['result']['name']);
        this.form
          .get('bcCompanyId')
          .setValue(customer['result']['bcCompanyId']);
        this.form.get('active').setValue(customer['result']['active']);
        this.form.get('crWebId').setValue(customer['result']['crWebId']);
        this.form.get('msimEmail').setValue(customer['result']['msimEmail']);
      },
      (error) => {
        this.showSpinner = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Service Message',
          detail: 'Error when customer loading!',
        });
      }
    );
  }

  /**
   * Update customer data
   */
  public updateCustomerData(): void {
    if (this.form.get('name').valid && this.form.get('active').valid) {
      this.updateBtnDisable = true;
      const customer = {
        id: this.selectedCustomer['id'],
        name: this.form.get('name').value,
        bcName: '',
        bcCompanyId: this.form.get('bcCompanyId').value,
        active: this.form.get('active').value,
        crWebId: this.form.get('crWebId').value,
        msimEmail: this.form.get('msimEmail').value,
      };
      this.controllerService.updateCustomerById(customer).subscribe(
        (result) => {
          this.eventEmitter.emit();
          this.updateBtnDisable = false;
          if (result['message'] == 'Record is already up to date!') {
            this.messageService.add({
              severity: 'success',
              summary: 'Service Message',
              detail: 'Customer is already up to date!',
            });
          } else {
            this.messageService.add({
              severity: 'success',
              summary: 'Service Message',
              detail: 'Customer successfully updated!',
            });
          }
        },
        (error) => {
          this.updateBtnDisable = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Service Message',
            detail: 'Error when customer updating!',
          });
        }
      );
    } else {
      this.form.controls['name'].markAsDirty();
      this.form.controls['active'].markAsDirty();
    }
  }

  /**
   * Add service to customer
   */
  public async addService() {
    if (this.form.get('service').valid) {
      this.showSpinner = true;
      this.mcapCredentials = undefined;
      this.orchestratorList = undefined;
      this.service = this.form.get('service').value;
      const requestArray = [];
      requestArray.push(
        this.createService(this.selectedCustomer['id'], this.service['id'])
      );
      requestArray.push(this.loadAssignedAttributes(this.service['id']));
      forkJoin(requestArray).subscribe((results) => {
        this.setServiceFormAndLoadData(this.assignedAttributes);
        this.title = 'Create';
        this.showDialog();
      });
    } else {
      this.form.controls['service'].markAsDirty();
      this.form.controls['service'].markAsTouched();
    }
  }

  /**
   * Assigne service for selected customer
   * @params customerId
   * @params serviceId
   */
  private createService(customerId, serviceId): Promise<any> {
    return new Promise((resolve, reject) => {
      this.controllerService
        .saveServiceToCustomer(customerId, serviceId)
        .subscribe(
          (result) => {
            this.showSpinner = false;
            this.form.get('service').setValue('');
            this.form.controls['service'].markAsPristine();
            this.form.controls['service'].markAsUntouched();
            this.loadServices(this.selectedCustomer['id']);
            this.messageService.add({
              severity: 'success',
              summary: 'Service Message',
              detail: 'Service successfully assigned to customer!',
            });
            resolve(resolve);
          },
          (error) => {
            this.showSpinner = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Service Message',
              detail: 'Error when service assigning to customer!',
            });
            reject(error);
          }
        );
    });
  }

  /**
   * Delete service from customer
   * @params service
   */
  public removeService(service): void {
    this.confirmationService.confirm({
      icon: 'pi pi-exclamation-triangle',
      header: 'Confirmation',
      message:
        'Are you sure that you want to delete "' +
        service['serviceName'] +
        '" service?',
      accept: () => {
        this.showSpinner = true;
        this.controllerService
          .deleteServiceToCustomer(this.selectedCustomer['id'], service['id'])
          .subscribe(
            (result) => {
              this.showSpinner = false;
              const index = this.customerServices.indexOf(service, 0);
              this.customerServices.splice(index, 1);
              this.messageService.add({
                severity: 'success',
                summary: 'Service Message',
                detail: 'Service successfully deleted!',
              });
            },
            (error) => {
              this.showSpinner = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Service Message',
                detail: 'Error when service is deleting!',
              });
            }
          );
      },
    });
  }

  /**
   * Add aciton name to customer service
   */
  public addActionName(): void {
    if (this.serviceForm.get('actionName').valid) {
      this.showSpinner = true;
      this.controllerService
        .saveActionData(
          this.selectedCustomer['id'],
          this.service['id'],
          '',
          this.serviceForm.get('actionName').value
        )
        .subscribe(
          (result) => {
            this.showSpinner = false;
            this.serviceForm.get('actionName').setValue('');
            this.serviceForm.get('actionName').clearValidators();
            this.serviceForm.get('actionName').setErrors(null);
            this.serviceForm.updateValueAndValidity();
            this.loadActionData(
              this.selectedCustomer['id'],
              this.service['id']
            );
            this.messageService.add({
              severity: 'success',
              summary: 'Service Message',
              detail: 'Action data successfully assigned to service!',
            });
          },
          (error) => {
            this.showSpinner = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Service Message',
              detail: 'Error when action data assigning to service!',
            });
          }
        );
    } else {
      this.serviceForm.controls['actionName'].markAsDirty();
      this.serviceForm.controls['actionName'].markAsTouched();
    }
  }

  /**
   * Delete aciton name which is associated with customer service
   * @params action
   */
  public removeActionName(action): void {
    this.confirmationService.confirm({
      icon: 'pi pi-exclamation-triangle',
      header: 'Confirmation',
      message:
        'Are you sure that you want to delete "' +
        action['actionCustomerName'] +
        '"?',
      accept: () => {
        this.showSpinner = true;
        this.controllerService.removeActionData(action['id']).subscribe(
          (result) => {
            this.showSpinner = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Service Message',
              detail: 'Action data successfully deleted!',
            });
            const index = this.actionNames.indexOf(action, 0);
            this.actionNames.splice(index, 1);
          },
          (error) => {
            this.showSpinner = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Service Message',
              detail: 'Error when action data deleting!',
            });
          }
        );
      },
    });
  }

  /**
   * Edit service from customer
   * @params service
   */
  public async editService(service) {
    this.mcapCredentials = undefined;
    this.orchestratorList = undefined;
    this.service = service;
    this.title = 'Edit';
    this.showSpinner = true;
    await this.loadAssignedAttributes(this.service['id']);
    this.setServiceFormAndLoadData(this.assignedAttributes);
    this.showDialog();
  }

  /**
   * Save service to customer
   */
  public async save() {
    if (this.serviceForm.controls['credential'].valid) {
      this.modalVisible = false;
      this.showSpinner = true;
      await this.addMcapCredentials(
        this.selectedCustomer['id'],
        this.service['id'],
        this.serviceForm.get('credential').value['id']
      );
      this.serviceForm = this.fb.group({});
      this.showButton = false;
      this.showSpinner = false;
    } else {
      this.serviceForm.controls['credential'].markAsDirty();
      this.serviceForm.controls['credential'].markAsTouched();
    }
  }

  /**
   * Show dialog
   */
  public showDialog(): void {
    this.modalVisible = true;
  }

  /**
   * Close dialog
   */
  public closeDialog(): void {
    this.missingFields = [];
    if (this.actionNames.length == 0) {
      this.missingFields.push('Action grua');
    }
    if (this.missingFields.length > 0) {
      this.validationModal = true;
    } else {
      this.modalVisible = false;
    }
    // Clear the Orch YAML
    if(this.serviceForm.get('orchestrator')) {
      this.serviceForm.get('orchestrator').setValue(null);
      this.serviceForm.updateValueAndValidity();
    }
    if(this.serviceForm.get('configYaml')) {
      this.serviceForm.get('configYaml').setValue(null);
      this.serviceForm.updateValueAndValidity();
    }
  }

  /**
   * Set up service form
   */
  public setServiceFormAndLoadData(serviceAttributes: any[]): void {
    this.showSpinner = true;
    // need add new case with id for new service attribute there
    for (const attribute of serviceAttributes) {
      if (attribute['id'] === 1) {
        this.showButton = true;
        this.serviceForm.addControl(
          'credential',
          new FormControl('', Validators.required)
        );
        this.getMcapCredentials(
          this.selectedCustomer['id'],
          this.service['id']
        );
      } else if (attribute['id'] === 2) {
        this.serviceForm.addControl(
          'url',
          new FormControl('', Validators.required)
        );
        this.serviceForm.addControl(
          'tenantId',
          new FormControl('', Validators.required)
        );
        this.loadOrchestratorListRow(
          this.selectedCustomer['id'],
          this.service['id']
        );
      } else if (attribute['id'] === 3) {
        this.serviceForm.addControl(
          'actionName',
          new FormControl('', Validators.required)
        );
        this.loadActionData(this.selectedCustomer['id'], this.service['id']);
      } else if (attribute['id'] === 4) {
        this.serviceForm.addControl(
          'shouldCreateCr',
          new FormControl('', Validators.required)
        );
        // Load the AutoCreate CR details
        this.loadAutoCrConfig(this.selectedCustomer['id'], this.service['id']);
      } else if (attribute['id'] === 5) {
        this.serviceForm.addControl('orchestrator', new FormControl(null));
        this.serviceForm.addControl('configYaml', new FormControl(null));
        this.loadOrchestratorListRow(
          this.selectedCustomer['id'],
          this.service['id']
        );
      }
    }
    this.showSpinner = false;
    this.generated = true;
  }

  /**
   * Load services by customer id
   */
  public loadServices(customerId: string): void {
    this.controllerService.getServicesByCustomerId(customerId).subscribe(
      (services) => {
        this.customerServices = services['services'];
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Service Message',
          detail: 'Error when loading services assigned to customer!',
        });
      }
    );
  }

  /**
   * Load all available services
   */
  public loadAllAvailableServices() {
    this.controllerService.getAvailableServices().subscribe(
      (services) => {
        this.services = services['result'];
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Service Message',
          detail: 'Error when loading services!',
        });
      }
    );
  }

  /**
   * Load action data for services by customer id
   */
  public loadActionData(customerId: string, serviceId: string): void {
    this.actionNames = [];
    this.controllerService
      .getActionDataByCustomerId(customerId, serviceId)
      .subscribe(
        (actionData) => {
          if (actionData['result'].length > 0) {
            this.serviceForm.get('actionName').setValue('');
            this.serviceForm.get('actionName').clearValidators();
            this.serviceForm.get('actionName').setErrors(null);
            this.serviceForm.updateValueAndValidity();
            this.actionNames = actionData['result'];
          }
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Service Message',
            detail: 'Error when loading action data!',
          });
        }
      );
  }

  /**
   * To Load Auto CR Create Configs
   * @params customerId
   * @params serviceId
   */
  loadAutoCrConfig(customerId: string, serviceId: string): void {
    this.controllerService
      .getAutoCrCreateConfig(customerId, serviceId)
      .subscribe(
        (data: any) => {
          let shouldCreateCr = false;
          if ('SHOULD_AUTO_CREATE_CR' in data) {
            this.autoCreateCrConfig = data;
            shouldCreateCr = data.SHOULD_AUTO_CREATE_CR;
          }
          this.serviceForm.patchValue({ shouldCreateCr });
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Service Message',
            detail: error.error?.message || 'Internal Server Error!',
          });
        }
      );
  }

  /**
   * Add mcap credentials  for customer
   */
  public addMcapCredentials(
    customerId: string,
    serviceId: string,
    credentialId: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const body = {
        customerId,
        serviceId,
        credentialId,
      };
      this.controllerService.saveMcapCredentials(body).subscribe(
        (mcapCredentials) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Service Message',
            detail: 'Mcap credentials successfully updated!',
          });
          resolve(resolve);
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Service Message',
            detail: 'Error when updating mcap credentilas!',
          });
          reject(error);
        }
      );
    });
  }

  /**
   * Load mcap credentials for customer
   */
  public getMcapCredentials(customerId: string, serviceId: string): void {
    this.mcapCredentials = undefined;
    this.controllerService.getMcapCredentials(customerId, serviceId).subscribe(
      (mcapCredential) => {
        if (mcapCredential['result']['id']) {
          this.mcapCredentials = mcapCredential['result'];
          this.serviceForm.get('credential').setValue(mcapCredential['result']);
        }
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Service Message',
          detail: 'Error when loading mcap credentilas!',
        });
      }
    );
  }

  /**
   * Add gps name for customer
   */

  /**
   * Add gps name for customer
   */
  public addGrua(): void {
    if (this.form.get('grua').value != '') {
      this.form.controls['grua'].setValidators(null);
      this.showSpinner = true;
      const body = {
        customerId: this.selectedCustomer['id'],
        grua: this.form.get('grua').value,
      };
      this.controllerService.saveGruaData(body).subscribe(
        (result) => {
          this.form.get('grua').setValue('');
          this.form.controls['grua'].markAsPristine();
          this.form.controls['grua'].markAsUntouched();
          this.loadGrua(this.selectedCustomer['id']);
          this.messageService.add({
            severity: 'success',
            summary: 'Service Message',
            detail: 'Grua successfully saved!',
          });
          this.showSpinner = false;
        },
        (error) => {
          this.showSpinner = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Service Message',
            detail: 'Error when saving grua!',
          });
        }
      );
    } else {
      this.form.controls['grua'].setValidators(Validators.required);
      this.form.controls['grua'].markAsDirty();
      this.form.controls['grua'].markAsTouched();
      this.form.controls['grua'].updateValueAndValidity();
    }
  }

  /**
   * Load Grua name for customer
   */
  public loadGrua(customerId: string): void {
    this.arrayOfGruaData = undefined;
    this.controllerService.loadGruaData(customerId).subscribe(
      (result) => {
        if (result['result'].length > 0) {
          this.arrayOfGruaData = result['result'];
        }
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Service Message',
          detail: 'Error when loading grua data!',
        });
      }
    );
  }

  /**
   * Remove gps name for customer
   */

  /**
   * Remove Grua name for customer
   */
  public removeGrua(grua: any): void {
    this.confirmationService.confirm({
      icon: 'pi pi-exclamation-triangle',
      header: 'Confirmation',
      message: 'Are you sure that you want to delete "' + grua['grua'] + '" ?',
      accept: () => {
        this.showSpinner = true;
        this.controllerService.deleteGruaData(grua['id']).subscribe(
          (result) => {
            this.loadGrua(this.selectedCustomer['id']);
            this.messageService.add({
              severity: 'success',
              summary: 'Service Message',
              detail: 'Grua data successfully deleted!',
            });
            this.showSpinner = false;
          },
          (error) => {
            this.showSpinner = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Service Message',
              detail: 'Error when deleting Grua data!',
            });
          }
        );
      },
    });
  }

  /**
   * Add orchestrator list for service
   */
  public addOrchestratorListRow(): void {
    if (
      this.serviceForm.get('url').valid &&
      this.serviceForm.get('tenantId').valid &&
      this.validURL(this.serviceForm.get('url').value)
    ) {
      this.showSpinner = true;
      const body = {
        customerId: this.selectedCustomer['id'],
        serviceId: this.service['id'],
        url: this.serviceForm.get('url').value,
        tenantId: this.serviceForm.get('tenantId').value,
      };
      this.controllerService.saveOrchestratorList(body).subscribe(
        (result) => {
          this.showSpinner = false;
          this.loadOrchestratorListRow(
            this.selectedCustomer['id'],
            this.service['id']
          );
          this.serviceForm.get('url').setValue('');
          this.serviceForm.get('tenantId').setValue('');
          this.serviceForm.controls['url'].markAsPristine();
          this.serviceForm.controls['url'].markAsUntouched();
          this.serviceForm.controls['tenantId'].markAsPristine();
          this.serviceForm.controls['tenantId'].markAsUntouched();
          this.messageService.add({
            severity: 'success',
            summary: 'Service Message',
            detail: 'Orchestrator list successfully created!',
          });
        },
        (error) => {
          this.showSpinner = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Service Message',
            detail: 'Error when creating orchestrator list!',
          });
        }
      );
    } else {
      this.serviceForm.controls['url'].markAsDirty();
      this.serviceForm.controls['url'].markAsTouched();
      this.serviceForm.controls['tenantId'].markAsDirty();
      this.serviceForm.controls['tenantId'].markAsTouched();
      if (!this.validURL(this.serviceForm.get('url').value)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Service Message',
          detail: 'Entered URL is not valid',
        });
      }
    }
  }

  public validURL(str) {
    const pattern = new RegExp(
      /^(http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/
    );
    return !!pattern.test(str);
  }

  /**
   * Load orchestrator list for service
   */
  public loadOrchestratorListRow(customerId: string, serviceId: string): void {
    this.orchestratorList = [];
    this.controllerService
      .loadOrchestratorList(customerId, serviceId)
      .subscribe(
        (result) => {
          this.showSpinner = false;
          if (result['result'].length > 0) {
            this.orchestratorList = result['result'];
          }
        },
        (error) => {
          this.showSpinner = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Service Message',
            detail: 'Error when loading orchestrator list!',
          });
        }
      );
  }

  public addOrchestratorTag(orchestratorRow) {
    this.chosenOrchestrator = orchestratorRow;
    this.loadOrchestratorTags(this.chosenOrchestrator['id']);
    this.tagModal = true;
  }

  public closeTagDialog() {
    this.tagModal = false;
  }

  /**
   * Remove orchestrator list for service
   */
  public removeOrchestratorListRow(orchestratorRow: any): void {
    this.confirmationService.confirm({
      icon: 'pi pi-exclamation-triangle',
      header: 'Confirmation',
      message: 'Are you sure that you want to delete selected row?',
      accept: () => {
        this.showSpinner = true;
        this.controllerService
          .deleteOrchestratorList(orchestratorRow['id'])
          .subscribe(
            (result) => {
              this.showSpinner = false;
              this.loadOrchestratorListRow(
                this.selectedCustomer['id'],
                this.service['id']
              );
              this.messageService.add({
                severity: 'success',
                summary: 'Service Message',
                detail: 'Orchestrator list row successfully deleted!',
              });
            },
            (error) => {
              this.showSpinner = false;
              this.messageService.add({
                severity: 'error',
                summary: 'Service Message',
                detail: 'Error when deleting orchestrator list row!',
              });
            }
          );
      },
    });
  }

  /**
   * Add orchestrator tags for service
   */
  public addOrchestratorTagsRow(): void {
    if (this.tagForm.get('tag').valid) {
      this.showSpinner = true;
      const tags = this.tagForm
        .get('tag')
        .value.split(',')
        .map((item) => item.trim());

      this.orchestratorTags.push(...tags);
      this.tagForm.get('tag').setValue('');
      const body = {
        tags: this.orchestratorTags,
      };
      this.controllerService
        .saveOrchestratorTags(body, this.chosenOrchestrator['id'])
        .subscribe(
          (result) => {
            this.showSpinner = false;
            this.tagForm.get('tag').setValue('');
            this.tagForm.controls['tag'].markAsPristine();
            this.tagForm.controls['tag'].markAsUntouched();
            this.messageService.add({
              severity: 'success',
              summary: 'Service Message',
              detail: 'Orchestrator tags successfully created!',
            });
          },
          (error) => {
            this.showSpinner = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Service Message',
              detail: 'Error when creating orchestrator tag!',
            });
          }
        );
    }
  }

  public loadOrchestratorTags(orchestratorListId): void {
    this.orchestratorTags = [];
    this.showSpinner = true;
    this.controllerService.loadOrchestratorTags(orchestratorListId).subscribe(
      (tags) => {
        this.showSpinner = false;
        if (tags['result']['tags']) {
          this.orchestratorTags = tags['result']['tags'].split(',');
        }
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Service Message',
          detail: 'Error when creating orchestrator list!',
        });
      }
    );
  }

  public removeOrchestratorTags(orchestratorTagsRow) {
    this.showSpinner = true;
    const index = this.orchestratorTags.indexOf(orchestratorTagsRow);
    if (index > -1) {
      this.orchestratorTags.splice(index, 1);
    }
    const body = {
      tags: this.orchestratorTags,
    };
    this.controllerService
      .saveOrchestratorTags(body, this.chosenOrchestrator['id'])
      .subscribe(
        (result) => {
          this.showSpinner = false;
          this.tagForm.get('tag').setValue('');
          this.tagForm.controls['tag'].markAsPristine();
          this.tagForm.controls['tag'].markAsUntouched();
          this.messageService.add({
            severity: 'success',
            summary: 'Service Message',
            detail: 'Orchestrator tags successfully removed!',
          });
        },
        (error) => {
          this.showSpinner = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Service Message',
            detail: 'Error when creating orchestrator tag!',
          });
        }
      );
  }

  // load all relationships between attribute and service
  private loadAssignedAttributes(serviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.showSpinner = true;
      this.controllerService
        .loadAssignedAttributesForService(serviceId)
        .subscribe(
          (attributes) => {
            this.assignedAttributes = attributes['result'];
            this.showSpinner = false;
            resolve(resolve);
          },
          (error) => {
            this.showSpinner = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error when loading attributes for service!',
            });
            reject(error);
          }
        );
    });
  }

  /**
   * Load all mcap credentials
   */
  public loadMcapCredential(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.showSpinner = true;
      this.controllerService.loadAllMcapCredentials().subscribe(
        (credentilas) => {
          this.credentilas = credentilas;
          this.showSpinner = false;
          resolve(resolve);
        },
        (error) => {
          this.showSpinner = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error when loading credentials!',
          });
          reject(error);
        }
      );
    });
  }

  /**
   * To update the Auto CR Config
   */
  updateCrConfig() {
    if (!this.serviceForm.get('shouldCreateCr').valid) return;
    const crConfig = { ...this.autoCreateCrConfig };
    crConfig['SHOULD_AUTO_CREATE_CR'] =
      this.serviceForm.get('shouldCreateCr').value;
    this.showSpinner = true;
    this.controllerService
      .updateAutoCrCreateConfig(
        this.selectedCustomer['id'],
        this.service['id'],
        crConfig
      )
      .subscribe(
        (config) => {
          this.autoCreateCrConfig = config;
          this.showSpinner = false;
        },
        (error) => {
          console.log(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Unable to update Auto CR Config!',
          });
          this.showSpinner = false;
        }
      );
  }

  /**
   * Generate form group for customer admin ui
   */
  public generateFormGroup(): void {
    this.form = this.fb.group({
      id: new FormControl('', Validators.required),
      name: new FormControl('', Validators.required),
      service: new FormControl('', null),
      // leamName: new FormControl('', Validators.required),
      bcName: new FormControl('', null),
      bcCompanyId: new FormControl('', null),
      crWebId: new FormControl(null, null),
      msimEmail: new FormControl('', null),
      grua: new FormControl('', null),
      active: new FormControl('', Validators.required),
    });
  }

  onOrchestratorChanged(orch) {
    this.serviceForm.get('configYaml').setValue(orch.configYaml);
  }

  public onSaveConfig() {
    const {orchestrator, configYaml} = this.serviceForm.value;
    if(!orchestrator) return null;
    this.showSpinner = true;
    this.controllerService.saveOrchestratorConfig(orchestrator.id, {configYaml})
      .pipe(finalize(() => this.showSpinner = false))
      .subscribe(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Service Message',
          detail: 'Orchestrator yaml config successfully saved!',
        });
      }, error => {
        console.log(error);
      })
  }

  /**
   * Change status of spinner
   * @params event
   */
  public spinnerChange(event) {
    this.showSpinner = event;
  }

  public closeValidationModal() {
    this.validationModal = false;
  }
  public continue() {
    this.validationModal = false;
    this.modalVisible = false;
  }
}
