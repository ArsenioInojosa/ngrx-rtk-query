import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostsListComponent } from './posts-list.component';

describe('PostsListComponent', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let component: PostsListComponent;
  let fixture: ComponentFixture<PostsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PostsListComponent],
      teardown: { destroyAfterEach: false },
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PostsListComponent);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it.todo('TODO test');
});
