import { QuestionBase, QuestionOptions } from './question-base';

export class TextboxQuestion extends QuestionBase<string> {

  controlType = 'textbox';
  blankValue = '';
  type: string;

  constructor(options: TextboxQuestionOptions = {}) {
    super(options);
    this.type = options.type || '';
  }
}

export class TextboxQuestionOptions extends QuestionOptions<string> {
  type?: string;
}
