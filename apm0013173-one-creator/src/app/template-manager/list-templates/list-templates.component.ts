import { Component, OnInit, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Template, ICarcheTemplate } from '../models/template';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { AddTemplateComponent } from '../add-template/add-template.component';
import { MessageService, TreeNode } from 'primeng/api';
import {ActivatedRoute, ParamMap, Router} from '@angular/router';
import { NodeListService } from '../../services/node-list.service';
import {ControllerService} from '../../services/controller.service';
import {tap} from 'rxjs/operators';

@Component({
  selector: 'app-list-templates',
  templateUrl: './list-templates.component.html',
  styleUrls: ['./list-templates.component.scss']
})

export class ListTemplatesComponent implements OnInit, OnChanges {
  @Input() refresh = '';
  @Input() contractid = '';
  @Input() deletedTemplate: { [x: string]: any; };
  @Input() copiedTemplate: any;
  @Output() eventEmitter = new EventEmitter<ICarcheTemplate>();
  @Output() eventSpinner = new EventEmitter<boolean>();
  treeLoading: boolean;
  selectedTemplate: Template;
  listOfTemplates: Template[];
  alertShow: boolean;
  alertText: string;
  indexOfSelectedTemp: string;
  customerId: string;
  selectedTemplateName = '';
  templateTreeNodes: TreeNode[];
  originalTemplateTreeNodes: TreeNode[];
  selectedTemplateId: string;
  selectedTemplateTreeNode: TreeNode | any;
  others = 'others';

  constructor(
              private router: Router,
              private modalService: NgbModal,
              private messageService: MessageService,
              private activatedRoute: ActivatedRoute,
              private nodeListService: NodeListService,
              private controllerService: ControllerService
            ) {
    // Subscribe for the Route Change
    this.activatedRoute.queryParamMap.subscribe((paramMap: ParamMap) => {
      // const templateId = paramMap.get('templateId');
      this.selectedTemplateId = paramMap.get('templateId')
      const reloadTree = paramMap.get('reloadTree');
      if(reloadTree) {
        this.getBaseNodes();
      }
    });
  }

  ngOnInit() {
    this.getBaseNodes();
  }

  ngOnChanges() {
    if (this.refresh !== '') {
      this.handleRefresh();
    }
    if (this.deletedTemplate) {
      this.handleDeletedTemplate(); 
    }
    if(this.copiedTemplate){
      this.updateTree(this.copiedTemplate);
    }
  }

  private handleRefresh(): void {
    this.selectedTemplate = new Template();
    this.indexOfSelectedTemp = undefined;
    this.getSelectedCustomerIdFromQueryAndListOfTemplates();
  }

  private handleDeletedTemplate(): void {
    this.selectedTemplateName = '';
    const service = this.getServiceForDeletedTemplate();
    if (!this.deletedTemplate['templateOldId']) {
      this.removeTemplateFromNodeTreeModel(this.deletedTemplate['contractid'], service, this.deletedTemplate['id']);
    } else {
      this.traverseTemplateTreeForDeletion();
    }
  }

  private getServiceForDeletedTemplate(): string {
    if (this.deletedTemplate['service']) {
      return this.deletedTemplate['service'];
    }
    if (this.deletedTemplate['contractid'] && !this.deletedTemplate['service']) {
      return this.others;
    }
    return '';
  }

  private traverseTemplateTreeForDeletion(): void {
    if (this.templateTreeNodes.length > 0) {
      // tslint:disable-next-line:prefer-for-of
      for (let i = 0; i < this.templateTreeNodes.length; i++) {
        this.treeTraverse(this.templateTreeNodes[i], this.deletedTemplate['templateOldId'], this.deletedTemplate['id']);
      }
    }

  }

  private treeTraverse(node: TreeNode, oldKey: any, newKey: any) {
    if (node.children) {
      node.children.forEach(childNode => {
        if (childNode['key'] && childNode['leaf']) {
          if (childNode['key'] === oldKey) {
            childNode['key'] = newKey;
          }
        }
        this.treeTraverse(childNode, oldKey, newKey);
      });
    }
  }


  /**
   * Get customer id from query when is customer selected on navbar menu dropdown
   */
  public getSelectedCustomerIdFromQueryAndListOfTemplates(): void {
    this.activatedRoute.queryParams.subscribe(queryParams => {
      if (queryParams['customerId']) {
        this.customerId = atob(queryParams['customerId']);
        this.generateTreeBasedOnCustomer(this.customerId);
      } else {
        this.templateTreeNodes = this.originalTemplateTreeNodes;
      }
    });
  }

