import { Injectable, inject } from '@angular/core';
import {
  AlertController,
  LoadingController,
  ModalController,
  PopoverController,
} from '@ionic/angular/standalone';
import {
  AlertOptions,
  LoadingOptions,
  ModalOptions,
  PopoverOptions,
} from '@ionic/angular/standalone';
import { DebugEventsService } from '../debug-events/debug-events.service';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);
  private loadingCtrl = inject(LoadingController);
  private popoverCtrl = inject(PopoverController);
  private debugEvents = inject(DebugEventsService);

  public async showAlert(opts?: AlertOptions): Promise<HTMLIonAlertElement> {
    try {
      const alert = await this.alertCtrl.create(opts || {});
      await alert.present();
      return alert;
    } catch (error) {
      this.debugEvents.log('DialogService', 'alert:create-or-present:failed', {
        kind: 'application',
        level: 'error',
        context: { error: error as Record<string, unknown> },
      });
      throw error;
    }
  }

  public async showErrorAlert(
    opts?: AlertOptions,
  ): Promise<HTMLIonAlertElement> {
    const defaultOpts: AlertOptions = {
      header: 'Error',
      buttons: ['OK'],
    };

    // Use Object.assign instead of spread operator to avoid
    // "object is not extensible" errors with frozen objects
    const mergedOpts = Object.assign({}, defaultOpts, opts);
    return this.showAlert(mergedOpts);
  }

  public async showModal(opts: ModalOptions): Promise<HTMLIonModalElement> {
    const modal = await this.modalCtrl.create(opts);
    await modal.present();
    return modal;
  }

  public async showPopover(
    opts: PopoverOptions,
  ): Promise<HTMLIonPopoverElement> {
    const popover = await this.popoverCtrl.create(opts);
    await popover.present();
    return popover;
  }

  public async showLoading(
    opts?: LoadingOptions,
  ): Promise<HTMLIonLoadingElement> {
    const defaultOpts: LoadingOptions = {
      message: 'Please wait...',
    };
    // Use Object.assign instead of spread operator
    const mergedOpts = Object.assign({}, defaultOpts, opts);
    const loading = await this.loadingCtrl.create(mergedOpts);
    await loading.present();
    return loading;
  }
}
