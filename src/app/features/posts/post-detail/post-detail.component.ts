import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map, tap } from 'rxjs/operators';
import { useDeletePostMutation, useGetPostQuery, useUpdatePostMutation } from '@app/core/services';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-post-detail',
  template: `
    <section class="space-y-4" *ngIf="postQuery$ | async as postQuery">
      <div>
        <h1 class="text-xl font-semibold">{{ postQuery?.data?.name }}</h1>
        <small *ngIf="postQuery.isFetching">Refetching...</small>
      </div>
      <ng-container *ngIf="!isEditing; else editionSection">
        <div class="flex items-center space-x-4" *ngIf="deletePostMutation.state$ | async as deletePostState">
          <button
            class="btn-outline btn-primary"
            (click)="showEditForm(true)"
            *ngIf="updatePostMutation.state$ | async as updatePostState"
            [disabled]="postQuery.isLoading || deletePostState.isLoading || updatePostState.isLoading"
          >
            {{ updatePostState?.isLoading ? 'Updating...' : 'Edit' }}
          </button>
          <button
            class="m-4 btn-outline btn-primary"
            (click)="deletePost(postQuery.data?.id)"
            [disabled]="postQuery.isLoading || deletePostState.isLoading"
          >
            {{ deletePostState?.isLoading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </ng-container>
      <ng-template #editionSection>
        <div *ngIf="updatePostMutation.state$ | async as updatePostState">
          <input type="text" [formControl]="postFormControl" />
          <button
            class="m-4 btn btn-primary"
            (click)="updatePost(postQuery?.data?.id)"
            [disabled]="updatePostState.isLoading"
          >
            {{ updatePostState?.isLoading ? 'Updating...' : 'Update' }}
          </button>
          <button class="m-2 btn btn-primary" (click)="showEditForm(false)" [disabled]="updatePostState.isLoading">
            Cancel
          </button>
        </div>
      </ng-template>
      <pre class="bg-gray-200">{{ postQuery.data | json }}</pre>
    </section>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent {
  updatePostMutation = useUpdatePostMutation();
  deletePostMutation = useDeletePostMutation();
  postFormControl = new FormControl('');
  isEditing = false;

  postQuery$ = useGetPostQuery(this.route.params.pipe(map((params) => +params.id))).pipe(
    filter((result: any) => result && result.data),
    tap((result: any) => {
      this.postFormControl.setValue(result.data.name);
    }),
  );

  constructor(private route: ActivatedRoute, private router: Router) {}

  updatePost(id: number = 0): void {
    this.updatePostMutation.dispatch({ id, name: this.postFormControl.value });
  }

  deletePost(id: number = 0): void {
    this.deletePostMutation.dispatch(id);
    this.router.navigate(['/posts']);
  }

  showEditForm(value: boolean): void {
    this.isEditing = value;
  }
}