  /**
   * Generate tree node structure when is customer selected on navbar menu dropdown
   * @params customerId
   */
  public generateTreeBasedOnCustomer(customerId: string): void {
    const customerIdNumber = Number(customerId);
    const customerNode: TreeNode[] = [];
    customerNode[0] = this.generateMainNode('Customers');
    this.originalTemplateTreeNodes[0]['children'].forEach(customer => {
      if (customer['id'] === customerIdNumber) {
        customerNode[0]['children'].push(customer);
      }
    });

    this.getGeneralServiceNodesByCustomerService(this.originalTemplateTreeNodes[1]['children'], customerId, customerNode);
    // this.files = temporaryObject;

  }

  /**
   * Load customer services by external customer id
   */

  private getGeneralServiceNodesByCustomerService(treeNode: TreeNode[], customerId: string, customerNode: TreeNode[]): void {
    this.templateTreeNodes = [];
    const servicesNode: TreeNode[] = [];
    servicesNode[0] = this.generateMainNode('Services');
    const servicesForCustomer = [];
    this.eventSpinner.emit(true);
    this.controllerService.getServiceToCustomerById(customerId).subscribe(custServices => {
      this.eventSpinner.emit(false);
      if (custServices['services'] && custServices['services'].length > 0) {
        custServices['services'].map((custService: { [x: string]: any; }) => {
          treeNode.forEach(service => {
            if (service['key'] === custService['serviceName'] && service['id'] === custService['id']) {
              servicesForCustomer.push(service);
            }
          });
        });
      }
      if (servicesForCustomer.length > 0) {
        servicesNode[0]['children'] = servicesForCustomer
      }
      this.templateTreeNodes = [...customerNode, ...servicesNode];
    });

  }

