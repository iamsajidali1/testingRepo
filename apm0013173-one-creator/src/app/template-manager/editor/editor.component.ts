import { Component, Input, OnChanges, OnInit, Output, EventEmitter, OnDestroy} from '@angular/core';
import { Templatee } from '../models/templatee';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ApiConnectService } from '../api-connect.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { StringBuilder } from 'typescript-string-operations';
import { ContentType } from '../models/conf-template-models/content-type';
import { TemplateType } from '../models/conf-template-models/template-type';
import { VendorType } from '../models/conf-template-models/vendor-type';
import { Service } from '../models/serviceModel';
import { TemplateTypes } from '../models/enums/templateTypes'
import { ContentTypes } from '../models/enums/contentType'
import { ControllerService} from '../../services/controller.service';
import { Subscription} from 'rxjs';
import { IConfigTemplateRequest} from '../models/configTemplate';
import { ICarcheTemplate } from '../models/template';
import { ActivatedRoute, Router} from '@angular/router';
import { finalize} from 'rxjs/operators';

const JINJA_TEMPLATE_TYPE_ID = 2;

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements OnChanges, OnInit, OnDestroy {
  @Output() eventEmitter = new EventEmitter();
  @Output() copiedTemplateEmitter = new EventEmitter();
  @Output() eventSpinner = new EventEmitter();
  @Input() template: any;
  templateToEdit: Templatee[] = [];
  contractid = '';
  name = '';
  form: FormGroup;
  jinjaConvertedForm: FormGroup;
  htmlTemplate = '';
  contentTypes: ContentType[];
  templateTypes: TemplateType[];
  vendorTypes: VendorType[];
  services: Service[];
  isDisabled = false;
  copyTemplateDialogVisible = false;
  copiedTemplateName: string;
  isEditMode: boolean;
  templateId: string;
  showTranslateDialog: boolean;

  subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private apiConnectService: ApiConnectService,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private controllerService: ControllerService) {
    this.form = fb.group({
      body: [Validators.required],
    });
    this.jinjaConvertedForm = fb.group({
      jinjaTemplateName: [Validators.required],
      jinjaTemplateContent: [Validators.required]
    })
  }

  get shouldShowJinjaConvert() {
    return this.form.value?.selectedTemplateType?.id === 1 || false;
  }

  ngOnInit() {
    this.loadTemplateDeviceModel();
    this.loadTemplateTypes();
    this.loadTemplateVendorTypes();
    this.form = this.fb.group({
      selectedType: new FormControl(null, Validators.required),
      selectedVendor: new FormControl(null, Validators.required),
      selectedTemplateType: new FormControl(null, Validators.required),
      body: new FormControl('', Validators.required),
      htmlTemplate: new FormControl('', Validators.required),
      contractid: [null],
      service: [null],
      name: [null],
      id: [null]
    });
    if (!this.template) {
      this.isDisabled = true;
    }
  }

  ngOnChanges() {
    if (this.template !== undefined) {
      this.isDisabled = false;
      this.isEditMode = false;
      this.getSelectedTemplate(this.template);
    }
    if (!this.template) {
      this.isDisabled = true;
    }
  }

  /**
   * Open modal for permission to delete template
   */
  public deleteTemplateConfirmModal(): void {
    const delTempStringBuilder = new StringBuilder();
    delTempStringBuilder.Append('This template cannot be removed, because it is used in ');
    this.confirmationService.confirm({
      message: 'Are you sure that you want to delete this template?',
      header: 'Delete confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.controllerService.checkUsabilityOfCarcheTempInAction(this.form.get('id').value, this.form.get('name').value).subscribe(result => {
          if (result['message'] === 'Successful!' && result['result'] && result['result'].length > 0) {
            const templates = result['result'];
            templates.forEach((res: any) => {
              if (res.hasOwnProperty('NAME')) {
                delTempStringBuilder.Append(res['NAME']);
                delTempStringBuilder.Append(' ');
              }
            });
            delTempStringBuilder.Append('please remove or change it.');
            this.messageService.add({
              severity: 'error',
              summary: 'Action not allowed!',
              detail: delTempStringBuilder.ToString(),
              sticky: true
            });
          } else {
            this.deleteTemplate();
          }
        }, error => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Message',
            detail: 'Unable to check usability of template!',
            sticky: true
          });
        });
      },
      reject: () => {
        this.messageService.add({severity: 'info', summary: 'Rejected', detail: 'You have rejected'});
      }
    });
  }

  /**
   * Delete selected carche template
   */
  public deleteTemplate(): void {
    this.eventSpinner.emit(true);
    const templateId = this.form.get('id')?.value;
    if (!templateId) {
      this.eventSpinner.emit(false);
      this.messageService.add({severity: 'error', summary: 'Error!', detail: 'Unable to get template id!'});
      return;
    }
    const subscription = this.apiConnectService.apiDeleteTemplateByTemplateId(templateId).subscribe(() => {
      this.eventEmitter.emit(templateId);
      this.template = undefined;
      this.form.reset();
      this.messageService.add({
        severity: 'success',
        summary: 'Deleted!',
        detail: 'Your template is successfully deleted!'
      });
      this.eventSpinner.emit(false);
      this.router.navigate([], {queryParams: {reloadTree: true}, queryParamsHandling: 'merge'}).then()
    }, (error) => {
      console.error(error)
      this.eventSpinner.emit(false);
      this.messageService.add({severity: 'error', summary: 'Error!', detail: 'Your template is not deleted!'});
    })
    this.subscriptions.push(subscription);
  }

  /**
   * Open confirmation modal for update template
   */
  public saveTemplateConfirmModal(message: string): void {
    this.confirmationService.confirm({
      message,
      header: 'Save confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.updateTemplate(),
      reject: () => this.messageService.add({severity: 'info', summary: 'Rejected', detail: 'You have rejected'})
    });
  }

  /**
   * On Save Template - Actions to perform
   */
  onSaveTemplate() {
    this.eventSpinner.emit(true);
    // Check for dependencies before saving the new template
    const {name, id} = this.form.value;
    const subscription = this.controllerService.checkUsabilityOfCarcheTempInAction(id, name)
      .subscribe(
        (result) => {
          this.eventSpinner.emit(false);
          let confirmMessage = 'Are you sure that you want to save this template?'
          if (result['message'] === 'Successful!' && result['result'] && result['result'].length > 0) {
            const templates = result['result'];
            const usageStrBuilder = new StringBuilder();
            usageStrBuilder.Append('This template is being used in the following actions, <br><br>')
            templates.forEach((res: any) => usageStrBuilder.Append('<strong>- ' + res['NAME'] + '<br></strong>'))
            usageStrBuilder.Append('<br>Editing this template will affect all the actions associated with it. Do you want to proceed?');
            confirmMessage = usageStrBuilder.ToString();
          }
          this.saveTemplateConfirmModal(confirmMessage)
        },
        (err) => {
          this.eventSpinner.emit(false);
          console.error(err)
        })
    this.subscriptions.push(subscription);
  }

  processTemplateBody(content: string) {
    if (this.form.get('selectedType').value.contentType === ContentTypes.json &&
      this.form.get('selectedTemplateType').value.id.toString() === TemplateTypes.carche) {
      content = this.processOccurrences(content, /\[[A-Za-z<>{}[\]].*?]/gm, '\\]');
      content = this.processOccurrences(content, /\{[{}\[\]A-Za-z<>].*?}/gm, '\\}');
      content = content.replace(/\{(?![A-Za-z]|[<>{}\[\]])/gm, '\\{');
      content = content.replace(/\[(?![A-Za-z]|[<>\[\]{}])/gm, '\\[');
    }
    return btoa(content)
  }

  processOccurrences(content:string, regex:RegExp, replacement: string) :string{
    const occurrences = content.match(regex);
    if (occurrences) {
      const hashMap = {};
      occurrences.forEach((occurrence, index) => {
        hashMap[`function${index}`] = occurrence;
        content = content.replace(occurrence, `function${index}`);
      });
      content = content.replace(new RegExp(replacement, 'g'), replacement);
      occurrences.forEach((_, index) => {
        content = content.replace(`function${index}`, hashMap[`function${index}`]);
      });
    } else {
      content = content.replace(new RegExp(replacement, 'g'), replacement);
    }
    return content;
  }

  updateTemplate() {
    console.log('updating template')
    this.eventSpinner.emit(true);
    const {
      name,
      id,
      htmlTemplate,
      service,
      contractid,
      selectedTemplateType,
      selectedType,
      selectedVendor
    } = this.form.value;
    const body = {
      body: this.processTemplateBody(htmlTemplate),
      service,
      contractid,
      templateType: selectedTemplateType.id,
      deviceModel: selectedType?.id,
      vendorType: selectedVendor?.id
    }
    const subscription = this.apiConnectService.editCarcheTemplate(id, name, body)
      .subscribe((result: any) => {
        this.form.get('htmlTemplate').setValue(result.body);
        this.isEditMode = false;
        this.eventSpinner.emit(false);
      }, (err) => {
        console.error(err)
        this.eventSpinner.emit(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed!',
          detail: 'Unable to edit the template, please retry!'
        })
      })
    this.subscriptions.push(subscription)
  }

  public getSelectedTemplate(template: ICarcheTemplate): void {
    this.apiConnectService.getSelectedCarcheTemplate(template).subscribe(templateToEdit => {
      this.eventSpinner.emit(false);
      let cArcheTemplate = [];
      if (!templateToEdit || templateToEdit.length === 0) {
        this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load template', sticky: true });
        return
      }
      if (templateToEdit.length === 1) {
        cArcheTemplate = templateToEdit;
      }
      if (templateToEdit.length > 1) {
        cArcheTemplate = templateToEdit.filter(cTemplate => {
          return cTemplate['id'] === template['id']
        });
        if (cArcheTemplate.length > 1) {
          this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'There are more then one template with same ids', sticky: true });
          return
        }
      }
      const contentType = this.contentTypes.filter(cT => {
        return cT.id === parseInt(cArcheTemplate[0]['deviceModel'], 10)
      });
      const vendor = this.vendorTypes.filter(v => {
        return v.id === parseInt(cArcheTemplate[0]['vendorType'], 10);
      });
      const templateType = this.templateTypes.filter(t => {
        return t.id === parseInt(cArcheTemplate[0]['templateType'], 10);
      });
      this.form.get('selectedType').setValue(contentType[0]);
      this.form.get('selectedVendor').setValue(vendor[0]);
      this.form.get('selectedTemplateType').setValue(templateType[0]);
      this.form.get('name').setValue(cArcheTemplate[0]['name']);
      this.form.get('id').setValue(cArcheTemplate[0]['id']);
      // set service or contract if exist
      if (cArcheTemplate[0]['contractid']) {
        this.form.get('contractid').setValue(cArcheTemplate[0]['contractid']);
      }
      if (cArcheTemplate[0]['services']) {
        this.form.get('service').setValue(cArcheTemplate[0]['services']);
      }
      this.templateToEdit = cArcheTemplate;
      let content = this.templateToEdit[0].body;

      if (contentType[0].contentType === ContentTypes.json
        && templateType[0].id === parseInt(TemplateTypes.carche, 10)) {
        content = content.replace(/\\{/g, '{');
        content = content.replace(/\\}/g, '}');
        content = content.replace(/\\\[/g, '[');
        content = content.replace(/\\]/g, ']');
      }
      this.form.get('htmlTemplate').setValue(content)
    }, error => {
      console.error(error);
      this.eventSpinner.emit(false);
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load template', sticky: true });
    });
  }

  /**
   * Load all template types
   */
  private loadTemplateTypes(): void {
    this.apiConnectService.getTemplateTypes().subscribe(templateTypes => {
      this.templateTypes = templateTypes;
    }, error => {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load template template types', sticky: true });
    });
  }

  /**
   * Load all vendors
   */
  private loadTemplateVendorTypes(): void {
    this.apiConnectService.getTemplateVendorTypes().subscribe(vendorTypes => {
      this.vendorTypes = vendorTypes;
    }, error => {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load template vendor types', sticky: true });
    });
  }

  /**
   * Load all device models
   */
  private loadTemplateDeviceModel(): void {
    this.apiConnectService.getTemplateContentTypes().subscribe(contentTypes => {
      this.contentTypes = contentTypes;
    }, error => {
      console.error(error);
      this.messageService.add({ severity: 'error', summary: 'Error Message', detail: 'Unable to load template content types', sticky: true });
    });
  }

  public copyOfTemplate(): void {
    this.eventSpinner.emit(true);
    const copiedTemplate: IConfigTemplateRequest = {
      name: this.copiedTemplateName,
      body: btoa(this.form.value['htmlTemplate']),
      deviceModel: this.form.value['selectedType']['id'],
      templateType: this.form.value['selectedTemplateType']['id'],
      vendorType: this.form.value['selectedVendor']['id'],
      contractid: this.form.value['contractid'],
      service: this.form.value['service']
    }
    this.apiConnectService.addcArcheTempalte(JSON.stringify(copiedTemplate)).subscribe((result)=>{
      this.copyTemplateDialogVisible = false;
      this.eventSpinner.emit(false);
      const templateToEmit = {
        name: result['name'],
        contractid: {
          id: result['contractid']['ID'],
          name: result['contractid']['NAME'],
          bcCompanyId: result['contractid']['BC_COMPANY_ID'],
          bcName: result['contractid']['BC_NAME'],
          active: result['contractid']['ACTIVE'],
          crWebId: result['contractid']['CR_WEB_ID'],
          msimEmail: result['contractid']['MSIM_EMAIL'],

        },
        service: { id: result['services']['ID'], serviceName: result['services']['SERVICE_NAME'] },
        id: result['id'],
      };
      this.copiedTemplateEmitter.emit(templateToEmit);
      this.copiedTemplateName = '';
    })

  }

  public showCopyTemplateDialog(){
    this.copyTemplateDialogVisible = true;
  }

  public convertTemplateToJinja() {
    const {selectedVendor: vendor, htmlTemplate: data, name, id} = this.form.value;
    const archeTemplateData = {id, name, data, vendor}
    this.eventSpinner.emit(true);
    this.apiConnectService.convertTemplateToJinja(archeTemplateData)
      .pipe(finalize(() => (this.eventSpinner.emit(false))))
      .subscribe((result) => {
        this.showTranslateDialog = true;
        this.jinjaConvertedForm.get('jinjaTemplateName').setValue(`${name}.Jinja2`);
        this.jinjaConvertedForm.get('jinjaTemplateContent').setValue(result.data);
      }, (err) => {
        console.error(err)
        this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Unable to convert the template to Jinja!' });
      })
  }

  public saveConvertedJinjaTemplate() {
    const {jinjaTemplateName, jinjaTemplateContent} = this.jinjaConvertedForm.value;
    const convertedTemplate = {
      name: jinjaTemplateName,
      body: btoa(jinjaTemplateContent),
      deviceModel: this.form.get('selectedType').value.id,
      templateType: JINJA_TEMPLATE_TYPE_ID,
      vendorType: this.form.get('selectedVendor').value.id,
      contractid: this.form.get('contractid').value,
      service: this.form.get('service').value
    }
    this.eventSpinner.emit(true);
    this.apiConnectService.addcArcheTempalte(JSON.stringify(convertedTemplate))
      .pipe(finalize(() => (this.eventSpinner.emit(false))))
      .subscribe((result) => {
        this.showTranslateDialog = false;
        this.eventEmitter.emit([]);
        this.messageService.add({ severity: 'success', summary: 'Success!', detail: 'Template has been saved successfully!' });
        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: { templateId: result.id , reloadTree : true },
            queryParamsHandling: 'merge' // remove to replace all query params by provided
          }
        ).then()
      }, (err) => {
        console.error(err)
        this.messageService.add({ severity: 'error', summary: 'Error!', detail: 'Unable to save the converted template!' });
      })
  }

  public closeDialog(){
    this.copyTemplateDialogVisible = false;
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => {
      if(subscription) {
        subscription.unsubscribe();
      }
    })
  }
}
