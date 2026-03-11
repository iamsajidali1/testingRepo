import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {MenuItem} from 'primeng/api';
import {ContextMenu} from 'primeng/contextmenu';
import {DialogService} from 'primeng/dynamicdialog';
import {FormsDialogComponent} from '../forms-dialog/forms-dialog.component';
import {QuestionModel} from '../../action.model';

@Component({
  selector: 'app-forms-previewer',
  templateUrl: './forms-previewer.component.html',
  styleUrls: ['./forms-previewer.component.css']
})
export class FormsPreviewerComponent {
  @Input() questions: any[];
  @Input() editable: boolean;
  @Output() contentModified: EventEmitter<QuestionModel[]> = new EventEmitter();
  @ViewChild('actionMenu', { static: false }) actionMenu?: ContextMenu;
  selectedQuestion: QuestionModel;
  contextMenu: MenuItem[];
  constructor(private dialogService: DialogService) {
    this.contextMenu = [
      { icon: 'fa fa-chevron-up', id: 'moveUp', label: 'Move Up', command: this.onMoveUp.bind(this), disabled: false },
      { icon: 'fa fa-chevron-down', id: 'moveDown', label: 'Move Down', command: this.onMoveDown.bind(this), disabled: false },
      { icon: 'far fa-edit', id: 'edit', label: 'Edit', command: this.onEdit.bind(this), disabled: false },
      { icon: 'fa fa-trash', id: 'delete', label: 'Delete', command: this.onDelete.bind(this), disabled: false }
    ]
  }

  /**
   * Getter for the selected question Index
   */
  get selectedQuestionIndex() {
    return this.questions.findIndex(
      question =>  JSON.stringify(question) === JSON.stringify(this.selectedQuestion)
    );
  }

  onMoveUp() {
    console.log('Move Up', this.selectedQuestion)
  }
  onMoveDown() {}
  onDelete() {
    this.questions.splice(this.selectedQuestionIndex, 1);
    this.contentModified.emit(this.questions);
  }
  onEdit() {
    const selectedQuestion = this.questions[this.selectedQuestionIndex];
    this.showDialog({
      action: 'edit', controlType: selectedQuestion.controlType, selectedQuestion, questions: this.questions
    }, `Edit FormControl`)
  }

  /**
   * To show the dialog
   * @params data to be passed to the dialog component
   * @params header for the modal
   */
  showDialog(data: any, header?: string) {
    const dialogRef = this.dialogService
      .open(FormsDialogComponent, {
        data,
        header: header || 'Edit FormControl',
        width: '848px'
      });
    dialogRef.onClose.subscribe(question => {
      if(question) {
        // As it is from preview component it will always be edit action
        this.questions[this.selectedQuestionIndex] = question;
        this.contentModified.emit(this.questions);
      }
    })
  }

  showActionMenu(event, context, index) {
    if(!this.editable) return;
    this.selectedQuestion = context;
    // Disable move up or move down based on location
    this.contextMenu.forEach(menu => {
      menu.disabled = (menu.id === 'moveUp' && index === 0)
        || (menu.id === 'moveDown' && index === this.questions.length - 1)
    })
    this.actionMenu.show(event)
  }
}
