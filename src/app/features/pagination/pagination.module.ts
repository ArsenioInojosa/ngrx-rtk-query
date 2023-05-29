import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { CharacterCardComponent } from './character-card/character-card.component';
import { CharactersListComponent } from './characters-list/characters-list.component';
import { PaginationRoutingModule } from './pagination-routing.module';
import { PaginatorComponent } from './paginator/paginator.component';
import { provideRickMortyQuery } from './services';

@NgModule({
  declarations: [CharactersListComponent, CharacterCardComponent, PaginatorComponent],
  imports: [CommonModule, PaginationRoutingModule],
  providers: [
    // Lazy RTK Query
    provideRickMortyQuery(),
  ],
})
export class PaginationModule {}
