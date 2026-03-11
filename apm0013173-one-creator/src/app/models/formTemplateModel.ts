import { QuestionBase } from "./fields-models/question-base";

export class formTemplateSchema {
    name: string;
    questions: QuestionBase<any>[];
    carcheTemplate: String;
    validation: string;
    id?: string;
    description: string;
    staticHostnameCheckBox: boolean;
    staticHostname: Object;
    apiEndpoint: string;
    enabled: boolean;
    minRollbackTimer: Number;
    maxRollbackTimer: Number;

    constructor(name: string, questions: QuestionBase<any>[], validation: any, description: string,
                staticHostnameCheckBox: boolean, carcheTemplate: String, staticHostname: Object, apiEndpoint: string, enabled: boolean, minRollbackTimer: Number, maxRollbackTimer: Number, id?: string,) {
        this.name = name;
        this.questions = questions;
        this.carcheTemplate = carcheTemplate;
        this.validation = validation;
        this.id = id;
        this.description = description;
        this.staticHostnameCheckBox = staticHostnameCheckBox;
        this.staticHostname = staticHostname;
        this.apiEndpoint = apiEndpoint;
        this.enabled = enabled;
        this.minRollbackTimer = minRollbackTimer;
        this.maxRollbackTimer = maxRollbackTimer;

    }
  }

