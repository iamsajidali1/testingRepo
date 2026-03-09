import { Component } from '@angular/core';
import { ThemeService } from '../../../../services/theme.service';
import { StateService } from '../../services/state.service';
import { UserModel } from '../../../../models/user.model';
import { InitService } from '../../../../services/init.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  isDark: boolean;
  isBcUser: boolean;
  userDetails: UserModel;

  constructor(
    private stateService: StateService,
    private themeService: ThemeService,
    private initService: InitService
  ) {
    this.isDark = themeService.currentTheme.value === 'dark';
    this.isBcUser = this.stateService.isBcUser;
    this.userDetails = this.initService.userDetails;
  }

  handleChange(event: any) {
    this.isDark = event.checked;
    if (this.isDark) {
      this.themeService.switchTheme('dark');
    } else {
      this.themeService.switchTheme('light');
    }
  }
}
