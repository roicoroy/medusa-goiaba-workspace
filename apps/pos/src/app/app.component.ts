import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { IconsService } from './shared/services/icons/icons.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {

  private icons = inject(IconsService);

  async ngOnInit(): Promise<void> {
    await this.initializeApp();
  }

  async initializeApp() {
    try {
      this.icons.initIcons();
    } catch (err) {
      console.log('This is normal in a browser', err);
    }
  }
}
