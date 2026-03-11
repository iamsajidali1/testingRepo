import { Component, OnInit } from '@angular/core';
import { SelectItem, TreeNode, ConfirmationService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { ControllerService } from '../services/controller.service';
import { TabButtonServiceService } from '../services/tab-button-service.service';
import { formTemplateSchema } from '../models/formTemplateModel';
import { MessageService } from 'primeng/api';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AddActionModalComponent } from '../add-action-modal/add-action-modal.component';
import { debounceTime, } from 'rxjs/operators';
import { ConstanstSettings } from '../constant'

@Component({
  selector: "app-tab-view",
  templateUrl: "./tab-view.component.html",
  styleUrls: ["./tab-view.component.scss"],
})
export class TabViewComponent implements OnInit {
  templatesArray: SelectItem[] = [];
  formGroupProperties: any = {};
  listOfFormTemplates: any[] = [];
  indexOfSelectedTemp: string;
  customerId: string = "";
  customerName: string = "";
  selectedFormTemplate: any = {};
  selectedActionName: string = "";
  selectedTab: string = "";
  numbersOfNewTemplate: number = 1;
  contractid = "";
  isDisabled = true;
  files: TreeNode[];
  cachedFiles: TreeNode[] = [];
  selectedFiles: TreeNode;
  showSpinner: boolean = false;
  showSpinnerAfterChange: boolean = false;
  dataForPermissionManager: any = {};
  template = {
    name: "",
    carcheTemplate: {},
    contractid: "",
    questions: [],
    customer: {},
    customerName: "",
    customerID: "",
    validation: "",
    description: "",
    service_flag: {},
    service_workflow: {},
    staticHostname: {},
    staticHostnameCheckBox: false,
    maxRollbackTimer: 0,
    minRollbackTimer: 0
  };
  index: number = 0;
  workflowAttributes = {
    validation: { attributId: 1, value: true, required: false },
    form: { attributId: 2, value: true, required: false },
    hostname: { attributId: 3, value: true, required: false },
    configurationTemplate: { attributId: 4, value: true, required: false }
  }
  formCheck = false;
  validationCheck = true;
  templateId: Number;
  selectedCustomer = { customerName: "", customerId: 0 }
  copyTemplateDialogVisible: boolean = false;
  copiedTemplateName: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private messageService: MessageService,
    private controllerService: ControllerService,
    private tabService: TabButtonServiceService,
    private modalService: NgbModal,
    private confirmationService: ConfirmationService,

  ) {
    const saveButtonClickedDebounced =
      this.tabService.saveButtonPushed$.pipe(debounceTime(ConstanstSettings.DEBOUCNE_LIMIT));


    saveButtonClickedDebounced.subscribe((index) => {
      if (this.formGroupProperties["valid"]) {
        if (
          this.workflowAttributes.form.required ||
          this.workflowAttributes.validation.required
        ) {
          if (
            this.workflowAttributes.form.required &&
            this.template["questions"].length == 0
          ) {
            this.formCheck = false;
            this.messageService.add({
              severity: "error",
              summary: "Form is required for this action!",
              detail: "Please update Form for this action in Form tab",
            });
          } else {
            this.formCheck = true;
          }
          if (
            this.workflowAttributes.validation.required &&
            (this.template["validation"] == null ||
              this.template["validation"] == "")
          ) {
            this.validationCheck = false;
            this.messageService.add({
              severity: "error",
              summary: "Validation is required for this action!",
              detail:
                "Please update Validation for this action in Validation tab",
            });
          } else {
            this.validationCheck = true;
          }
          if (this.formCheck && this.validationCheck) {
            this.showSpinner = true;
            this.updateActionTemplate();
          }
        } else {
          this.showSpinner = true;
          this.updateActionTemplate();
        }
      }
    });
    const customerChangeButtonClickedDebounced =
      this.tabService.customerChanged$.pipe(debounceTime(ConstanstSettings.DEBOUCNE_LIMIT));

    customerChangeButtonClickedDebounced.subscribe((customer) => {
      this.showSpinnerAfterChange = true;
      this.getSelectedCustomerFromQuery();
    });
  }

  ngOnInit() {
    this.loadNodeTree();
  }

  /**
   * Open modal for create template
   */
  public openModal(): void {
    const modal = this.modalService.open(AddActionModalComponent, {
      size: "lg",
    });
    modal.result.then(
      (result) => {
        this.updateTreeNodeStructure(result);
      },
      () => {
        this.messageService.add({
          severity: "info",
          summary: "Rejected",
          detail: "You have rejected",
        });
      }
    );
  }

  /**
   * Load tree node structure for hierarchy left menu if customer is selected
   */
  public selectActionsByCustomer(): void {
    this.selectedActionName = "";
    Object.assign(this.cachedFiles, this.files);
    let filteredCustomer = this.cachedFiles[0]["children"].find(
      (customer) => customer["data"]["id"] == this.customerId
    );
    if (filteredCustomer) {
      this.files[0] = filteredCustomer;
    } else {
      this.files[0] = this.cachedFiles[0];
    }
    this.showSpinnerAfterChange = false;
  }

  /**
   * Load customer id and name from query
   */
  public getSelectedCustomerFromQuery(): void {
    this.activatedRoute.queryParams.subscribe((queryParams) => {
      if (queryParams["customerName"] && queryParams["customerId"]) {
        this.customerName = atob(queryParams["customerName"]);
        this.customerId = atob(queryParams["customerId"]);
        this.selectActionsByCustomer();
      } else {
        this.showSpinnerAfterChange = false;
      }
    });
  }

  onTabChange(event) {
    this.selectedTab = event.index;
  }

  /**
   * Update action template
   */
  private updateActionTemplate(): void {
    Object.assign(this.cachedFiles, this.files);
    let customerId = null;
    let customerName = null;
    if (this.template["customer"]) {
      customerId = this.template["customer"]["id"];
      customerName = this.template["customer"]["name"];
      this.customerId = this.template["customer"]["id"];
      this.customerName = this.template["customer"]["name"];
    }
    if (this.template["validation"] == "") {
      this.template["validation"] = "sh ip int brief";
    }
    if (this.formGroupProperties.get("staticHostname").value) {
      this.formGroupProperties.get("staticHostname").value["HOSTNAME"] = this.formGroupProperties.get("staticHostname").value["HOSTNAME"].trim();
    }
    this.controllerService
      .updateActionTemplate(
        new formTemplateSchema(
          this.formGroupProperties.get("name").value,
          this.template["questions"],
          this.template["validation"],
          this.formGroupProperties.get("description").value,
          this.formGroupProperties.get("staticHostnameCheckBox").value,
          JSON.stringify(this.formGroupProperties.get("confTemplate").value),
          this.formGroupProperties.get("staticHostname").value,
          this.formGroupProperties.get("apiEndpoint").value,
          this.formGroupProperties.get("enabled").value,
          this.template["minRollbackTimer"],
          this.template["maxRollbackTimer"],
          this.template["id"]
        ),
        this.formGroupProperties.get("services").value,
        this.formGroupProperties.get("service_workflow").value["ID"],
        this.formGroupProperties.get("vendorType").value["id"],
        customerId
      )
      .subscribe(
        (result) => {
          this.showSpinner = false;
          this.messageService.add({
            severity: "success",
            summary: "Your action is updated!",
            detail: result["message"],
          });
          this.refreshList({
            id: this.template["id"],
            name: this.formGroupProperties.get("name").value,
            services: this.formGroupProperties.get("services").value,
            customerId: customerId,
            customerName: customerName,
            enabled: this.formGroupProperties.get("enabled").value
          });
          this.formGroupProperties.reset();
          this.index = 0;
          //this.generateFormControls();
        },
        (error) => {
          this.showSpinner = false;
          this.messageService.add({
            severity: "error",
            summary: "Error!",
            detail: "Your action is not updated!",
          });
        }
      );
  }

  clear() {
    this.tabService.annoucneClearContent(this.selectedTab);
  }

  preview() {
    this.tabService.annoucnePreviewContent(this.selectedTab);
  }

  delete() {
    this.deleteConfirmModalTemplate();
  }
  /**
   * Display modal with message and confirmation button for deleting template
   */
  public deleteConfirmModalTemplate(): void {
    this.confirmationService.confirm({
      message:
        "Are you sure that you want to delete " +
        this.selectedFormTemplate.name +
        " action template?",
      header: "Delete confirmation",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this.showSpinner = true;
        this.deleteTemplate(this.selectedFormTemplate["id"]);
      },
      reject: () => {
        this.messageService.add({
          severity: "info",
          summary: "Rejected",
          detail: "You have rejected",
        });
      },
    });
  }

  /**
   * Delete form template
   */
  private deleteTemplate(id: string): void {
    this.controllerService.deleteActionTemplate(id).subscribe(
      (result) => {
        this.tabService.announceDeleteTemplate();
        this.inicializedTemplate();
        this.selectedFormTemplate = {};
        this.selectedActionName = "";
        this.isDisabled = true;
        this.loadNodeTree();
        this.messageService.add({
          severity: "success",
          summary: "Deleted!",
          detail:
            "Your template " + this.template.name + " is succesfully deleted!",
        });
      },
      (error) => {
        this.showSpinner = false;
        this.messageService.add({
          severity: "error",
          summary: "Error!",
          detail: "Your template " + this.template.name + " is not deleted!",
        });
      }
    );
  }

  save() {
    this.tabService.annoucneSaveContent(this.selectedTab);
    this.loadTemplate(this.template["id"]);
    this.isDisabled = false;
  }

  refreshList(event) {
    this.loadNodeTree();
    this.inicializedTemplate();
    // this.updateTreenodeAfterAction(event);
  }

  checkValidityOfFormProperties(event) {
    this.formGroupProperties = event;
  }

  inicializedTemplate() {
    this.template = {
      name: "",
      carcheTemplate: {},
      contractid: "",
      questions: [],
      customer: {},
      customerName: "",
      customerID: "",
      validation: "",
      description: "",
      service_flag: {},
      service_workflow: {},
      staticHostname: {},
      staticHostnameCheckBox: false,
      maxRollbackTimer: 0,
      minRollbackTimer: 0
    };
  }

  /**
   * Open selected template on hierachy left menu
   * @param event
   */
  public nodeSelect(event): void {
    this.templateId = event.node.data.id;
    if (event['node']['data']['type'] == "action") {
      this.dataForPermissionManager = {
        customerId: event['node']['parent']['parent']['data']['id'],
        serviceId: event['node']['parent']['data']['id']
      };
      this.showSpinner = true;
      this.isDisabled = false;
      this.inicializedTemplate();
      this.selectedActionName = event["node"]["label"];
      this.controllerService
        .getFormTemplateById(event["node"]["data"]["id"])
        .subscribe(
          (result) => {
            this.selectedFormTemplate = result["result"];
            this.template = result["result"];
            this.controllerService
              .loadActionTypeForActionTemplate(this.template["id"])
              .subscribe((workflow) => {
                this.controllerService.getAttributesForWorkflow(workflow["result"]["ID"]).subscribe((attributes) => {
                  attributes.forEach((attribute) => {
                    if (attribute["id"] == this.workflowAttributes.validation.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
                      this.workflowAttributes.validation.value = true;
                      this.workflowAttributes.validation.required = false;
                      if (attribute["status"] == "required") {
                        this.workflowAttributes.validation.required = true;
                      }
                    } else if (attribute["id"] == this.workflowAttributes.validation.attributId) {
                      this.workflowAttributes.validation.value = false;
                    }
                    if (attribute["id"] == this.workflowAttributes.hostname.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
                      this.workflowAttributes.hostname.value = true;
                      this.workflowAttributes.hostname.required = false;
                      if (attribute["status"] == "required") {
                        this.workflowAttributes.hostname.required = true;
                      }
                    } else if (attribute["id"] == this.workflowAttributes.hostname.attributId) {
                      this.workflowAttributes.hostname.value = false;
                    }
                    if (attribute["id"] == this.workflowAttributes.form.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
                      this.workflowAttributes.form.value = true;
                      this.workflowAttributes.form.required = false;
                      if (attribute["status"] == "required") {
                        this.workflowAttributes.form.required = true;
                      }
                    } else if (attribute["id"] == this.workflowAttributes.form.attributId) {
                      this.workflowAttributes.form.value = false;
                    }
                    if (attribute["id"] == this.workflowAttributes.configurationTemplate.attributId && (attribute["status"] == "required" || attribute["status"] == "optional")) {
                      this.workflowAttributes.configurationTemplate.value = true;
                      this.workflowAttributes.configurationTemplate.required = false;
                      if (attribute["status"] == "required") {
                        this.workflowAttributes.configurationTemplate.required = true;
                      }
                    } else if (attribute["id"] == this.workflowAttributes.configurationTemplate.attributId) {
                      this.workflowAttributes.configurationTemplate.value = false;
                    }
                  });
                  if (attributes.length == 0) {
                    this.workflowAttributes.configurationTemplate.required = false;
                    this.workflowAttributes.configurationTemplate.value = true;
                    this.workflowAttributes.form.required = false;
                    this.workflowAttributes.form.value = true;
                    this.workflowAttributes.validation.required = false;
                    this.workflowAttributes.validation.value = true;
                    this.workflowAttributes.hostname.required = false;
                    this.workflowAttributes.hostname.value = false;
                  }
                });
              });

            if (event["node"]["parent"]) {
              if (event["node"]["parent"]["parent"]) {
                this.template["customer"] = {
                  id: event["node"]["parent"]["parent"]["data"]["id"],
                  name: event["node"]["parent"]["parent"]["label"],
                };
              }
            }
            this.showSpinner = false;
          },
          (error) => {
            this.showSpinner = false;
          }
        );
    }
  }

  /**
   * Load tree node structure for left hierarchi menu
   */
  private loadNodeTree() {
    this.showSpinner = true;
    const cachedFileString = JSON.stringify(this.decycle(this.cachedFiles));
    this.controllerService.loadTreeNodeForActions(cachedFileString).subscribe(
      (treeNode) => {
        Object.assign(this.cachedFiles, treeNode);
        this.files = treeNode;
        this.showSpinner = false;
        this.getSelectedCustomerFromQuery();
      },
      (error) => {
        this.showSpinner = false;
      }
    );
  }

  /**
   *
   * removig cycles in object
   */

  private decycle(obj, stack = []) {
    if (!obj || typeof obj !== 'object')
      return obj;

    if (stack.includes(obj))
      return null;

    let s = stack.concat([obj]);

    return Array.isArray(obj)
      ? obj.map(x => this.decycle(x, s))
      : Object.fromEntries(
        Object.entries(obj)
          .map(([k, v]) => [k, this.decycle(v, s)]));
  }

  //




  /**
   * Add new action which is created to tree node strucutre for displaying in left menu
   * @param data - data object must contains created action object, customerId and services
   */
  private updateTreeNodeStructure(data) {
    if (data["customerId"]) {
      this.files[0].expanded = true;
      // condition for check if customer is selected and on query
      if (this.files[0]["data"] == "Customers Folder") {
        // customer is not selected
        const filteredCustomer = this.files[0]["children"].find(
          (customer) => customer["data"]["id"] == data["customerId"]
        );
        // codition for check if customer not exist in tree node structure
        if (filteredCustomer && filteredCustomer["data"]["id"]) {
          // if customer exist in tree node structure
          filteredCustomer.expanded = true;
          this.updateTreeNodeStructureForService(
            data,
            filteredCustomer["children"],
            filteredCustomer["label"]
          );
        } else {
          // if customer not exist in tree node structure
          // add customer to strucutre
          this.files[0]["children"].push({
            label: data["customerName"],
            key: data["customerName"] + "-" + data["customerId"],
            data: { id: data["customerId"], type: "customer" },
            children: []
          });
          const addedCustomer = this.files[0]["children"].find(
            (customer) => customer["data"]["id"] == data["customerId"]
          );
          addedCustomer.expanded = true;
          this.updateTreeNodeStructureForService(
            data,
            addedCustomer["children"],
            data["customerName"]
          );
        }
      } else {
        // customer is selected
        this.updateTreeNodeStructureForService(
          data,
          this.files[0]["children"],
          this.files[0]["label"]
        );
      }
    } else {
      this.files[1].expanded = true;
      this.updateTreeNodeStructureForService(data, this.files[1]["children"]);
    }
  }

  /**
   * Add new action for service which is created to tree node strucutre for displaying in left menu
   * @param data - data object must contains created action object and services
   * @param treeNodeChildrens - treen node strucutre (services)
   * @param customerName - String (Optional)
   */
  private updateTreeNodeStructureForService(
    data,
    treeNodeChildrens,
    customerName?: string
  ) {
    data["services"].forEach((service) => {
      const filteredService = treeNodeChildrens.find(
        (ser) => ser["data"]["id"] == service["id"]
      );
      // codition for check if service not exist in tree node structure
      if (filteredService && filteredService["data"]["id"]) {
        // if service exist in tree node structure
        filteredService.expanded = true;
        // adding new action to structure for specifi service or/and customer
        filteredService["children"].push({
          label: data["name"],
          key: data["customerId"] + "-" + service["id"] + "-" + data["id"],
          data: { id: data["id"], type: "action" },
          leaf: 1,
        });
      } else {
        // if service not exist in tree node structure
        this.pushService(treeNodeChildrens, service, data, customerName);
      }
    });
  }

  /**
   * Update tree node structure adter action tempalte si updated
   */
  private updateTreenodeAfterAction(data): void {
    let baseStrucutre;
    if (data["customerId"]) {
      //TODO check when customer is selected on dorpdown
      if (this.customerName != "" && this.customerId != "") {
        baseStrucutre = this.files[0]["children"];
      } else {
        baseStrucutre = this.files[0]["children"].find(
          (customer) => customer["data"]["id"] == data["customerId"]
        )["children"];
      }
    } else {
      baseStrucutre = this.files[1]["children"];
    }
    baseStrucutre.forEach((searchService) => {
      let filteredService = data["services"].find(
        (service) => service["id"] == searchService["data"]["id"]
      );
      if (filteredService) {
        let filteredActionTemplate = searchService["children"].find(
          (actionTemplate) => actionTemplate["data"]["id"] == data["id"]
        );
        if (filteredActionTemplate) {
          filteredActionTemplate["label"] = data["name"];
        } else {
          if (data["customerId"]) {
            searchService["children"].push({
              label: data["name"],
              key:
                data["customerId"] +
                "-" +
                searchService["data"]["id"] +
                "-" +
                data["id"],
              data: { id: data["id"], type: "action" },
              leaf: 1,
            });
          } else {
            searchService["children"].push({
              label: data["name"],
              key:
                data["name"] +
                "-" +
                searchService["data"]["id"] +
                "-" +
                data["id"],
              data: { id: data["id"], type: "action" },
              leaf: 1,
            });
          }
        }
        const checkService = (service) =>
          service["id"] == filteredService["id"];
        const index = data["services"].findIndex(checkService);
        data["services"].splice(index, 1);
      } else {
        if (searchService["children"].length > 1) {
          let filteredActionTemplate = searchService["children"].find(
            (actionTemplate) => actionTemplate["data"]["id"] == data["id"]
          );
          const checkActionTemplate = (id) =>
            id == filteredActionTemplate["data"]["id"];
          const actionTemplateIndex = searchService["children"].findIndex(
            checkActionTemplate
          );
          searchService["children"].splice(actionTemplateIndex, 1);
        } else {
          const checkService = (id) => id == searchService["data"]["id"];
          const index = baseStrucutre.findIndex(checkService);
          baseStrucutre.splice(index, 1);
        }
      }
    });
    data["services"].forEach((service) => {
      this.pushService(baseStrucutre, service, data, data["customerName"]);
    });
    Object.assign(this.cachedFiles, this.files);
  }

  /**
   * Push service and template to specifi strucutre
   */
  private pushService(
    treeNodeStrucutre,
    service,
    data,
    customerName?: string
  ): void {
    if (customerName) {
      // customerId and customerName is provided
      treeNodeStrucutre.push({
        label: service["serviceName"],
        key: customerName + "-" + service["name"] + "-" + service["id"],
        data: { id: service["id"], type: "service" },
        expanded: true,
        // adding new action to structure for specifi service and customer
        children: [
          {
            label: data["name"],
            key: data["customerId"] + "-" + service["id"] + "-" + data["id"],
            data: { id: data["id"], type: "action" },
            leaf: 1,
          },
        ],
      });
    } else {
      // customerId and customerName is not provided
      treeNodeStrucutre.push({
        label: service["serviceName"],
        key: service["name"] + "-" + service["id"],
        data: { id: service["id"], type: "service" },
        expanded: true,
        // adding new action to structure for specifi service
        children: [
          {
            label: data["name"],
            key: data["name"] + "-" + service["id"] + "-" + data["id"],
            data: { id: data["id"], type: "action" },
            leaf: 1,
          },
        ],
      });
    }
  }
  public checkWorkflowAttributes(event) {
    this.workflowAttributes = event;
  }

  public loadTemplate(templateId){
    this.controllerService
    .getFormTemplateById(templateId)
    .subscribe(
      (result) => {
        this.template = result["result"]
        this.template["customer"] = {
          id: this.customerId,
          name: this.customerName
        };
      });
    }

  public copyOfTemplate() {
    Object.assign(this.cachedFiles, this.files);
    this.showSpinner = true;
    const customerId = this.template["customer"]["id"];
    const customerName = this.template["customer"]["name"];
    this.controllerService.createActionTemplate(
      new formTemplateSchema(
        this.copiedTemplateName,
        this.template["questions"],
        this.template["validation"],
        this.formGroupProperties.get("description").value,
        this.formGroupProperties.get("staticHostnameCheckBox").value,
        JSON.stringify(this.formGroupProperties.get("confTemplate").value),
        this.formGroupProperties.get("staticHostname").value,
        this.formGroupProperties.get("apiEndpoint").value,
        this.formGroupProperties.get("enabled").value,
        10,
        120,
        this.template["id"]
      ),
      this.formGroupProperties.get("services").value,
      this.formGroupProperties.get("service_workflow").value["ID"],
      this.formGroupProperties.get("vendorType").value["id"],
      customerId
    ).subscribe(result => {
      this.copyTemplateDialogVisible = false;
      this.refreshList({
        id: this.template["id"],
        name: this.formGroupProperties.get("name").value,
        services: this.formGroupProperties.get("services").value,
        customerId: customerId,
        customerName: customerName,
        enabled: this.formGroupProperties.get("enabled").value
      });
      this.showSpinner = false;
      this.messageService.add({
        severity: "success",
        summary: "You succesfully copied action!",
      });
      this.copiedTemplateName=""
    });

  }

  public showCopyTemplateDialog(){
    this.copyTemplateDialogVisible = true;
  }

  public closeDialog(){
    this.copyTemplateDialogVisible = false;
  }
}
