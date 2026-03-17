import { Injectable } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import { QuestionModel } from '../models/question.model';
import { LabelValueModel } from '../models/utils.model';
import { ValidationModel } from '../models/validation.model';
import { saveAs } from 'file-saver';
import { environment } from '../../../../environments/environment';

@Injectable()
export class UtilService {
  breadCrumbs: MenuItem[];
  breadCrumbsSubject: BehaviorSubject<MenuItem[]>;
  constructor() {
    this.breadCrumbs = [
      { label: '', icon: 'pi pi-fw pi-home', routerLink: '/' }
    ];
    this.breadCrumbsSubject = new BehaviorSubject<MenuItem[]>(this.breadCrumbs);
  }

  addQuestionIfNotExists(questions: QuestionModel[], question: QuestionModel) {
    const index = questions.findIndex((ques) => ques.key === question.key);
    if (index === -1) {
      questions.push(question);
    }
    return questions;
  }

  deleteQuestionIfExists(questions: QuestionModel[], question: QuestionModel) {
    const index = questions.findIndex((ques) => ques.key === question.key);
    if (index !== -1) {
      questions.splice(index, 1);
    }
    return questions;
  }

  checkIfMcapPassed(mcapResponse: any) {
    return (
      'm_status' in mcapResponse &&
      mcapResponse.m_status !== 'Success' &&
      'msg' in mcapResponse &&
      mcapResponse.msg !== 'Completed'
    );
  }

  checkConditions = (type: any, attributes: boolean[]) => {
    switch (type) {
      case 'eq':
        return attributes.every((element) => element === attributes[0]);
      case 'neq':
        return attributes.some((element) => element !== attributes[0]);
      case 'or':
        return attributes.reduce((prev, next) => prev || next);
      case 'and':
        return attributes.reduce((prev, next) => prev && next);
      default:
        return false;
    }
  };

  sortQuestions(qA: QuestionModel, qB: QuestionModel) {
    if (qA.order < qB.order) return -1;
    if (qA.order > qB.order) return 1;
    return 0;
  }

  getScriptsFromQuestions(
    questions: QuestionModel[],
    scripts: LabelValueModel[] = []
  ) {
    for (let question of questions) {
      if (question.controlType === 'list') {
        this.getScriptsFromQuestions(question.columnsType, scripts);
      }
      if (
        question.controlType === 'dropdown' ||
        question.controlType === 'multiselect'
      ) {
        const { optionsSource } = question;
        if (optionsSource && typeof optionsSource === 'object') {
          const { label, value } = optionsSource;
          if (label && value) {
            // Push to script if not already existing
            scripts.findIndex((script) => script.value === value) !== -1 ||
              scripts.push(optionsSource);
          }
        }
      }
    }
    return scripts;
  }

  setScriptResultsToQuestions(questions: QuestionModel[], scripts: any[]) {
    for (let question of questions) {
      if (question.controlType === 'list') {
        this.setScriptResultsToQuestions(question.columnsType, scripts);
      }
      if (
        question.controlType === 'dropdown' ||
        question.controlType === 'multiselect'
      ) {
        const { optionsSource } = question;
        if (optionsSource && typeof optionsSource === 'object') {
          const { label, value } = optionsSource;
          if (label && value) {
            // get the script result
            const scriptResult = scripts.find(
              (row) => row.script === value
            )?.result;
            // create dropdown from the script result
            if (scriptResult && scriptResult.length) {
              question.options = scriptResult.map((row: any) => ({
                key: row.result || row.value,
                value: row.result || row.value
              }));
            }
          }
        }
      }
    }
    return questions;
  }

  groomQuestions(questions: any[]) {
    for (let question of questions) {
      Object.keys(question).forEach((key) => {
        switch (key) {
          case 'required':
            question[key] = question[key] === 'true';
            break;
          case 'validator':
            question[key] = question[key] === 'None' ? null : question[key];
            break;
          case 'conditions':
            const isEmptyCondition =
              question[key] && // 👈 null and undefined check
              Object.keys(question[key]).length === 0 &&
              Object.getPrototypeOf(question[key]) === Object.prototype;
            question[key] = isEmptyCondition ? null : question[key];
            break;
        }
      });
    }
    return questions;
  }

  groomValidationResponse(rawResponse: any) {
    const validations: ValidationModel[] = [];
    for (let command in rawResponse) {
      validations.push({
        command,
        ...JSON.parse(rawResponse[command])
      });
    }
    return validations;
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  isCiscoDevice(vendor: string) {
    return vendor.toLowerCase().includes('cisco');
  }

  isValidJson(input: any) {
    try {
      JSON.parse(input);
      return true;
    } catch (e) {
      return false;
    }
  }

  isValidGeolocation(latitude: number | string, longitude: number | string) {
    const geoLocStr = `${latitude}, ${longitude}`;
    return /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/u.test(
      geoLocStr
    );
  }

  isValidTransactionId(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    );
  }

  getObjectValueByPath(object: any, path: string) {
    path = path.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    path = path.replace(/^\./, ''); // strip a leading dot
    const keys = path.split('.');
    for (let index = 0, n = keys.length; index < n; ++index) {
      let key = keys[index];
      if (key in object) {
        object = object[key];
      } else {
        return;
      }
    }
    return object;
  }

  saveBase64BlobToFile(blob: Blob, type: string, fileName: string) {
    const reader = new FileReader();
    reader.readAsText(blob);
    reader.onloadend = function () {
      const base64data = reader.result.toString();
      let byteCharacters = atob(base64data);
      let byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        let slice = byteCharacters.slice(offset, offset + 512);
        let byteNumbers = new Array(slice.length);
        for (let index = 0; index < slice.length; index++) {
          byteNumbers[index] = slice.charCodeAt(index);
        }
        let byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      const updatedBlob = new Blob(byteArrays, { type });
      saveAs(updatedBlob, fileName);
    };
  }

