import { createSelectorFactory, defaultMemoize } from '@ngrx/store';
import { ApiContext } from '@reduxjs/toolkit/dist/query/apiTypes';
import type { QueryKeys, RootState } from '@reduxjs/toolkit/dist/query/core/apiState';
import type {
  MutationActionCreatorResult,
  QueryActionCreatorResult,
} from '@reduxjs/toolkit/dist/query/core/buildInitiate';
import type { QueryResultSelectorResult } from '@reduxjs/toolkit/dist/query/core/buildSelectors';
import type {
  ApiEndpointMutation,
  ApiEndpointQuery,
  CoreModule,
  PrefetchOptions,
} from '@reduxjs/toolkit/dist/query/core/module';
import { SerializeQueryArgs } from '@reduxjs/toolkit/dist/query/defaultSerializeQueryArgs';
import type { Api, EndpointDefinitions, MutationDefinition, QueryDefinition } from '@reduxjs/toolkit/query';
import { QueryStatus, defaultSerializeQueryArgs, skipToken } from '@reduxjs/toolkit/query';
import { BehaviorSubject, combineLatest, isObservable, of } from 'rxjs';
import { distinctUntilChanged, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';

import { UNINITIALIZED_VALUE } from './constants';
import type { AngularHooksModuleOptions } from './module';
import { getState } from './thunk.service';
import type {
  GenericPrefetchThunk,
  MutationHooks,
  MutationSelector,
  MutationStateSelector,
  QueryHooks,
  QuerySelector,
  QueryStateSelector,
  UseLazyQuery,
  UseLazyQueryLastPromiseInfo,
  UseLazyQuerySubscription,
  UseLazyTrigger,
  UseMutation,
  UseQuery,
  UseQueryState,
  UseQueryStateDefaultResult,
  UseQuerySubscription,
} from './types';
import { useStableQueryArgs } from './useSerializedStableValue';
import { shallowEqual } from './utils';

// const defaultQueryStateSelector: QueryStateSelector<any, any> = (x) => x;
const defaultMutationStateSelector: MutationStateSelector<any, any> = (x) => x;

/**
 * Wrapper around `defaultQueryStateSelector` to be used in `useQuery`.
 * We want the initial render to already come back with
 * `{ isUninitialized: false, isFetching: true, isLoading: true }`
 * to prevent that the library user has to do an additional check for `isUninitialized`/
 */
const noPendingQueryStateSelector: QueryStateSelector<any, any> = (selected) => {
  if (selected.isUninitialized) {
    return {
      ...selected,
      isUninitialized: false,
      isFetching: true,
      isLoading: selected.data !== undefined ? false : true,
      status: QueryStatus.pending,
    } as any;
  }
  return selected;
};

/**
 *
 * @param opts.api - An API with defined endpoints to create hooks for
 * @param opts.moduleOptions.useDispatch - The version of the `useDispatch` hook to be used
 * @param opts.moduleOptions.useSelector - The version of the `useSelector` hook to be used
 * @returns An object containing functions to generate hooks based on an endpoint
 */
export function buildHooks<Definitions extends EndpointDefinitions>({
  api,
  moduleOptions: { useDispatch: dispatch, useSelector },
  serializeQueryArgs,
  context,
}: {
  api: Api<any, Definitions, any, any, CoreModule>;
  moduleOptions: Required<AngularHooksModuleOptions>;
  serializeQueryArgs: SerializeQueryArgs<any>;
  context: ApiContext<Definitions>;
}) {
  return { buildQueryHooks, buildMutationHook, usePrefetch };

  function queryStatePreSelector(
    currentState: QueryResultSelectorResult<any>,
    lastResult: UseQueryStateDefaultResult<any> | undefined,
    queryArgs: any,
  ): UseQueryStateDefaultResult<any> {
    // if we had a last result and the current result is uninitialized,
    // we might have called `api.util.resetApiState`
    // in this case, reset the hook
    if (lastResult?.endpointName && currentState.isUninitialized) {
      const { endpointName } = lastResult;
      const endpointDefinition = context.endpointDefinitions[endpointName];
      if (
        serializeQueryArgs({
          queryArgs: lastResult.originalArgs,
          endpointDefinition,
          endpointName,
        }) ===
        serializeQueryArgs({
          queryArgs,
          endpointDefinition,
          endpointName,
        })
      )
        lastResult = undefined;
    }

    // data is the last known good request result we have tracked
    // or if none has been tracked yet the last good result for the current args
    let data = currentState.isSuccess ? currentState.data : lastResult?.data;
    if (data === undefined) data = currentState.data;

    const hasData = data !== undefined;

    // isFetching = true any time a request is in flight
    const isFetching = currentState.isLoading;
    // isLoading = true only when loading while no data is present yet (initial load with no data in the cache)
    const isLoading = !hasData && isFetching;
    // isSuccess = true when data is present
    const isSuccess = currentState.isSuccess || (isFetching && hasData);

    return {
      ...currentState,
      data,
      currentData: currentState.data,
      isFetching,
      isLoading,
      isSuccess,
    } as UseQueryStateDefaultResult<any>;
  }

  function usePrefetch<EndpointName extends QueryKeys<Definitions>>(
    endpointName: EndpointName,
    defaultOptions?: PrefetchOptions,
  ) {
    return (arg: any, options?: PrefetchOptions) =>
      dispatch((api.util.prefetch as GenericPrefetchThunk)(endpointName, arg, { ...defaultOptions, ...options }));
  }

  function buildQueryHooks(name: string): QueryHooks<any> {
    const { initiate, select } = api.endpoints[name] as ApiEndpointQuery<
      QueryDefinition<any, any, any, any, any>,
      Definitions
    >;
    type ApiRootState = Parameters<ReturnType<typeof select>>[0];

    const useQuerySubscription: UseQuerySubscription<any> = (
      arg: any,
      { refetchOnReconnect, refetchOnFocus, refetchOnMountOrArgChange, skip = false, pollingInterval = 0 } = {},
      promiseRef = {},
      argCacheRef = {},
      lastRenderHadSubscription = { current: false },
    ) => {
      const stableArg = useStableQueryArgs(
        skip ? skipToken : arg,
        // Even if the user provided a per-endpoint `serializeQueryArgs` with
        // a consistent return value, _here_ we want to use the default behavior
        // so we can tell if _anything_ actually changed. Otherwise, we can end up
        // with a case where the query args did change but the serialization doesn't,
        // and then we never try to initiate a refetch.
        defaultSerializeQueryArgs,
        context.endpointDefinitions[name],
        name,
        argCacheRef,
      );
      const subscriptionOptions = { refetchOnReconnect, refetchOnFocus, pollingInterval };

      const { queryCacheKey, requestId } = promiseRef.current || {};

      // HACK Because the latest state is in the middleware, we actually
      // dispatch an action that will be intercepted and returned.
      let currentRenderHasSubscription = false;
      if (queryCacheKey && requestId) {
        // This _should_ return a boolean, even if the types don't line up
        const returnedValue = dispatch(
          api.internalActions.internal_probeSubscription({
            queryCacheKey,
            requestId,
          }),
        );

        if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
          if (typeof returnedValue !== 'boolean') {
            throw new Error(
              `Warning: Middleware for RTK-Query API at reducerPath "${api.reducerPath}" has not
              been added to the store. You must add the middleware for RTK-Query to function correctly!`,
            );
          }
        }

        currentRenderHasSubscription = !!returnedValue;
      }

      const subscriptionRemoved = !currentRenderHasSubscription && lastRenderHadSubscription.current;
      lastRenderHadSubscription.current = currentRenderHasSubscription;
      if (subscriptionRemoved) {
        promiseRef.current?.unsubscribe();
        promiseRef.current = undefined;
      }

      if (stableArg !== skipToken) {
        const lastPromise = promiseRef?.current;
        const lastSubscriptionOptions = promiseRef.current?.subscriptionOptions;

        if (!lastPromise || lastPromise.arg !== stableArg) {
          lastPromise?.unsubscribe();
          promiseRef.current = dispatch(
            initiate(stableArg, { subscriptionOptions, forceRefetch: refetchOnMountOrArgChange }),
          );
        } else if (!shallowEqual(subscriptionOptions, lastSubscriptionOptions)) {
          lastPromise.updateSubscriptionOptions(subscriptionOptions);
        }
      }

      return {
        /**
         * A method to manually refetch data for the query
         */
        refetch: () => {
          if (!promiseRef.current) throw new Error('Cannot refetch a query that has not been started yet.');
          return promiseRef.current?.refetch();
        },
      };
    };

    const useLazyQuerySubscription: UseLazyQuerySubscription<any> = (
      { refetchOnReconnect, refetchOnFocus, pollingInterval = 0 } = {},
      promiseRef = {},
    ) => {
      let argState: any = UNINITIALIZED_VALUE;
      const subscriptionOptions = { refetchOnReconnect, refetchOnFocus, pollingInterval };

      const lastSubscriptionOptions = promiseRef.current?.subscriptionOptions;
      if (!shallowEqual(subscriptionOptions, lastSubscriptionOptions)) {
        promiseRef.current?.updateSubscriptionOptions(subscriptionOptions);
      }

      const trigger: UseLazyTrigger<any> = (arg: any, { preferCacheValue = false } = {}) => {
        promiseRef.current?.unsubscribe();

        const promise = dispatch(initiate(arg, { subscriptionOptions, forceRefetch: !preferCacheValue }));

        promiseRef.current = promise;
        argState = arg;

        return promise;
      };

      /* if "cleanup on unmount" was triggered from a fast refresh, we want to reinstate the query */
      if (argState !== UNINITIALIZED_VALUE && !promiseRef.current) {
        trigger(argState, { preferCacheValue: true });
      }

      return [trigger, argState] as const;
    };

    const useQueryState: UseQueryState<any> = (
      arg: any,
      { skip = false, selectFromResult } = {},
      lastValue = {},
      argCacheRef = {},
    ) => {
      const arg$ = isObservable(arg) ? arg : of(arg);
      return arg$.pipe(
        map((currentArg) =>
          useStableQueryArgs(
            skip ? skipToken : currentArg,
            serializeQueryArgs,
            context.endpointDefinitions[name],
            name,
            argCacheRef,
          ),
        ),
        distinctUntilChanged(shallowEqual),
        switchMap((stableArg) => {
          const selectDefaultResult = createSelectorFactory<ApiRootState, any>((projector) =>
            defaultMemoize(projector, shallowEqual, shallowEqual),
          )(select(stableArg), (subState: any) => queryStatePreSelector(subState, lastValue.current, stableArg));

          const querySelector = selectFromResult
            ? createSelectorFactory<ApiRootState, any>((projector) =>
                defaultMemoize(projector, shallowEqual, shallowEqual),
              )(selectDefaultResult, selectFromResult)
            : selectDefaultResult;

          return useSelector((state: RootState<Definitions, any, any>) => querySelector(state)).pipe(
            tap(() => (lastValue.current = selectDefaultResult(getState()))),
          );
        }),
        shareReplay({
          bufferSize: 1,
          refCount: true,
        }),
      );
    };

    const useQuery: UseQuery<any> = (arg, options) => {
      // Refs
      const promiseRef: { current?: QueryActionCreatorResult<any> } = {};
      const lastValue: { current?: any } = {};
      const argRef: { current?: any } = {};

      const arg$ = isObservable(arg) ? arg : of(arg);
      const options$ = isObservable(options) ? options : of(options);

      return combineLatest([arg$, options$.pipe(distinctUntilChanged((prev, curr) => shallowEqual(prev, curr)))]).pipe(
        switchMap(([currentArg, currentOptions]) => {
          const querySubscriptionResults = useQuerySubscription(currentArg, currentOptions, promiseRef, argRef);
          const queryStateResults$ = useQueryState(
            currentArg,
            {
              selectFromResult:
                currentArg === skipToken || currentOptions?.skip ? undefined : noPendingQueryStateSelector,
              ...currentOptions,
            },
            lastValue,
            argRef,
          );
          return queryStateResults$.pipe(map((queryState) => ({ ...queryState, ...querySubscriptionResults })));
        }),
        shareReplay({
          bufferSize: 1,
          refCount: true,
        }),
        finalize(() => {
          void promiseRef.current?.unsubscribe();
          promiseRef.current = undefined;
        }),
      );
    };

    const useLazyQuery: UseLazyQuery<any> = (options) => {
      // Refs
      const promiseRef: { current?: QueryActionCreatorResult<any> } = {};
      const lastValue: { current?: any } = {};
      const triggerRef: { current?: UseLazyTrigger<any> } = {};
      const argRef: { current?: any } = {};

      const infoSubject = new BehaviorSubject<UseLazyQueryLastPromiseInfo<any>>({ lastArg: UNINITIALIZED_VALUE });
      const info$ = infoSubject.asObservable();
      const options$ = isObservable(options) ? options : of(options);

      const state$ = combineLatest([
        options$.pipe(
          distinctUntilChanged((prev, curr) => shallowEqual(prev, curr)),
          tap((currentOptions) => {
            const [trigger] = useLazyQuerySubscription(currentOptions, promiseRef);
            triggerRef.current = trigger;
          }),
        ),
        info$.pipe(
          tap(({ lastArg, extra }) => {
            if (lastArg !== UNINITIALIZED_VALUE) {
              triggerRef.current?.(lastArg, extra);
            }
          }),
          map(({ lastArg }) => lastArg),
          distinctUntilChanged(shallowEqual),
        ),
      ]).pipe(
        switchMap(([currentOptions, currentArg]) =>
          useQueryState(
            currentArg,
            {
              ...currentOptions,
              skip: currentArg === UNINITIALIZED_VALUE,
            },
            lastValue,
            argRef,
          ),
        ),
        shareReplay({
          bufferSize: 1,
          refCount: true,
        }),
        finalize(() => {
          void promiseRef.current?.unsubscribe();
          promiseRef.current = undefined;
        }),
      );

      return {
        fetch: (arg, extra) => {
          infoSubject.next({ lastArg: arg, extra });
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return promiseRef.current!;
        },
        state$,
        lastArg$: info$.pipe(map(({ lastArg }) => (lastArg !== UNINITIALIZED_VALUE ? lastArg : skipToken))),
      };
    };

    return {
      useQueryState,
      useQuerySubscription,
      useLazyQuerySubscription,
      useLazyQuery,
      useQuery,
      selector: select as QuerySelector<any>,
    };
  }

  function buildMutationHook(name: string): MutationHooks<any> {
    const { initiate, select } = api.endpoints[name] as ApiEndpointMutation<
      MutationDefinition<any, any, any, any, any>,
      Definitions
    >;

    const useMutation: UseMutation<any> = ({ selectFromResult = defaultMutationStateSelector, fixedCacheKey } = {}) => {
      const promiseRef: { current?: MutationActionCreatorResult<any> } = {};
      const requestIdSubject = new BehaviorSubject<string | undefined>(undefined);
      const requestId$ = requestIdSubject.asObservable();

      const triggerMutation = (arg: Parameters<typeof initiate>['0']) => {
        const promise = dispatch(initiate(arg, { fixedCacheKey }));
        if (!promiseRef.current?.arg.fixedCacheKey) {
          removePrevMutation();
        }

        promiseRef.current = promise;
        requestIdSubject.next(promise.requestId);

        return promise;
      };

      const reset = () => {
        removePrevMutation();
        requestIdSubject.next(undefined);
      };

      const removePrevMutation = () => {
        if (promiseRef.current) {
          dispatch(
            api.internalActions.removeMutationResult({ requestId: promiseRef.current.requestId, fixedCacheKey }),
          );
          promiseRef.current = undefined;
        }
      };

      const state$ = requestId$.pipe(
        finalize(() => {
          promiseRef.current?.reset();
          promiseRef.current = undefined;
        }),
        distinctUntilChanged(shallowEqual),
        switchMap((requestId) => {
          const mutationSelector = createSelectorFactory((projector) =>
            defaultMemoize(projector, shallowEqual, shallowEqual),
          )(select(requestId ? { fixedCacheKey, requestId } : skipToken), (subState: any) =>
            selectFromResult(subState),
          );
          const currentState = useSelector((state: RootState<Definitions, any, any>) => mutationSelector(state));
          const originalArgs = fixedCacheKey == null ? promiseRef.current?.arg.originalArgs : undefined;
          return currentState.pipe(map((mutationState) => ({ ...mutationState, originalArgs, reset })));
        }),
        shareReplay({
          bufferSize: 1,
          refCount: true,
        }),
      );

      return { dispatch: triggerMutation, state$ } as const;
    };

    return {
      useMutation,
      selector: select as MutationSelector<any>,
    };
  }
}
