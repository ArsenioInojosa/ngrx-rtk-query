import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormControl } from '@angular/forms';
import { tap } from 'rxjs/operators';

import { useDeletePostMutation, useGetPostQuery, useUpdatePostMutation } from '../services/posts';

@Component({
  selector: 'app-post-detail',
  template: `
    <section *ngIf="postQuery$ | async as postQuery" class="space-y-4">
      <div>
        <h1 class="text-xl font-semibold">{{ postQuery?.data?.name }}</h1>
        <small *ngIf="postQuery.isFetching">Loading...</small>
      </div>

      <ng-container *ngIf="!isEditing; else editionSection">
        <div *ngIf="deletePostMutation.state$ | async as deletePostState" class="flex items-center space-x-4">
          <button
            *ngIf="updatePostMutation.state$ | async as updatePostState"
            class="btn-outline btn-primary"
            [disabled]="postQuery.isLoading || deletePostState.isLoading || updatePostState.isLoading"
            (click)="toggleEdit()"
          >
            {{ updatePostState?.isLoading ? 'Updating...' : 'Edit' }}
          </button>
          <button
            class="btn-outline btn-primary"
            [disabled]="postQuery.isLoading || deletePostState.isLoading"
            (click)="deletePost()"
          >
            {{ deletePostState?.isLoading ? 'Deleting...' : 'Delete' }}
          </button>
          <button class="btn-outline btn-primary" [disabled]="postQuery.isFetching" (click)="postQuery.refetch()">
            {{ postQuery.isFetching ? 'Fetching...' : 'Refresh' }}
          </button>
        </div>
      </ng-container>
      <ng-template #editionSection>
        <div *ngIf="updatePostMutation.state$ | async as updatePostState" class="space-x-4">
          <input type="text" [formControl]="postFormControl" />
          <button class="btn btn-primary" [disabled]="updatePostState.isLoading" (click)="updatePost()">
            {{ updatePostState?.isLoading ? 'Updating...' : 'Update' }}
          </button>
          <button class="btn btn-primary" [disabled]="updatePostState.isLoading" (click)="toggleEdit()">Cancel</button>
        </div>
      </ng-template>

      <pre class="bg-gray-200">{{ postQuery.data | json }}</pre>
    </section>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent {
  postQuery$ = useGetPostQuery(+this.route.snapshot.params.id, { pollingInterval: 5000 }).pipe(
    tap((result) => this.postFormControl.setValue(result.data?.name ?? '')),
  );
  updatePostMutation = useUpdatePostMutation();
  deletePostMutation = useDeletePostMutation();

  postFormControl = new UntypedFormControl('');
  isEditing = false;

  constructor(private route: ActivatedRoute, private router: Router) {}

  updatePost(): void {
    this.updatePostMutation
      .dispatch({ id: +this.route.snapshot.params.id, name: this.postFormControl.value })
      .unwrap()
      .then(() => this.toggleEdit());
  }

  deletePost(): void {
    this.deletePostMutation
      .dispatch(+this.route.snapshot.params.id)
      .unwrap()
      .then(() => this.router.navigate(['/posts']))
      .catch(() => console.error('Error deleting Post'));
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }
}
