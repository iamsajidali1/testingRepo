import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  activeTheme: BehaviorSubject<string>;
  constructor(@Inject(DOCUMENT) private document: Document) {
    // Get the theme that is saved in Local Storage else Use a default
    const theme = window.localStorage.getItem('css-theme') || 'light';
    this.activeTheme = new BehaviorSubject<string>(theme);
    this.switchTheme(theme);
  }

  get currentTheme() {
    return this.activeTheme;
  }

  switchTheme(theme: string) {
    let themeLink = this.document.getElementById(
      'app-theme'
    ) as HTMLLinkElement;

    if (themeLink) {
      themeLink.href = `${theme}.css`;
      // This is where we save the theme setting in local storage
      window.localStorage.setItem('css-theme', theme);
      this.activeTheme.next(theme);
    }
  }
}
