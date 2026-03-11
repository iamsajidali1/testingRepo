import { QuestionBase, QuestionOptions } from './question-base';

export class NavigationQuestion extends QuestionBase<string[]> {

  controlType = 'navigation';
  blankValue = [];
  data: {};
  orientation: 'hor' | 'ver';
  title: string;

  constructor(options: NavigationQuestionOptions = {}) {
    super(options);
    this.data = options.data || {};
    this.orientation = options.orientation || 'hor';
    this.title = options.title || '';
  }
}

export class NavigationQuestionOptions extends QuestionOptions<string[]> {
  data?: {};
  orientation?: 'hor' | 'ver';
  title?: string;
}
