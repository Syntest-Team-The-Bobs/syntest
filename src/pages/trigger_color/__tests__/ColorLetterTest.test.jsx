import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock react-router FIRST
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}))

// Mock hooks
vi.mock('../../hooks/useColorTest', () => ({
  useColorTest: () => ({
    phase: 'intro',
    selected: null,
    locked: false,
    noExperience: false,
    deck: [],
    idx: 0,
    current: null,
    onPick: vi.fn(),
    toggleLock: vi.fn(),
    toggleNoExperience: vi.fn(),
    startTest: vi.fn(),
    handleNext: vi.fn()
  })
}))

vi.mock('../../hooks/useColorTestAPI', () => ({
  useColorTestAPI: () => ({
    submitBatch: vi.fn(),
    isSubmitting: false,
    error: null
  })
}))

vi.mock('../../hooks/useMusicPlayer', () => ({
  useMusicPlayer: () => ({
    handleReplay: vi.fn()
  })
}))

import ColorLetterTest from '../ColorLetterTest'

describe('ColorLetterTest page', () => {
  it('renders without crashing', () => {
    render(<ColorLetterTest />)
    expect(screen.getByText('Letter-Color Synesthesia Test')).toBeTruthy()
  })
})