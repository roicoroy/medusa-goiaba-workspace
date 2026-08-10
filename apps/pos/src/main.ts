import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ErrorHandler, importProvidersFrom } from '@angular/core';
import { GlobalErrorHandlerService } from './app/shared/errors/global-error-handler/global-error-handler.service';
import { MedusaInterceptor } from './app/shared/services/interceptor/medusa.interceptor';
import { NgxsStoreModule } from './app/store/store.module';
import { NgxStripeModule } from 'ngx-stripe';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: MedusaInterceptor, multi: true },
    importProvidersFrom(
      NgxsStoreModule,
      NgxStripeModule.forRoot(environment.STRIPE_PUBLISHABLE_KEY),
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService }
  ],
});
