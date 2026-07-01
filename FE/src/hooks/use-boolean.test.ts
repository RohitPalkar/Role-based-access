import { it, expect, describe } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useBoolean } from './use-boolean';

describe('useBoolean', () => {
  it('initialises with default false when no argument is provided', () => {
    const { result } = renderHook(() => useBoolean());
    expect(result.current.value).toBe(false);
  });

  it('initialises with the provided default value', () => {
    const { result } = renderHook(() => useBoolean(true));
    expect(result.current.value).toBe(true);
  });

  it('onTrue sets value to true', () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      result.current.onTrue();
    });

    expect(result.current.value).toBe(true);
  });

  it('onFalse sets value to false', () => {
    const { result } = renderHook(() => useBoolean(true));

    act(() => {
      result.current.onFalse();
    });

    expect(result.current.value).toBe(false);
  });

  it('onToggle flips the current value', () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      result.current.onToggle();
    });
    expect(result.current.value).toBe(true);

    act(() => {
      result.current.onToggle();
    });
    expect(result.current.value).toBe(false);
  });

  it('setValue accepts both a direct value and an updater function', () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      result.current.setValue(true);
    });
    expect(result.current.value).toBe(true);

    act(() => {
      result.current.setValue((prev) => !prev);
    });
    expect(result.current.value).toBe(false);
  });

  it('keeps callback identities stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useBoolean(false));

    const previous = {
      onTrue: result.current.onTrue,
      onFalse: result.current.onFalse,
      onToggle: result.current.onToggle,
      setValue: result.current.setValue,
    };

    act(() => {
      result.current.onTrue();
    });
    rerender();

    expect(result.current.onTrue).toBe(previous.onTrue);
    expect(result.current.onFalse).toBe(previous.onFalse);
    expect(result.current.onToggle).toBe(previous.onToggle);
    expect(result.current.setValue).toBe(previous.setValue);
  });
});
