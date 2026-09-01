/**
 * utils/moreToLove.js
 * Centralized configuration & storage helper for the "More to Love" storefront section.
 */

import { isLocalDevHost, saveStorageItem, getStorageItem } from './storage.js';
import { saveSiteSettingInSupabase, fetchSiteSettingFromSupabase } from './supabase.js';

const STORAGE_KEY = 'SWEETOS_more_to_love_config';

export const DEFAULT_MORE_TO_LOVE_CONFIG = {
  enabled: true,
  title: 'Vous aimerez aussi',
  subtitle: 'Recommandations sélectionnées pour vous',
  productIds: [7, 8, 11, 12, 17, 18, 23, 24, 2, 4, 9, 15, 1, 3, 14, 20]
};

export function getMoreToLoveConfig() {
  try {
    fetchSiteSettingFromSupabase('more_to_love_config').then(cloudConf => {
      if (cloudConf) {
        saveStorageItem(STORAGE_KEY, JSON.stringify(cloudConf));
      }
    }).catch(() => {});

    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MORE_TO_LOVE_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled !== undefined ? parsed.enabled : DEFAULT_MORE_TO_LOVE_CONFIG.enabled,
      title: parsed.title || DEFAULT_MORE_TO_LOVE_CONFIG.title,
      subtitle: parsed.subtitle || DEFAULT_MORE_TO_LOVE_CONFIG.subtitle,
      productIds: Array.isArray(parsed.productIds) && parsed.productIds.length > 0 ? parsed.productIds : DEFAULT_MORE_TO_LOVE_CONFIG.productIds
    };
  } catch (e) {
    return { ...DEFAULT_MORE_TO_LOVE_CONFIG };
  }
}

export function saveMoreToLoveConfig(config) {
  try {
    const safeConfig = {
      enabled: config.enabled !== undefined ? config.enabled : true,
      title: (config.title || 'More to Love').trim(),
      subtitle: (config.subtitle || '').trim(),
      productIds: Array.isArray(config.productIds) ? config.productIds : []
    };
    saveStorageItem(STORAGE_KEY, JSON.stringify(safeConfig));
    saveSiteSettingInSupabase('more_to_love_config', safeConfig);

    // Server sync
    if (isLocalDevHost()) {
      fetch('/api/more-to-love', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeConfig)
      }).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent('more_to_love:updated', { detail: safeConfig }));
    return safeConfig;
  } catch (e) {
    console.error('Failed to save More to Love config:', e);
    return null;
  }
}
