import { Injectable, inject } from '@angular/core';
import { NavigationExtras } from '@angular/router';
import { NavController } from '@ionic/angular';
import { slideAnimation } from '../animations/nav-animation';

type NavDirection = 'forward' | 'back';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private navCtrl = inject(NavController);

  async navigateForward(url: string, direction: NavDirection = 'forward') {
    await this.navCtrl.navigateForward(url, {
      animation: slideAnimation,
      animated: true,
      animationDirection: direction,
    });
  }
  async navigateForwardParams(
    url: string,
    params?: Record<string, unknown>,
    direction: NavDirection = 'forward',
  ) {
    const navigationExtras: NavigationExtras = {
      queryParams: params,
    };
    await this.navCtrl.navigateForward(url, {
      queryParams: navigationExtras.queryParams,
      animation: slideAnimation,
      animated: true,
      animationDirection: direction,
    });
  }

  /** Replace the entire nav stack — use for login→home and logout→login. */
  async navigateRoot(url: string) {
    await this.navCtrl.navigateRoot(url, {
      animation: slideAnimation,
      animated: true,
      animationDirection: 'forward',
    });
  }

  /** Navigate backward with a horizontal slide animation. */
  async navigateBack(url: string) {
    await this.navCtrl.navigateBack(url, {
      animation: slideAnimation,
      animated: true,
      animationDirection: 'back',
    });
  }
}
