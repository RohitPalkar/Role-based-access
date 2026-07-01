import { it, vi, expect, describe, afterEach } from 'vitest';

import { localStorageGetItem, localStorageAvailable } from './storage-available';

describe('localStorageAvailable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when localStorage is writable', () => {
    expect(localStorageAvailable()).toBe(true);
  });

  it('returns false and logs error when setItem throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(localStorageAvailable()).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    setItemSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('localStorageGetItem', () => {
  afterEach(() => {
    globalThis.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns the stored value when localStorage is available', () => {
    globalThis.localStorage.setItem('foo', 'bar');
    expect(localStorageGetItem('foo')).toBe('bar');
  });

  it('returns the provided default when the key is missing', () => {
    expect(localStorageGetItem('missing', 'fallback')).toBe('fallback');
  });

  it('returns the empty-string default when no default is provided and the key is missing', () => {
    expect(localStorageGetItem('missing')).toBe('');
  });

  it('returns undefined when localStorage is unavailable', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(localStorageGetItem('foo', 'fallback')).toBeUndefined();
  });
});
