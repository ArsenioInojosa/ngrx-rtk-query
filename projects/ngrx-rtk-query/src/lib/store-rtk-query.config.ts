import { InjectionToken } from '@angular/core';
import { setupListeners } from '@reduxjs/toolkit/query';

export interface StoreQueryConfig {
  setupListeners: boolean | Parameters<typeof setupListeners>[1];
  baseUrl: string;
}

export let currentConfig: StoreQueryConfig | undefined;
export const setupConfig = (config: StoreQueryConfig) => {
  currentConfig = config;
};

export const defaultConfig: StoreQueryConfig = {
  setupListeners: false,
  baseUrl: '',
};

export const STORE_RTK_QUERY_CONFIG = new InjectionToken<StoreQueryConfig>('STORE_RTK_QUERY_CONFIG');
