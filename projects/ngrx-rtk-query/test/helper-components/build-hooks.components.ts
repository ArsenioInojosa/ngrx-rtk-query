import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, NgModule, ViewChild } from '@angular/core';
import { SerializedError } from '@reduxjs/toolkit';
import { SubscriptionOptions } from '@reduxjs/toolkit/dist/query/core/apiState';
import { LazyQueryOptions } from 'ngrx-rtk-query';
import { BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { expectExactType, expectType, useRenderCounter } from '../helper';
import { api, defaultApi, invalidationsApi, libPostsApi, mutationApi, Post } from '../helper-apis';

class BaseRenderCounterComponent {
  renderCounter = useRenderCounter();
}

@Component({
  selector: 'lib-test-query-base',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="query$ | async as query">
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FetchingBaseComponent extends BaseRenderCounterComponent {
  query$ = api.endpoints.getUser.useQuery(1);
}

@Component({
  selector: 'lib-test-query',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="query$ | async as query">
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
      <button type="button" (click)="increment()">Increment value</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FetchingComponent extends BaseRenderCounterComponent {
  value = new BehaviorSubject<number>(0);
  value$ = this.value.asObservable();

  query$ = api.endpoints.getUser.useQuery(1, this.value$.pipe(map((value) => ({ skip: value < 1 }))));

  increment(): void {
    // eslint-disable-next-line rxjs/no-subject-value
    this.value.next(this.value.getValue() + 1);
  }
}

@Component({
  selector: 'lib-test-query',
  template: `
    <div *ngIf="query$ | async as query">
      <div data-testid="isLoading">{{ '' + query.isLoading }}</div>
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
      <button type="button" (click)="increment()">Increment value</button>
      <button type="button" (click)="query.refetch()">Refetch</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingComponent {
  value = new BehaviorSubject<number>(0);
  value$ = this.value.asObservable();

  query$ = api.endpoints.getUser.useQuery(2, this.value$.pipe(map((value) => ({ skip: value < 1 }))));

  increment(): void {
    // eslint-disable-next-line rxjs/no-subject-value
    this.value.next(this.value.getValue() + 1);
  }
}

@Component({
  selector: 'lib-test-fetching-query',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="query$ | async as query">
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
      <div data-testid="isLoading">{{ '' + query.isLoading }}</div>
      <button type="button" (click)="increment()">Increment value</button>
      <button type="button" (click)="query.refetch()">Refetch</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FetchingLoadingComponent extends BaseRenderCounterComponent {
  value = new BehaviorSubject<number>(0);
  value$ = this.value.asObservable();

  query$ = api.endpoints.getUser.useQuery(22, this.value$.pipe(map((value) => ({ skip: value < 1 }))));

  increment(): void {
    // eslint-disable-next-line rxjs/no-subject-value
    this.value.next(this.value.getValue() + 1);
  }
}

@Component({
  selector: 'lib-test-fetching-query',
  template: `
    <div *ngIf="query$ | async as query">
      <div data-testid="status">{{ '' + query.status === 'fulfilled' && query.originalArgs }}</div>
      <button type="button" (click)="increment()">Increment value</button>
      {{ update(query.isLoading, query.isFetching) }}
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FetchingLoadingAltComponent {
  loadingHist: boolean[] = [];
  fetchingHist: boolean[] = [];

  value = new BehaviorSubject<number>(101);
  value$ = this.value.asObservable();
  query$ = api.endpoints.getUser.useQuery(this.value$);

  increment(): void {
    // eslint-disable-next-line rxjs/no-subject-value
    this.value.next(this.value.getValue() + 1);
  }

  update(isLoading: boolean, isFetching: boolean): void {
    if (this.loadingHist[this.loadingHist.length - 1] !== isLoading) {
      this.loadingHist.push(isLoading);
    }
    if (this.fetchingHist[this.fetchingHist.length - 1] !== isFetching) {
      this.fetchingHist.push(isFetching);
    }
  }
}

@Component({
  selector: 'lib-test-query',
  template: `
    <div *ngIf="query$ | async as query">
      <div data-testid="isLoading">{{ '' + query.isLoading }}</div>
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
      <div data-testid="amount">{{ '' + query.data?.amount }}</div>
    </div>
  `,
})
export class RefetchOnMountComponent {
  query$ = api.endpoints.getIncrementedAmount.useQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
}

@Component({
  selector: 'lib-test-query',
  template: `
    <div *ngIf="query$ | async as query">
      <div data-testid="isLoading">{{ '' + query.isLoading }}</div>
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
      <div data-testid="amount">{{ '' + query.data?.amount }}</div>
      <button (click)="toggleSkip()">change skip</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefetchOnMountSkipComponent {
  skip = new BehaviorSubject<boolean>(true);
  skip$ = this.skip.asObservable();

  query$ = api.endpoints.getIncrementedAmount.useQuery(
    undefined,
    this.skip$.pipe(map((skip) => ({ refetchOnMountOrArgChange: 0.5, skip }))),
  );

  toggleSkip(): void {
    // eslint-disable-next-line rxjs/no-subject-value
    this.skip.next(!this.skip.getValue());
  }
}

@Component({
  selector: 'lib-item-list-query',
  template: `
    {{ renderCounter.increment() }}
    {{ setIds() }}
    <div *ngIf="query$ | async as query">
      <button (click)="setPageNumber()">Next Page</button>
      <ul>
        <li *ngFor="let id of ids">ID: {{ id }}</li>
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemListComponent extends BaseRenderCounterComponent {
  page = new BehaviorSubject<{ pageNumber: number }>({ pageNumber: 0 });
  pageNumber$ = this.page.asObservable();
  ids = [0];

  query$ = api.useListItemsQuery(this.pageNumber$);

  setPageNumber(): void {
    this.page.next({ pageNumber: this.page.getValue().pageNumber + 1 });
  }

  setIds(): void {
    this.ids = Array(this.renderCounter.getRenderCount())
      .fill(1)
      .map((x, i) => i);
    console.log(this.ids);
  }
}

@Component({
  selector: 'lib-test-mutation',
  template: `
    <div *ngIf="updateUserMutation.state$ | async as updateUser">
      <div data-testid="isLoading">{{ '' + updateUser.isLoading }}</div>
      <div data-testid="result">{{ stringify(updateUser.data) }}</div>
      <button (click)="updateUserMutation.dispatch({ name: 'Banana' })">Update User</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MutationComponent {
  updateUserMutation = api.endpoints.updateUser.useMutation();

  // no pipes here
  stringify(data: any): string {
    return JSON.stringify(data);
  }
}

@Component({
  selector: 'lib-test-mutation',
  template: `
    <div *ngIf="updateUserMutation.state$ | async as updateUser">
      <button (click)="handleClick()">Update User and abort</button>
      <div>{{ successMsg }}</div>
      <div>{{ errMsg }}</div>
      <div>{{ isAborted ? 'Request was aborted' : '' }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MutationAbortComponent {
  updateUserMutation = api.endpoints.updateUser.useMutation();
  successMsg = '';
  errMsg = '';
  isAborted = false;

  async handleClick(): Promise<void> {
    const res = this.updateUserMutation.dispatch({ name: 'Banana' });

    // no-op simply for clearer type assertions
    res.then((result) => {
      expectExactType<
        | {
            error: { status: number; data: unknown } | SerializedError;
          }
        | {
            data: {
              name: string;
            };
          }
      >(result);
    });

    expectType<{
      endpointName: string;
      originalArgs: { name: string };
      track?: boolean;
    }>(res.arg);
    expectType<string>(res.requestId);
    expectType<() => void>(res.abort);
    expectType<() => Promise<{ name: string }>>(res.unwrap);
    expectType<() => void>(res.unsubscribe);

    // abort the mutation immediately to force an error
    res.abort();
    res
      .unwrap()
      .then((result) => {
        expectType<{ name: string }>(result);
        this.successMsg = `Successfully updated user ${result.name}`;
      })
      .catch((err) => {
        this.errMsg = `An error has occurred updating user ${res.arg.originalArgs.name}`;
        if (err.name === 'AbortError') {
          this.isAborted = true;
        }
      });
  }
}

/**
 * Prefetch Query
 */

export const HIGH_PRIORITY_USER_ID = 4;
@Component({
  selector: 'lib-test-prefetch',
  template: `
    <div *ngIf="query$ | async as query">
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
      <button data-testid="highPriority" (mouseenter)="prefetchUser()">High priority action intent</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrefetchHighPriorityComponent {
  query$ = api.endpoints.getUser.useQuery(HIGH_PRIORITY_USER_ID);

  prefetchUser(): void {
    api.usePrefetch('getUser', { force: true })(HIGH_PRIORITY_USER_ID, { force: true });
  }
}

export const LOW_PRIORITY_USER_ID = 2;
@Component({
  selector: 'lib-test-prefetch',
  template: `
    <div *ngIf="query$ | async as query">
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
      <button data-testid="lowPriority" (mouseenter)="prefetchUser()">Low priority user action intent</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrefetchLowPriorityComponent {
  query$ = api.endpoints.getUser.useQuery(LOW_PRIORITY_USER_ID);

  prefetchUser(): void {
    api.usePrefetch('getUser', { force: false })(LOW_PRIORITY_USER_ID);
  }
}

@Component({
  selector: 'lib-test-prefetch',
  template: `
    <div>
      <button data-testid="lowPriority" (mouseenter)="prefetchUser()">Low priority user action intent</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrefetchUncachedComponent {
  prefetchUser(): void {
    api.usePrefetch('getUser', { ifOlderThan: 10 })(LOW_PRIORITY_USER_ID);
  }
}

/**
 * Lazy Query
 */

@Component({
  selector: 'lib-test-lazy-query-base',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="userQueryState$ | async as query">
      <div data-testid="isUninitialized">{{ '' + query.isUninitialized }}</div>
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>

      <button data-testid="fetchButton" (click)="userQuery.fetch(1)">fetchUser</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyFetchingBaseComponent extends BaseRenderCounterComponent {
  userQuery = api.endpoints.getUser.useLazyQuery();
  userQueryState$ = this.userQuery.state$.pipe(tap(({ data }) => (this.data = data)));
  data: any;
}

@Component({
  selector: 'lib-test-lazy-query',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="userQueryState$ | async as query">
      <div data-testid="isUninitialized">{{ '' + query.isUninitialized }}</div>
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>

      <button data-testid="fetchButton" (click)="userQuery.fetch(1)">fetchUser</button>
      <button data-testid="updateOptions" (click)="updateOptions()">updateOptions</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyFetchingComponent extends BaseRenderCounterComponent {
  options$ = new BehaviorSubject<LazyQueryOptions>({});
  optionsObs$ = this.options$.asObservable();

  userQuery = api.endpoints.getUser.useLazyQuery(this.optionsObs$);
  userQueryState$ = this.userQuery.state$.pipe(tap(({ data }) => (this.data = data)));
  data: any;

  updateOptions(pollingInterval = 1000): void {
    this.options$.next({ pollingInterval });
  }
}

@Component({
  selector: 'lib-test-lazy-query-multi',
  template: `
    <div *ngIf="userQueryState$ | async as query">
      <div data-testid="isUninitialized">{{ '' + query.isUninitialized }}</div>
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>

      <button data-testid="fetchUser1" (click)="userQuery.fetch(1)">fetchUser1</button>
      <button data-testid="fetchUser2" (click)="userQuery.fetch(2)">fetchUser2</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyFetchingMultiComponent {
  userQuery = api.endpoints.getUser.useLazyQuery();
  userQueryState$ = this.userQuery.state$.pipe(tap(({ data }) => (this.data = data)));
  data: any;
}

@Component({
  selector: 'lib-test-lazy-query-callback',
  template: `
    <div *ngIf="userQuery.state$ | async as query">
      <button (click)="handleClick(false)">Fetch User successfully</button>
      <button (click)="handleClick(true)">Fetch User and abort</button>

      <div>{{ successMsg }}</div>
      <div>{{ errMsg }}</div>
      <div>{{ isAborted ? 'Request was aborted' : '' }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyFetchingCallbackComponent {
  userQuery = api.endpoints.getUser.useLazyQuery();
  successMsg = '';
  errMsg = '';
  isAborted = false;

  handleClick(abort: boolean): void {
    const res = this.userQuery.fetch(1);

    // no-op simply for clearer type assertions
    res.then((result) => {
      if (result.isSuccess) {
        expectType<{
          data: {
            name: string;
          };
        }>(result);
      }
      if (result.isError) {
        expectType<{
          error: { status: number; data: unknown } | SerializedError;
        }>(result);
      }
    });

    expectType<number>(res.arg);
    expectType<string>(res.requestId);
    expectType<() => void>(res.abort);
    expectType<() => Promise<{ name: string }>>(res.unwrap);
    expectType<() => void>(res.unsubscribe);
    expectType<(options: SubscriptionOptions) => void>(res.updateSubscriptionOptions);
    expectType<() => void>(res.refetch);

    // abort the query immediately to force an error
    if (abort) res.abort();
    res
      .unwrap()
      .then((result) => {
        expectType<{ name: string }>(result);

        this.successMsg = `Successfully fetched user ${result.name}`;
        this.errMsg = '';
        this.isAborted = false;
      })
      .catch((err) => {
        this.successMsg = '';
        this.errMsg = `An error has occurred fetching userId: ${res.arg}`;
        this.isAborted = err.name === 'AbortError';
      });
  }
}

@Component({
  selector: 'lib-test-lazy-query-callback-adv',
  template: `
    <div *ngIf="userQuery.state$ | async as query">
      <button (click)="handleClick()">Fetch User</button>

      <div data-testid="result">{{ stringify(query.data) }}</div>
      <div data-testid="error">{{ stringify(query.error) }}</div>
      <div data-testid="unwrappedError">{{ stringify(unwrappedError) }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyFetchingCbAdvComponent {
  userQuery = api.endpoints.getUserAndForceError.useLazyQuery();
  unwrappedError: any;

  async handleClick(): Promise<void> {
    const res = this.userQuery.fetch(1);

    try {
      await res.unwrap();
    } catch (error) {
      this.unwrappedError = error;
    }
  }

  // no pipes here
  stringify(data: any): string {
    return JSON.stringify(data);
  }
}

@Component({
  selector: 'lib-test-lazy-query-callback-user-adv',
  template: `
    <div *ngIf="userQuery.state$ | async as query">
      <button (click)="handleClick()">Fetch User</button>

      <div data-testid="result">{{ stringify(query.data) }}</div>
      <div data-testid="error">{{ stringify(query.error) }}</div>
      <div data-testid="unwrappedResult">{{ stringify(unwrappedResult) }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyFetchingCbUserAdvComponent {
  userQuery = api.endpoints.getUser.useLazyQuery();
  unwrappedResult?: { name: string };

  async handleClick(): Promise<void> {
    this.unwrappedResult = await this.userQuery.fetch(1).unwrap();
  }

  // no pipes here
  stringify(data: any): string {
    return JSON.stringify(data);
  }
}

/**
 *  Query Invalidations
 */

@Component({
  selector: 'lib-test-invalidations',
  template: `
    <div *ngIf="checkSessionQuery$ | async as query">
      <div data-testid="isLoading">{{ '' + query.isLoading }}</div>
      <div data-testid="isError">{{ '' + query.isError }}</div>
      <div data-testid="user">{{ stringify(query.data) }}</div>
      <div *ngIf="loginMutation.state$ | async as loginMutation" data-testid="loginLoading">
        {{ '' + loginMutation.isLoading }}
      </div>
      <button data-testid="updatePost" (click)="login()">Login</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvalidationsComponent {
  checkSessionQuery$ = invalidationsApi.endpoints.checkSession.useQuery();
  loginMutation = invalidationsApi.endpoints.login.useMutation();

  login(): void {
    this.loginMutation.dispatch(null);
  }

  // no pipes here
  stringify(data: any): string {
    return JSON.stringify(data);
  }
}

/**
 * createApi defaults
 */

@Component({
  selector: 'lib-test-query-defaults',
  template: `
    <div *ngIf="query$ | async as query">
      <div data-testid="isLoading">{{ '' + query.isLoading }}</div>
      <div data-testid="isFetching">{{ '' + query.isFetching }}</div>
      <div data-testid="amount">{{ '' + query.data?.amount }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefetchOnMountDefaultsComponent {
  query$ = defaultApi.endpoints.getIncrementedAmount.useQuery();
}

/**
 *  Mutations / selectFromResult
 */

@Component({
  selector: 'lib-test-select-mutations',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="increment.state$ | async as incrementState">
      <button data-testid="incrementButton" (click)="increment.dispatch(1)"></button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MutationSelectComponent extends BaseRenderCounterComponent {
  increment = mutationApi.endpoints.increment.useMutation({ selectFromResult: () => ({}) });
}

@Component({
  selector: 'lib-test-select-mutations-data',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="increment.state$ | async as incrementState">
      <button data-testid="incrementButton" (click)="increment.dispatch(1)"></button>
      <div data-testid="data">{{ stringify(incrementState.data) }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MutationSelectDataComponent extends BaseRenderCounterComponent {
  increment = mutationApi.endpoints.increment.useMutation({ selectFromResult: ({ data }) => ({ data }) });

  stringify(data: any): string {
    return JSON.stringify(data);
  }
}

@Component({
  selector: 'lib-test-select-mutations-default',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="increment.state$ | async as incrementState">
      <button data-testid="incrementButton" (click)="increment.dispatch(1)"></button>
      <div data-testid="status">{{ incrementState.status }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MutationSelectDefaultComponent extends BaseRenderCounterComponent {
  increment = mutationApi.endpoints.increment.useMutation();
}

@Component({
  selector: 'lib-test-mutation-originalargs',
  template: `
    <div *ngIf="update.state$ | async as updateState">
      <button data-testid="updateButton" (click)="update.dispatch({ name: 'Foo' })"></button>
      <div data-testid="originalArgs">{{ stringify(updateState.originalArgs) }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MutationOriginalArgsComponent {
  update = api.endpoints.updateUser.useMutation();

  // no pipes here
  stringify(data: any): string {
    return JSON.stringify(data);
  }
}

@Component({
  selector: 'lib-test-mutation-reset',
  template: `
    <div *ngIf="update.state$ | async as updateState">
      <span>
        {{ updateState.isUninitialized ? 'isUninitialized' : updateState.isSuccess ? 'isSuccess' : 'other' }}
      </span>
      <span>{{ updateState.originalArgs?.name }}</span>
      <button (click)="update.dispatch({ name: 'Yay' })">trigger</button>
      <button (click)="updateState.reset()">reset</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MutationResetComponent {
  update = api.endpoints.updateUser.useMutation();

  // no pipes here
  stringify(data: any): string {
    return JSON.stringify(data);
  }
}

@Component({
  selector: 'lib-test-post',
  template: `
    <div *ngIf="postsQuery$ | async as postsQuery">
      <button data-testid="addPost" (click)="addPost(postsQuery.data)">Add random post</button>
      <button data-testid="updatePost" (click)="updatePost()">Update post</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostComponent {
  postsQuery$ = libPostsApi.endpoints.getPosts.useQuery();
  addPostMutation = libPostsApi.endpoints.addPost.useMutation();
  updatePostMutation = libPostsApi.endpoints.updatePost.useMutation();

  addPost(posts: Post[] | undefined): void {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    this.addPostMutation.dispatch({ name: `some text ${posts?.length}`, fetched_at: new Date().toISOString() });
  }

  updatePost(): void {
    this.updatePostMutation.dispatch({ id: 1, name: 'supercoooll!' });
  }
}

@Component({
  selector: 'lib-test-selected-post',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="postQuery$ | async as postQuery">
      <div data-testid="postName">{{ postQuery.post?.name }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedPostComponent extends BaseRenderCounterComponent {
  /**
   * Notes on the renderCount behavior
   *
   * We initialize at 0, and the first render will bump that 1 while post is `undefined`.
   * Once the request resolves, it will be at 2. What we're looking for is to make sure that
   * any requests that don't directly change the value of the selected item will have no impact
   * on rendering.
   */

  postQuery$ = libPostsApi.endpoints.getPosts.useQueryState(undefined, {
    selectFromResult: ({ data }) => ({ post: data?.find((post) => post.id === 1) }),
  });
}

@Component({
  selector: 'lib-test-selected-post-hook',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="postQuery$ | async as postQuery">
      <div data-testid="postName">{{ postQuery.post?.name }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedPostHookComponent extends BaseRenderCounterComponent {
  postQuery$ = libPostsApi.endpoints.getPosts.useQuery(undefined, {
    selectFromResult: ({ data }) => ({ post: data?.find((post) => post.id === 1) }),
  });
}

@Component({
  selector: 'lib-test-selected-post-all-flags-hook',
  template: `
    {{ renderCounter.increment() }}
    <div *ngIf="postQuery$ | async as postQuery">
      <div data-testid="postName">{{ postQuery.post?.name }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectedPostAllFlagsHookComponent extends BaseRenderCounterComponent {
  postQuery$ = libPostsApi.endpoints.getPosts.useQuery(undefined, {
    selectFromResult: ({ data, isUninitialized, isLoading, isFetching, isSuccess, isError }) => ({
      post: data?.find((post) => post.id === 1),
      isUninitialized,
      isLoading,
      isFetching,
      isSuccess,
      isError,
    }),
  });
}

@Component({
  selector: 'lib-test-posts-container',
  template: `
    <div>
      <lib-test-post></lib-test-post>
      <lib-test-selected-post></lib-test-selected-post>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostsContainerComponent {
  @ViewChild(SelectedPostComponent) selectedPost!: SelectedPostComponent;
}

@Component({
  selector: 'lib-test-posts-container-hook',
  template: `
    <div>
      <lib-test-post></lib-test-post>
      <lib-test-selected-post-hook></lib-test-selected-post-hook>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostsHookContainerComponent {
  @ViewChild(SelectedPostHookComponent) selectedPost!: SelectedPostHookComponent;
}

@Component({
  selector: 'lib-test-posts-container-all-flags-hook',
  template: `
    <div>
      <lib-test-post></lib-test-post>
      <lib-test-selected-post-all-flags-hook></lib-test-selected-post-all-flags-hook>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostsHookContainerAllFlagsComponent {
  @ViewChild(SelectedPostAllFlagsHookComponent) selectedPost!: SelectedPostAllFlagsHookComponent;
}
@NgModule({
  declarations: [
    PostsContainerComponent,
    PostsHookContainerComponent,
    PostsHookContainerAllFlagsComponent,
    PostComponent,
    SelectedPostComponent,
    SelectedPostHookComponent,
    SelectedPostAllFlagsHookComponent,
  ],
  imports: [CommonModule],
})
export class PostLibTestModule {}

@Component({
  selector: 'lib-test-query-expect-error',
  template: `
    <div *ngIf="res2$ | async as res2">
      <div data-testid="size2">{{ res2.size }}</div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoObjectQueryComponent {
  _res1$ = libPostsApi.endpoints.getPosts.useQuery({
    // @ts-expect-error selectFromResult must always return an object
    selectFromResult: ({ data }) => data?.length ?? 0,
  });

  res2$ = libPostsApi.endpoints.getPosts.useQuery(undefined, {
    // selectFromResult must always return an object
    selectFromResult: ({ data }) => ({ size: data?.length ?? 0 }),
  });
}

@Component({
  selector: 'lib-test-mutation-expect-error',
  template: `
    <div *ngIf="increment.state$ | async as incrementState">
      <button data-testid="incrementButton" (click)="increment.dispatch(1)"></button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoObjectMutationComponent {
  increment = mutationApi.endpoints.increment.useMutation({
    // @ts-expect-error selectFromResult must always return an object
    selectFromResult: () => 42,
  });
}

/**
 * Skip
 */

@Component({
  selector: 'lib-test-skip',
  template: ` <div *ngIf="query$ | async as query"></div> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipComponent {
  query$ = api.endpoints.getUser.useQuery(1, { skip: true });
}

/**
 * ResetApiState
 */

@Component({
  selector: 'lib-test-reset-api-state',
  template: ` <div *ngIf="query$ | async as query">{{ stringify(query) }}</div> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetApiStateComponent {
  query$ = api.endpoints.getUser.useQuery(5).pipe(tap((result) => (this.result = result)));
  result: any;

  // no pipes here
  stringify(data: any): string {
    return JSON.stringify(data);
  }
}
