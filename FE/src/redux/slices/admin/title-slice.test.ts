import { it, expect, describe } from 'vitest';

import titleReducer, { setTitleAsync } from './title-slice';

const initialState = { title: '', loading: false, error: null };

describe('title slice', () => {
  it('returns the initial state for an unknown action', () => {
    expect(titleReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('setTitleAsync.pending sets loading=true', () => {
    const next = titleReducer(initialState, { type: setTitleAsync.pending.type });
    expect(next).toEqual({ title: '', loading: true, error: null });
  });

  it('setTitleAsync.fulfilled sets the title and loading=false', () => {
    const next = titleReducer(
      { title: '', loading: true, error: null },
      { type: setTitleAsync.fulfilled.type, payload: 'Dashboard' }
    );
    expect(next).toEqual({ title: 'Dashboard', loading: false, error: null });
  });

  it('setTitleAsync.rejected resets title and stores the error message', () => {
    const next = titleReducer(
      { title: 'Existing', loading: true, error: null },
      { type: setTitleAsync.rejected.type, error: { message: 'boom' } }
    );
    expect(next).toEqual({ title: '', loading: false, error: 'boom' });
  });

  it('setTitleAsync.rejected falls back to "Failed to load title" when error.message is missing', () => {
    const next = titleReducer(
      { title: 'Existing', loading: true, error: null },
      { type: setTitleAsync.rejected.type, error: {} }
    );
    expect(next).toEqual({
      title: '',
      loading: false,
      error: 'Failed to load title',
    });
  });
});
