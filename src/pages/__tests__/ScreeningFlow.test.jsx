import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ScreeningFlow from '../ScreeningFlow';

vi.mock('../../services/screening', () => {
  const service = {
    saveConsent: vi.fn(() => Promise.resolve({ ok: true })),
    saveStep1: vi.fn(() => Promise.resolve({ ok: true })),
    saveStep2: vi.fn(() => Promise.resolve({ ok: true })),
    saveStep3: vi.fn(() => Promise.resolve({ ok: true })),
    saveStep4: vi.fn(() => Promise.resolve({ ok: true })),
    finalize: vi.fn(() =>
      Promise.resolve({
        eligible: true,
        selected_types: ['Grapheme – Color'],
        recommended: [{ name: 'Color Consistency', reason: 'Selected grapheme' }],
      }),
    ),
  };
  return { screeningService: service };
});

const renderWithRouter = (initialPath = '/screening/0') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/screening/:step" element={<ScreeningFlow />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ScreeningFlow', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('requires consent before advancing to the next step', async () => {
    renderWithRouter('/screening/0');

    const checkbox = screen.getByLabelText('I consent to take part in this study.');
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByRole('button', { name: /begin screening/i }));

    await waitFor(() => {
      expect(screen.getByText(/confirm none apply to you/i)).toBeInTheDocument();
    });
  });

  it('saves health responses and routes to step 2 when eligible', async () => {
    window.sessionStorage.setItem(
      'screening_state',
      JSON.stringify({
        consent: true,
        health: { drug: false, neuro: false, medical: false },
        definition: null,
        pain: null,
        synTypes: { grapheme: null, music: null, lexical: null, sequence: null },
        otherExperiences: '',
      }),
    );

    renderWithRouter('/screening/1');

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/what is synesthesia/i)).toBeInTheDocument();
    });
  });

  it('records type selections and fetches summary data', async () => {
    window.sessionStorage.setItem(
      'screening_state',
      JSON.stringify({
        consent: true,
        health: { drug: false, neuro: false, medical: false },
        definition: 'yes',
        pain: 'no',
        synTypes: { grapheme: null, music: null, lexical: null, sequence: null },
        otherExperiences: '',
      }),
    );

    renderWithRouter('/screening/4');

    fireEvent.click(screen.getByLabelText('Letter • Color — Yes'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/your next step/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/color consistency/i)).toBeInTheDocument();
    });
  });
});

