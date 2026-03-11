import { QuestionBase, QuestionOptions } from './question-base';

export class ListQuestion extends QuestionBase<any[]> {

  controlType = 'list';
  blankValue = [{}];
  columnsType: QuestionBase<any>[] = [];
  listStyle: 'table' | 'div';

  constructor(options: ListQuestionOptions = {}) {
    super(options);
    this.columnsType = options.columnsType || [];
    this.listStyle = options.listStyle;
  }
}

export class ListQuestionOptions extends QuestionOptions<any[]> {
  columnsType?: QuestionBase<any>[] = [];
  listStyle?: 'table' | 'div';
}
