import { QuestionBase, QuestionOptions } from './question-base';

export class MessageQuestion extends QuestionBase<string> {

  controlType = 'message';
  blankValue = '';
  type: string;

  constructor(options: MessageQuestionOptions = {}) {
    super(options);
    this.type = options.type || '';
  }
}

export class MessageQuestionOptions extends QuestionOptions<string> {
  type?: string;
}
