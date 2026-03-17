import { Injectable } from '@angular/core';
import { StateService } from './state.service';

@Injectable()
export class AssetService {
  functionAssetMap: any = {};
  constructor(private state: StateService) {
    this.functionAssetMap = {
      concat: this.concat.bind(this),
      evaluate: this.evaluate.bind(this),
      replace: this.replace.bind(this),
      substring: this.substring.bind(this)
    };
  }

  /**
   * To execute the function from the available function map
   * @param method name of the method to be executed
   * @param params parameters to be passed onto the method
   */
  execute(method: string, params?: any[]) {
    if (!this.functionAssetMap.hasOwnProperty(method)) return null;
    const functionToExecute = this.functionAssetMap[method];
    try {
      return functionToExecute(...params);
    } catch (error) {
      console.log(
        `Unable to execute ${method}()! Please check your form configuration!`
      );
      console.error(error);
      return null;
    }
  }

  /**
   * FUNCTION ASSETS
   * This util functions are to be used in the form designer to calculate or replace value
   * The function may or may not have parameters. But, it is essential that these functions always return a value even if null/undefined.
   * No return at the end of function will cause catastrophic failure.
   * Goal is to keep these utility functions as small as possible
   */

  /**
   * To concatenate two or more inputs (by reference - optional)
   * @param args {string[]} i.e '${networkCount}, ${blah}'
   */
  concat = (...args: string[]) => args.join('');

  /**
   * To evaluate an Arithmetic Expression (by reference - optional)
   * @param expression {string} i.e '${networkCount} + 2/3'
   */
  evaluate = (expression: string) => eval(expression);

  /**
   * To get substring using start and end index from a string (by reference - optional)
   * @param input {string} i.e '${networkCount} blah ab'
   * @param pattern {string} can be a string or a regex with flags
   * @param replacement {string} string to be used as replacement
   * @param flags {string} flags for the regex (Optional)
   */
  replace = (
    input: string,
    pattern: string,
    replacement: string,
    flags?: string
  ) => input.replace(new RegExp(pattern, flags || 'ig'), replacement);

  /**
   * To get substring using start and end index from a string (by reference - optional)
   * @param input {string} i.e '${networkCount} blah ab'
   * @param startIndex {number} start index
   * @param endIndex {number} end index
   */
  substring = (input: string, startIndex: number, endIndex: number) =>
    input.substring(startIndex, endIndex);
}
