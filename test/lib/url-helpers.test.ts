import { describe, it, expect } from 'vitest';
import { getBaseUrl, getFullUrl } from '@/lib/url-helpers';

describe('URL Helpers', () => {
  describe('getBaseUrl', () => {
    it('should return a valid URL', () => {
      const url = getBaseUrl();
      expect(url).toBeTruthy();
      expect(url.startsWith('http')).toBe(true);
    });
  });

  describe('getFullUrl', () => {
    it('should append path to base URL', () => {
      const url = getFullUrl('/test');
      expect(url).toContain('/test');
    });

    it('should handle paths without leading slash', () => {
      const url = getFullUrl('test');
      expect(url).toBeTruthy();
    });
  });
});
