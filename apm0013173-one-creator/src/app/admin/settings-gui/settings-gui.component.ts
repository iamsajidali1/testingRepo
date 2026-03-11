import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import {ControllerService} from '../../services/controller.service';

@Component({
  selector: "app-settings-gui",
  templateUrl: "./settings-gui.component.html",
  styleUrls: ["./settings-gui.component.css"],
  encapsulation: ViewEncapsulation.None,
})
export class SettingsGuiComponent implements OnInit {
  roles: any[];
  users: any[];
  credentials: any[];
  workflows: any[];
  workflowAttributes: any[];
  assignedAttributes: any[];
  syncRoles: boolean = false;
  syncUsers: boolean = false;
  save: boolean = false;
  title: string = "";
  modalVisible: boolean = false;
  form: FormGroup;
  formUsers: FormGroup;
  workflowAttributeForm: FormGroup;
  selectedWorkflow: any = null;
  showSpinner: boolean = false;
  statuses: any[] = [];
  userSaving: boolean = false;

  constructor(
    private messageService: MessageService,
    private controllerService: ControllerService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      credential: new FormControl("", Validators.required),
    });
    this.formUsers = this.fb.group({
      userName: new FormControl(null, Validators.required),
      bcUserId: new FormControl(null, Validators.required),
    });
    this.workflowAttributeForm = this.fb.group({
      attribute: new FormControl("", Validators.required),
      status: new FormControl("", Validators.required),
    });
    this.statuses = [
      {
        label: "optional",
        value: "optional",
      },
      {
        label: "required",
        value: "required",
      },
      {
        label: "hide",
        value: "hide",
      },
    ];
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
    this.loadAllCredentials();
    this.loadAllWorkflows();
    this.loadAllWorkflowAttributes();
  }

  // sync roles in DB with UPM
  public syncRolesWithUpm(): void {
    this.syncRoles = true;
    this.controllerService.syncRoles().subscribe(
      (result) => {
        this.syncRoles = false;
        this.messageService.add({
          severity: "success",
          summary: "Service Message",
          detail: "Roles successfully synchronized!",
        });
        this.loadRoles();
      },
      (error) => {
        this.syncRoles = false;
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error when synchronizing roles with UPM!",
        });
      }
    );
  }

  // sync users in DB with UPM
  public syncUsersWithUpm(): void {
    this.syncUsers = true;
    this.controllerService.syncUsers().subscribe(
      (result) => {
        this.syncUsers = false;
        this.messageService.add({
          severity: "success",
          summary: "Service Message",
          detail: "Users successfully synchronized!",
        });
        this.loadUsers();
      },
      (error) => {
        this.syncUsers = false;
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error when synchronizing users with UPM!",
        });
      }
    );
  }

  // load all avaliable roles from DB
  private loadRoles(): void {
    this.controllerService.getRoles().subscribe(
      (result) => {
        this.roles = result;
      },
      (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error when loading roles!",
        });
      }
    );
  }

  // load all avaliable users from DB
  private loadUsers(): void {
    this.controllerService.getExistingUsersFromDB().subscribe(
      (result) => {
        this.users = result;
      },
      (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error when loading users!",
        });
      }
    );
  }

  // load all avaliable mcap credentials from DB
  private loadAllCredentials(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.controllerService.loadAllMcapCredentials().subscribe(
        (credentials) => {
          this.credentials = credentials;
          resolve(resolve);
        },
        (error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: "Error when loading mcap credentials!",
          });
          reject(error);
        }
      );
    });
  }

  // create new mcap credential
  public saveCredential(): void {
    if (this.form.get("credential").valid) {
      this.save = true;
      this.controllerService
        .createMcapCredentials(this.form.get("credential").value)
        .subscribe(
          (result) => {
            this.loadAllCredentials();
            this.save = false;
            this.form.controls["credential"].reset();
            this.messageService.add({
              severity: "success",
              summary: "Service Message",
              detail: "Mcap credential successfully created!",
            });
          },
          (error) => {
            this.save = false;
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: "Error when creating mcap credentials!",
            });
          }
        );
    } else {
      this.form.controls["credential"].markAsDirty();
      this.form.controls["credential"].markAsTouched();
    }
  }

  // delete mcap credential
  public deleteCredential(credential): void {
    this.confirmationService.confirm({
      icon: "pi pi-exclamation-triangle",
      header: "Confirmation",
      message:
        'Are you sure that you want to delete "' +
        credential["credential"] +
        '" credential ?',
      accept: () => {
        if (credential && credential["id"]) {
          this.controllerService
            .deleteMcapCredentials(credential["id"])
            .subscribe(
              async (result) => {
                await this.loadAllCredentials();
                this.messageService.add({
                  severity: "success",
                  summary: "Service Message",
                  detail: "Mcap credential successfully deleted!",
                });
              },
              (error) => {
                this.messageService.add({
                  severity: "error",
                  summary: "Error",
                  detail: "Error when deleting mcap credentials!",
                });
              }
            );
        }
      },
    });
  }

  // Load all avaliable workflows
  private loadAllWorkflows(): void {
    this.controllerService.loadAllActionTypes().subscribe(
      (result) => {
        this.workflows = [];
        for (const workflow of result["result"]) {
          if (
            !this.workflows.find(
              (wf) => wf["workflow"]["ID"] == workflow["workflow"]["ID"]
            )
          ) {
            this.workflows.push(workflow);
          }
        }
      },
      (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error when loading action types!",
        });
      }
    );
  }

  // Load all avaliable workflows attributes
  private loadAllWorkflowAttributes(): void {
    this.controllerService.loadAllWorkflowAttributes().subscribe(
      (result) => {
        this.workflowAttributes = [];
        this.workflowAttributes = result;
      },
      (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error when loading action type attributes!",
        });
      }
    );
  }

  // load all attrbutes which is assigned to workflow
  private loadAssignedAttributesForWorkflow(workflowId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.controllerService
        .loadAssignedAttributesForWorkflow(workflowId)
        .subscribe(
          (result) => {
            this.assignedAttributes = result;
            resolve(resolve);
          },
          (error) => {
            this.showSpinner = false;
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: "Error when loading assigned attributes for action type!",
            });
            reject(error);
          }
        );
    });
  }

  // open modal and edit workflow attributes
  public async editWorkflowAttributes(workflow: any) {
    this.showSpinner = true;
    this.selectedWorkflow = workflow;
    this.title = workflow["workflow"]["NAME"];
    await this.loadAssignedAttributesForWorkflow(workflow["workflow"]["ID"]);
    this.modalVisible = true;
    this.showSpinner = false;
  }

  public closeDialog(): void {
    this.modalVisible = false;
    this.selectedWorkflow = null;
    this.workflowAttributeForm.get("attribute").reset();
    this.workflowAttributeForm.get("status").reset();
  }

  // delete assigned attribute for selected workflow
  public deleteAttribute(attribute: any): void {
    this.showSpinner = true;
    this.controllerService
      .deleteAttributeForWorkflow(
        this.selectedWorkflow["workflow"]["ID"],
        attribute["id"]
      )
      .subscribe(
        (result) => {
          const check = (attr) => attr["id"] == attribute["id"];
          const attributeIndex = this.assignedAttributes.findIndex(check);
          this.assignedAttributes.splice(attributeIndex, 1);
          this.showSpinner = false;
          this.messageService.add({
            severity: "success",
            summary: "Successfull",
            detail: "Attribute successfully deleted!",
          });
        },
        (error) => {
          this.showSpinner = false;
          this.messageService.add({
            severity: "error",
            summary: "Service Message",
            detail: "Error when deleting assigned attribute!",
          });
        }
      );
  }

  // assigne attribute to workflow with selected status
  public assigneAttribute(): void {
    if (
      this.workflowAttributeForm.get("attribute").valid &&
      this.workflowAttributeForm.get("status").valid
    ) {
      const attId = this.workflowAttributeForm.get("attribute").value["id"];
      if (!this.assignedAttributes.find((wfatt) => wfatt["id"] == attId)) {
        this.showSpinner = true;
        this.controllerService
          .assigneAttributeForWorkflow(
            this.selectedWorkflow["workflow"]["ID"],
            attId,
            this.workflowAttributeForm.get("status").value["value"]
          )
          .subscribe(
            (reuslt) => {
              this.assignedAttributes.push({
                id: attId,
                name: this.workflowAttributeForm.get("attribute").value["name"],
                status: this.workflowAttributeForm.get("status").value["value"],
              });
              this.workflowAttributeForm.get("attribute").reset();
              this.workflowAttributeForm.get("status").reset();
              this.showSpinner = false;
              this.messageService.add({
                severity: "success",
                summary: "Successfull created",
                detail: "Attribute successfully assigned!",
              });
            },
            (error) => {
              this.workflowAttributeForm.get("attribute").reset();
              this.workflowAttributeForm.get("status").reset();
              this.showSpinner = false;
              this.messageService.add({
                severity: "error",
                summary: "Service Message",
                detail: "Error when attribute assigning to action type!",
              });
            }
          );
      } else {
        this.messageService.add({
          severity: "error",
          summary: "Service Message",
          detail: "You can't add attribute which is already assigned!",
        });
      }
    } else {
      this.workflowAttributeForm.controls["attribute"].markAsDirty();
      this.workflowAttributeForm.controls["attribute"].markAsTouched();
      this.workflowAttributeForm.controls["status"].markAsDirty();
      this.workflowAttributeForm.controls["status"].markAsTouched();
    }
  }

  public createUser(): void {
    const user = {
      userName: this.formUsers.get("userName").value,
      bcUserId: this.formUsers.get("bcUserId").value,
    };
    this.formUsers.markAllAsTouched();
    if(this.formUsers.valid){
      this.userSaving = true;
    this.controllerService.createBcUser(user).subscribe((result) => {
      this.userSaving = false;
      this.messageService.add({
        severity: "success",
        summary: "Saved",
        detail: "User was successfuly saved",
      });
    }, error =>{
      this.userSaving = false;
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: error.error.message,
      });
    });
  }
}
}
