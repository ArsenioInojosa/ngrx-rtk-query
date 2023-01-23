import type { ActionReducer, MetaReducer, Action } from '@ngrx/store';
import type { Api } from '@reduxjs/toolkit/query';
import type { CoreModule } from '@reduxjs/toolkit/dist/query/core/module';

import type { AngularHooksModule, AngularHooksModuleOptions } from './module';
import { buildBatchedActionsHandler } from './build-batch-middleware';
import { internalBatchState } from './thunk.service';

export function buildMetaReducer({
  api,
  moduleOptions: { useDispatch: dispatch },
}: {
  api: any;
  moduleOptions: Required<Pick<AngularHooksModuleOptions, 'useDispatch'>>;
}): MetaReducer<any> {
  const anyApi = api as Api<any, Record<string, any>, string, string, AngularHooksModule | CoreModule>;
  const reducerPath = anyApi.reducerPath;

  let nextState: any;
  const getState = () =>
    nextState[reducerPath]
      ? nextState
      : // Query inside forFeature (Code splitting)
        { [reducerPath]: nextState };

  const middleware = anyApi.middleware({ dispatch, getState })(getState);
  const batchedActionsHandler = buildBatchedActionsHandler({ api, internalState: internalBatchState });

  return function (reducer: ActionReducer<any>): ActionReducer<any> {
    return function (state: any, action: Action) {
      nextState = reducer(state, action);

      if (action.type.startsWith(`${reducerPath}/`)) {
        batchedActionsHandler(action, { dispatch, getState, next: dispatch }, nextState);
      }
      middleware(action);

      return nextState;
    };
  };
}
