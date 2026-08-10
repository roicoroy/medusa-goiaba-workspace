import { Injectable, inject } from '@angular/core';
import { NavigationExtras } from '@angular/router';
import { NavController } from '@ionic/angular';
import { slideAnimation } from '../animations/nav-animation';

export type AppRoute = '/home' | '/cart' | string;
export type NavDirection = 'forward' | 'back' | 'root';

export interface NavigateOptions {
  direction?: NavDirection;
  params?: Record<string, unknown>;
  replaceUrl?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private navCtrl = inject(NavController);

  /** Modern, unified navigation method. */
  async navigate(url: AppRoute, options?: NavigateOptions) {
    const direction = options?.direction ?? 'forward';
    
    const navOptions = {
      queryParams: options?.params,
      replaceUrl: options?.replaceUrl,
      animation: slideAnimation,
      animated: true,
      animationDirection: direction === 'root' ? 'forward' : direction,
    };

    if (direction === 'root') {
      await this.navCtrl.navigateRoot(url, navOptions);
    } else if (direction === 'back') {
      await this.navCtrl.navigateBack(url, navOptions);
    } else {
      await this.navCtrl.navigateForward(url, navOptions);
    }
  }

  /** Safely pop the stack or go back to a default route. */
  goBack() {
    this.navCtrl.back({
      animation: slideAnimation,
      animated: true,
      animationDirection: 'back',
    });
  }
}
