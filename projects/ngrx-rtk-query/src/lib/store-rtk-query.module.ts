import { APP_BOOTSTRAP_LISTENER, ModuleWithProviders, NgModule } from '@angular/core';
import { setupListeners } from '@rtk-incubator/rtk-query';
import { defaultConfig, StoreQueryConfig, STORE_RTK_QUERY_CONFIG } from './store-rtk-query.config';
import { dispatch, ThunkService } from './thunk.service';

@NgModule({})
export class StoreRtkQueryModule {
  static forRoot(config?: Partial<StoreQueryConfig>): ModuleWithProviders<StoreRtkQueryModule> {
    const moduleConfig = { ...defaultConfig, ...config };

    if (moduleConfig.setupListeners) {
      setupListeners(dispatch);
    }

    return {
      ngModule: StoreRtkQueryModule,
      providers: [
        { provide: STORE_RTK_QUERY_CONFIG, useValue: moduleConfig },
        {
          provide: APP_BOOTSTRAP_LISTENER,
          multi: true,
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          useFactory: () => () => {},
          deps: [ThunkService],
        },
      ],
    };
  }
}