  /**
   * Open selected template on hierarchy left menu
   * @params event
   */
  public nodeSelect(): void {
    if (this.selectedTemplateTreeNode.leaf) {
      const carcheTemp = {
        contractid: this.selectedTemplateTreeNode['customer'] ? this.selectedTemplateTreeNode['customer'] : null,
        service: this.selectedTemplateTreeNode['service'] ? this.selectedTemplateTreeNode['service'] : null,
        name: this.selectedTemplateTreeNode.data,
        id: this.selectedTemplateTreeNode.key
      };
      this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: { templateId: carcheTemp.id, reloadTree: null},
          queryParamsHandling: 'merge' // remove to replace all query params by provided
        }
      ).then()
      this.openTemplate(carcheTemp);
    }
  }

  /**
   * Load nodes for tree node structure left menu
   */
  public getBaseNodes(): void {
    this.treeLoading = true;
    this.originalTemplateTreeNodes = [];
    this.nodeListService.getBasicNodes()
      .pipe(tap(() => this.treeLoading = false))
      .subscribe(result => {
        this.eventSpinner.emit(false);
        this.originalTemplateTreeNodes = result;
        this.getSelectedCustomerIdFromQueryAndListOfTemplates();
        if(this.selectedTemplateId) {
          this.findTreeNodeBy(this.selectedTemplateId, this.templateTreeNodes);
          // this.expandNodesTillSelection(this.templateTreeNodes);
        }
      }, error => {
        console.error(error)
        this.eventSpinner.emit(false);
        this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Error when loading templates!', sticky: true });
      });
  }

  /**
   * Find the node by templateId and the select it
   */
  findTreeNodeBy(templateId: any, treeNodes: any[]) {
    if(!treeNodes) return;
    treeNodes.forEach(treeNode => {
      const {key, children} = treeNode;
      if(typeof key === 'number' && key === Number(templateId)) {
        this.selectedTemplateTreeNode = treeNode;
        const { customer, service } = treeNode;
        customer ? this.expandTreeForCustomerAndService(customer, service) : this.expandTreeForService(service);
        this.nodeSelect();
      } else {
        this.findTreeNodeBy(templateId, children);
      }
    })
  }

  /**
   * Expands the tree for a specific customer and service.
   *
   * @params {string} customer - The ID of the customer.
   * @params {string} service - The ID of the service.
   */
  expandTreeForCustomerAndService(customer: string, service: string) {
    const [customerTreeNodes] = this.templateTreeNodes;
    customerTreeNodes.expanded = true;
    // Find out the customer Node
    const customerTreeNode = customerTreeNodes.children.find((node: any) => node.id === Number(customer));
    customerTreeNode.expanded = true;
    for (const serviceTreeNode of customerTreeNode.children as any[]) {
      // Find out the service Node
      if (serviceTreeNode.id === Number(service)) {
        serviceTreeNode.expanded = true;
      }
    }
  }

  /**
   * Expands the tree for a specific service.
   *
   * @params {string} service - The ID of the service.
   */
  expandTreeForService(service: string) {
    const [, serviceTreeNodes] = this.templateTreeNodes;
    serviceTreeNodes.expanded = true;
    for (const serviceTreeNode of serviceTreeNodes.children as any[]) {
      // Find out the service Node
      if (serviceTreeNode.id === Number(service)) {
        serviceTreeNode.expanded = true;
      }
    }
  }

  /**
   * Open selected template on template editor
   */
  public open(): void {
    this.selectedTemplateName = this.listOfTemplates[this.indexOfSelectedTemp as any as number]['name'];
    this.eventEmitter.emit(this.listOfTemplates[this.indexOfSelectedTemp as any as number]);
  }

  /**
   * Load name of selected template to left menu
   * @params template
   */
  public openTemplate(template: ICarcheTemplate): void {
    this.selectedTemplateName = template['name'];
    this.eventEmitter.emit(template);
  }

  /**
   * Add template to tree node structure
   */
  public addTemplate(): void {
    const modal = this.modalService.open(AddTemplateComponent, { size: 'lg' });
    modal.result.then((result) => {
        this.updateTree(result)
      },
      (reason) => {
        if (reason === ModalDismissReasons.ESC ||
          reason === ModalDismissReasons.BACKDROP_CLICK) {
        }
      });
  }

  public updateTree(template: { [x: string]: any; }) {
    let id = '';
    let serviceId = '';
    let other = {};
    if (template['contractid']) {
      id = '' + template['contractid']['id'];
    }
    if (template['service']) {
      serviceId = '' + template['service']['id'];
    }

    if (template['contractid'] && !template['service']) {
      // no service for leaf is defined if others
      other = {
        serviceName: this.others,
        id: this.others
      };

    }
    const children = {
      name: template['name'],
      id: template['id'],
      service: serviceId,
      contractid: id
    }

    const templateInTree = this.generateLeaf(children);
    if (template['name']) {
      this.eventSpinner.emit(false);
      this.addTemplateToNodeTreeModel(template['contractid'], template['service'] ? template['service'] : other, templateInTree);
      this.messageService.add({ severity: 'success', summary: 'Created!', detail: 'Your template is successfully created!' });
    } else {
      this.eventSpinner.emit(false);
      this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Your template is not created!', sticky: true });
    }
  }

  /**
   * add created template to customer or service tree node structure
   * @params selectedCustomer
   * @params selectedService
   * @params template
   */
  private addTemplateToNodeTreeModel(selectedCustomer: any, selectedService: any, template: any): void {
    if (!this.templateTreeNodes) {
      this.getBaseNodes();
    } else {
      this.addTemplateTreeNodeForNoneEmptyTree(selectedCustomer, selectedService, template);
    }
  }

  // TODO - get bc company id and name from the add template
  // MUST BE done if none existing node is added to be displayed

  private addTemplateTreeNodeForNoneEmptyTree(selectedCustomer: any, selectedService: any, template: any) {
    if (selectedCustomer) {
      if (!this.templateTreeNodes[0].expanded) {
        this.templateTreeNodes[0].expanded = true;
      }
      const selectedCustomerNode = this.templateTreeNodes[0]['children'].filter(node => {
        return node['key'] === selectedCustomer['name'] && node['id'] === selectedCustomer['id']
      });
      if (!(selectedCustomerNode && selectedCustomerNode.length > 0)) {
        // generated base node and the children to it
        const generatedNewCustomer = this.generateCustomerNode({
          name: selectedCustomer['name'],
          id: selectedCustomer['id'],
          bcName: selectedCustomer['bcName'],
          bcCompanyId: selectedCustomer['bcCompanyId']
        });
        this.templateTreeNodes[0]['children'].push(generatedNewCustomer);
      }

      this.templateTreeNodes[0]['children'].forEach(customer => {
        if (customer['key'] === selectedCustomer['name'] && customer['id'] === selectedCustomer['id']) {
          customer.expanded = true;
          this.addTemplateNodeTreeService(customer['children'], selectedService, template, selectedCustomer['id']);
        }
      });
    }
    if (selectedService && !selectedCustomer) {
      if (!this.templateTreeNodes[1].expanded) {
        this.templateTreeNodes[1].expanded = true;
      }
      this.addTemplateNodeTreeService(this.templateTreeNodes[1]['children'], selectedService, template, '');
    }
    /* else if (this.customerId) {
      this.addTemplateNodeTreeService(this.files, selectedService, template);
    }*/
  }



  /**
   * Add new created template to tree node structure of left menu for selected service
   * @params treeNode
   * @params selectedService
   * @params template
   * @params customerId
   */
  private addTemplateNodeTreeService(treeNode: any, selectedService: any, template: any, customerId: any) {
    const selectedServiceByNode = treeNode.filter((node: any) => {
      return node['key'] === selectedService['serviceName'] && node['id'] === selectedService['id']
    });
    if (!(selectedServiceByNode && selectedServiceByNode.length > 0)) {
      // generated base node and the children to it
      const generatedNewService = this.generateServiceNode({
        name: selectedService['serviceName'], id: selectedService['id']
      }, customerId);
      treeNode.push(generatedNewService);
    }
    treeNode.forEach((service: any) => {
      if (service['key'] === selectedService['serviceName'] && service['id'] === selectedService['id']) {
        service.expanded = true;
        template['parent'] = service;
        service['children'].push(template);
      }
    });

  }


  /**
   * Remove selected template from tree node structure
   * @params customerId
   * @params serviceId
   * @params id
   */
  private removeTemplateFromNodeTreeModel(customerId: any, serviceId: any, id: any): void {
    if (customerId) {
      this.templateTreeNodes[0]['children'].forEach(customer => {
        if (customer['id'] === customerId) {
          this.removeTemplateNodeTreeService(customer['children'], serviceId, id);
          if (customer['children'].length === 0) {
            for (let i = 0; i < this.templateTreeNodes[0]['children'].length; i++) {
              if (customer['id'] === this.templateTreeNodes[0]['children'][i]['id']) {
                this.templateTreeNodes[0]['children'].splice(i, 1);
              }
            }
          }
        }

      });
    }
    if (serviceId && !customerId) {
      this.removeTemplateNodeTreeService(this.templateTreeNodes[1]['children'], serviceId, id);
    }
    /* else if (this.customerId) {
      this.removeTemplateNodeTreeService(this.files, serviceId, id);
    }*/
  }

  /**
   * Remove selected template from service tree node structure
   * @params treeNode
   * @params serviceId
   * @params templateName
   */
  private removeTemplateNodeTreeService(treeNode: any, serviceId: any, id: any) {
    treeNode.forEach((service: any) => {
      if (service['id'] === serviceId) {
        const index = this.getIndex(service['children'], id);
        service['children'].splice(index, 1);
        this.deletedTemplate = undefined;
        if (service['children'].length === 0) {
          // check all services and remove the one which does not have any templates
          for (let i = 0; i < treeNode.length; i++) {
            if (service['id'] === treeNode[i]['id']) {
              treeNode.splice(i, 1);
            }
          }
        }
      }
    });
  }

  /**
   * Get index of template in service children array
   * @params array
   * @params name
   */
  private getIndex(array: string | any[], name: any): number {
    if (array && array.length > 1) {
      for (let i = 0; i < array.length; i++) {
        if (array[i]['key'] === name) {
          return i;
        }
      }
    }
  }


  private generateLeaf(child: any) {
    return {
      label: child.name,
      key: child.id,
      icon: 'pi pi-file',
      data: child.name,
      service: child.service,
      leaf: 1,
      customer: child.contractid
    }
  }

  private generateMainNode(name: string) {
    return {
      label: name,
      key: name,
      level: 1,
      data: name + ' Folder',
      expandedIcon: 'pi pi-folder-open',
      collapsedIcon: 'pi pi-folder',
      children: []
    }

  }

  private generateServiceNode(service: any, customerId: any) {
    return {
      label: service.name,
      key: service.name,
      id: service.id,
      data: service.name,
      customerId,
      expandedIcon: 'pi pi-folder-open',
      collapsedIcon: 'pi pi-folder',
      children: []
    }

  }

  private generateCustomerNode(customer: any) {
    return {
      label: customer.name,
      key: customer.name,
      data: customer.name,
      id: customer.id,
      customerId: customer.id,
      bc_name: customer.bcName,
      bc_company_id: customer.bcCompanyId,
      expandedIcon: 'pi pi-folder-open',
      collapsedIcon: 'pi pi-folder',
      children: []
    }
  }
}