  saveAsCsvFile(data: object[], filename: string = 'myFile.csv') {
    // specify how you want to handle null values here
    const replacer = (_key: any, value: any) => (value === null ? '' : value);
    const header = Object.keys(data[0]);
    let csv = data.map((row: any) =>
      header
        .map((fieldName) => JSON.stringify(row[fieldName], replacer))
        .join(',')
    );
    csv.unshift(header.join(','));
    const csvArray = csv.join('\r\n');
    const blob = new Blob([csvArray], { type: 'text/csv' });
    saveAs(blob, filename);
  }

  convertCSVToArray(strData: string, strDelimiter: string = ',') {
    // Create a regular expression to parse the CSV values.
    const objPattern = new RegExp(
      // Delimiters.
      '(\\' +
        strDelimiter +
        '|\\r?\\n|\\r|^)' +
        // Quoted fields.
        '(?:"([^"]*(?:""[^"]*)*)"|' +
        // Standard fields.
        '([^"\\' +
        strDelimiter +
        '\\r\\n]*))',
      'gi'
    );

    // Create an array to hold our data. Give the array
    // a default empty first row.
    let arrData: any[][] = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    let arrMatches = null;

    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while ((arrMatches = objPattern.exec(strData))) {
      // Get the delimiter that was found.
      let strMatchedDelimiter = arrMatches[1];

      // Check to see if the given delimiter has a length
      // (is not the start of string) and if it matches
      // field delimiter. If id does not, then we know
      // that this delimiter is a row delimiter.
      if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
        // Since we have reached a new row of data,
        // add an empty row to our data array.
        arrData.push([]);
      }

      let strMatchedValue;

      // Now that we have our delimiter out of the way,
      // let's check to see which kind of value we
      // captured (quoted or unquoted).
      if (arrMatches[2]) {
        // We found a quoted value. When we capture
        // this value, unescape any double quotes.
        strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
      } else {
        // We found a non-quoted value.
        strMatchedValue = arrMatches[3];
      }

      // Now that we have our value string, let's add
      // it to the data array.
      if (strMatchedValue) {
        arrData[arrData.length - 1].push(strMatchedValue.trim());
      }
    }

    // Return the parsed data.
    return arrData;
  }

  /**
   * Converts a given number of bytes into a human-readable format.
   *
   * @param {number} bytes - The number of bytes to convert.
   * @param {string} [suffix='B'] - The suffix to append to the output string. Defaults to 'B'.
   *
   * @returns {string} The converted bytes in a human-readable format.
   *
   * @example
   * // returns '1.00 GB'
   * convertBytes(1000000000);
   *
   * @example
   * // returns '1.00 Gbit'
   * convertBytes(1000000000, 'bit');
   */
  convertBytes(bytes: number, suffix: string = 'B'): string {
    const kilobytes = bytes / 1000;
    const megabytes = kilobytes / 1000;
    const gigabytes = megabytes / 1000;

    if (gigabytes >= 1) {
      return `${gigabytes.toFixed(2)} G${suffix}`;
    } else if (megabytes >= 1) {
      return `${megabytes.toFixed(2)} M${suffix}`;
    } else if (kilobytes >= 1) {
      return `${kilobytes.toFixed(2)} K${suffix}`;
    } else {
      return `${bytes} ${suffix === 'B' ? 'bytes' : suffix}`;
    }
  }

  /**
   * Formats a number to a string with a suffix indicating the scale of the number.
   *
   * If the number is greater than or equal to 1 billion, it is divided by 1 billion and the suffix 'B' is appended.
   * If the number is less than 1 billion but greater than or equal to 1 million, it is divided by 1 million and the suffix 'M' is appended.
   * If the number is less than 1 million but greater than or equal to 1 thousand, it is divided by 1 thousand and the suffix 'K' is appended.
   * If the number is less than 1 thousand, it is simply converted to a string with no suffix.
   *
   * @param {number} num - The number to format.
   *
   * @returns {string} The formatted number as a string.
   *
   * @example
   * // returns '1.00B'
   * formatNumber(1000000000);
   *
   * @example
   * // returns '1.00M'
   * formatNumber(1000000);
   *
   * @example
   * // returns '1.000K'
   * formatNumber(1000);
   *
   * @example
   * // returns '999'
   * formatNumber(999);
   */
  formatNumber(num: number): string {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(3) + 'K';
    } else {
      return num.toString();
    }
  }

  /**
   * Replaces placeholders in a template string with corresponding values.
   *
   * @param {string} template - The template string containing placeholders in the format `${key}`.
   * @param {Record<string, any>} values - An object where the keys are the placeholder names and the values are the values to replace the placeholders with.
   *
   * @returns {string} The template string with all placeholders replaced with their corresponding values. If a placeholder does not have a corresponding value in the `values` object, it is replaced with an empty string.
   *
   * @example
   * // returns 'Hello, John!'
   * replaceTemplateStrings('Hello, ${name}!', { name: 'John' });
   */
  replaceTemplateStrings(
    template: string,
    values: Record<string, any>
  ): string {
    return template.replace(/\$\{(\w+)\}/g, (_, key) => values[key] || '');
  }

  updateBreadcrumbs(crumbs: MenuItem[], isBcUser: boolean) {
    const breadCrumbs = [...this.breadCrumbs, ...crumbs];
    // If isBcUser then add it to the crumbs
    if (isBcUser) {
      breadCrumbs.unshift({
        label: 'Business Center',
        url: environment.BC_HOME,
        target: '_self'
      });
    }
    this.breadCrumbsSubject.next(breadCrumbs);
  }
}
