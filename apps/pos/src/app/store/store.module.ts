import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxsModule } from '@ngxs/store';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsFormPluginModule } from '@ngxs/form-plugin';
import { NgxsStoragePluginModule } from '@ngxs/storage-plugin';
import {
  DEVTOOLS_REDUX_CONFIG,
  LOGGER_CONFIG,
  OPTIONS_CONFIG,
  STATES_MODULES,
  STORAGE_MODULES
} from './store.config';

@NgModule({
  imports: [
    CommonModule,
    NgxsModule.forRoot(STATES_MODULES, OPTIONS_CONFIG),
    NgxsReduxDevtoolsPluginModule.forRoot(DEVTOOLS_REDUX_CONFIG),
    NgxsLoggerPluginModule.forRoot(LOGGER_CONFIG),
    NgxsStoragePluginModule.forRoot({
      keys: STORAGE_MODULES,
    }),
    NgxsFormPluginModule.forRoot(),
  ],
  exports: [NgxsModule]
})
export class NgxsStoreModule { }
