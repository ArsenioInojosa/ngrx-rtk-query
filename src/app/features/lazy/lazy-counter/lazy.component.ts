import { Component, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';

import { counterApiEndpoints, useGetCountByIdQuery, useLazyGetCountByIdQuery } from '@app/core/services';

const { getCountById } = counterApiEndpoints;

@Component({
  selector: 'app-lazy',
  template: `
    <div *ngIf="countQuery.state$ | async as countQuery" class="space-y-6">
      <form [formGroup]="form" (ngSubmit)="startCounterById(form.value)">
        <h1 class="text-xl font-semibold">Start Lazy Counter</h1>
        <div>
          <input type="text" placeholder="Type counter id" formControlName="id" />
          <button class="btn btn-primary m-4" type="submit" [disabled]="form.invalid || countQuery.isLoading">
            {{ countQuery.isLoading ? 'Starting...' : 'Start Counter' }}
          </button>
          <label class="space-x-2 text-sm" for="preferCacheValue">
            <input id="preferCacheValue" type="checkbox" formControlName="preferCacheValue" />
            <span>Prefer Cache (No fetch if counter exists with same id in cache)</span>
          </label>
        </div>
      </form>

      <section class="space-y-4">
        <h1 class="text-md font-medium">Current id: {{ countQuery.originalArgs || 'Not Started' }}</h1>
        <app-counter-row [counterData]="countQuery"></app-counter-row>
      </section>
    </div>

    <div class="mt-8 space-y-8">
      <section *ngIf="countQuery.state$ | async as countQuery" class="space-y-4">
        <h1 class="text-md font-medium">Duplicate state (Share state, subscription & selectFromResult)</h1>
        <h1 class="text-sm">Use in same component (not subscripted by self)</h1>
        <app-counter-row [counterData]="countQuery"></app-counter-row>
      </section>

      <section *ngIf="selectFromState$ | async as countQuery" class="space-y-4">
        <h1 class="text-md font-medium">Select from state (Share state & subscription, another selectFromResult)</h1>
        <h1 class="text-sm">Use in same component or child components (not subscripted by self)</h1>
        <app-counter-row [counterData]="countQuery"></app-counter-row>
      </section>

      <section *ngIf="countQuery$ | async as countQuery" class="space-y-4">
        <h1 class="text-md font-medium">
          Related Query (Share cache data / another subscription & selectFromResult or Options)
        </h1>
        <h1 class="text-sm">Use anywhere (subscripted by self), skip subscribe with uninitialized value</h1>
        <app-counter-row [counterData]="countQuery"></app-counter-row>
      </section>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LazyComponent {
  countQuery = useLazyGetCountByIdQuery();
  // Use in same component or child components (not subscripted by self)
  selectFromState$ = getCountById.useQueryState(this.countQuery.lastArg$);
  // Use anywhere (subscripted by self), skip subscribe with uninitialized value
  countQuery$ = useGetCountByIdQuery(this.countQuery.lastArg$);

  form = this.formBuilder.group({
    id: ['', [Validators.required, Validators.minLength(2)]],
    preferCacheValue: [false],
  });

  constructor(private formBuilder: UntypedFormBuilder) {}

  async startCounterById({ id, preferCacheValue }: { id: string; preferCacheValue: boolean }): Promise<void> {
    this.countQuery
      .fetch(id, { preferCacheValue })
      .unwrap()
      .then((result) => {
        console.log('result method 1', result);
        this.form.reset();
      })
      .catch(console.error);

    try {
      const result = await this.countQuery.fetch(id, { preferCacheValue }).unwrap();
      console.log('result method 2', result);
      this.form.reset();
    } catch (error) {
      console.error(error);
    }
  }
}
