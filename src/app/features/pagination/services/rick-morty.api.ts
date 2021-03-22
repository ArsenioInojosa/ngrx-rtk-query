import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { fetchBaseQuery } from '@rtk-incubator/rtk-query';
import { createApi } from 'ngrx-rtk-query';
import { Character, Episode } from '../models';

type ListResponse<T> = {
  info: { count: number; pages: number; next: string | null; prev: number | null };
  results: T[];
};

export const rickMortyApi = createApi({
  reducerPath: 'rickMortyApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://rickandmortyapi.com/api/' }),
  endpoints: (build) => ({
    getCharacters: build.query<ListResponse<Character>, number | void>({
      query: (page = 1) => `character?page=${page}`,
    }),
    getEpisode: build.query<Episode, number>({
      query: (episode) => `episode/${episode}`,
    }),
  }),
});

export const {
  useGetCharactersQuery,
  useGetEpisodeQuery,
  usePrefetch: useRickMortyPrefetch,
  endpoints: rickMortyApiEndpoints,
} = rickMortyApi;

@NgModule({
  imports: [
    StoreModule.forFeature(rickMortyApi.reducerPath, rickMortyApi.reducer, {
      metaReducers: [rickMortyApi.metareducer],
    }),
  ],
})
export class RickMortyQueryModule {}
