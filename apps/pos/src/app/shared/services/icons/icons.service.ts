import { Injectable } from '@angular/core';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';

@Injectable({
  providedIn: 'root',
})
export class IconsService {
  constructor() {
    this.initIcons();
  }

  initIcons() {
    return addIcons({
      ...icons,
    });
  }
}
