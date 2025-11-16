import { act, renderHook } from '@testing-library/react';
import useScreeningState, {
  SCREENING_STORAGE_KEY,
  defaultScreeningState,
} from '../useScreeningState';

describe('useScreeningState', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('initializes with the default shape when storage is empty', () => {
    const { result } = renderHook(() => useScreeningState());

    expect(result.current.state).toEqual(defaultScreeningState());
  });

  it('persists updates to sessionStorage', () => {
    const { result } = renderHook(() => useScreeningState());

    act(() => {
      result.current.handleHealthChange('drug', true);
    });

    expect(result.current.state.health.drug).toBe(true);

    const stored = JSON.parse(
      window.sessionStorage.getItem(SCREENING_STORAGE_KEY),
    );
    expect(stored.health.drug).toBe(true);
  });

  it('resets state and removes stored copy on clearState, then repopulates defaults', () => {
    const { result } = renderHook(() => useScreeningState());

    act(() => {
      result.current.updateState({ consent: true });
    });

    expect(result.current.state.consent).toBe(true);

    act(() => {
      result.current.clearState();
    });

    expect(result.current.state).toEqual(defaultScreeningState());
    expect(
      JSON.parse(window.sessionStorage.getItem(SCREENING_STORAGE_KEY)),
    ).toEqual(defaultScreeningState());
  });
});

