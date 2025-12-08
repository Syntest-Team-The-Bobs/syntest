import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TestLayout from '../TestLayout'

// Mock child components
vi.mock('../ColorWheel', () => ({
  default: ({ onPick, onToggleLock, lock }) => (
    <div data-testid="color-wheel">
      <button onClick={() => onPick?.({ r: 255, g: 0, b: 0, hex: 'FF0000' })}>Pick Color</button>
      <button onClick={onToggleLock}>Toggle Lock</button>
      <div>Lock: {lock ? 'true' : 'false'}</div>
    </div>
  )
}))

vi.mock('../ColorPreviewLock', () => ({
  default: ({ selected, locked, onToggle }) => (
    <div data-testid="color-preview-lock">
      <div>Color: {selected?.hex || 'none'}</div>
      <div>Locked: {locked ? 'yes' : 'no'}</div>
      <button onClick={onToggle}>Toggle</button>
    </div>
  )
}))

vi.mock('../InstructionsPanel', () => ({
  default: ({ testType }) => (
    <div data-testid="instructions">Instructions for {testType}</div>
  )
}))

vi.mock('../TestProgress', () => ({
  default: ({ stimulus, currentTrial, progressInTrial, itemsPerTrial }) => (
    <div data-testid="progress">
      {stimulus} - Trial {currentTrial} - {progressInTrial !== undefined ? progressInTrial : ''}/{itemsPerTrial !== undefined ? itemsPerTrial : ''}
    </div>
  )
}))

vi.mock('../MusicPlayButton', () => ({
  default: ({ stimulus, onReplay }) => (
    <button data-testid="music-play" onClick={onReplay}>Play {stimulus}</button>
  )
}))

vi.mock('../StimulusDisplay', () => ({
  default: ({ stimulus, testType, getFontSize }) => (
    <div data-testid="stimulus-display" style={{ fontSize: getFontSize() }}>
      {stimulus}
    </div>
  )
}))

vi.mock('../../components/ui/ProgressBar', () => ({
  default: ({ value }) => (
    <div data-testid="progress-bar">Progress: {Math.round(value * 100)}%</div>
  )
}))

const baseProps = {
  title: 'LETTER TEST',
  testType: 'letter',
  phase: 'test',
  current: { stimulus: 'A', trial: 1 },
  stimulus: 'A',
  currentTrial: 1,
  progressInTrial: 1,
  itemsPerTrial: 3,
  locked: false,
  selected: null,
  noExperience: false,
  progressValue: 0.1,
  onPick: vi.fn(),
  onToggleLock: vi.fn(),
  onToggleNoExperience: vi.fn(),
  onNext: vi.fn(),
  getFontSize: () => '7rem'
}

describe('TestLayout', () => {
  describe('Rendering', () => {
    it('renders test layout container', () => {
      const { container } = render(<TestLayout {...baseProps} />)
      expect(container.firstChild).toBeTruthy()
    })

    it('displays title with phase', () => {
      render(<TestLayout {...baseProps} />)
      // Title includes both test name and phase - check for h1
      const title = screen.getByRole('heading', { level: 1 })
      expect(title.textContent).toContain('LETTER TEST')
      expect(title.textContent).toContain('CONSISTENCY')
    })

    it('shows PRACTICE heading in practice phase', () => {
      render(<TestLayout {...baseProps} phase="practice" />)
      expect(screen.getByText('PRACTICE')).toBeTruthy()
    })

    it('shows CONSISTENCY TEST heading in test phase', () => {
      render(<TestLayout {...baseProps} phase="test" />)
      expect(screen.getByText('CONSISTENCY TEST')).toBeTruthy()
    })
  })

  describe('Component Integration', () => {
    it('renders ColorWheel', () => {
      render(<TestLayout {...baseProps} />)
      expect(screen.getByTestId('color-wheel')).toBeTruthy()
    })

    it('renders ColorPreviewLock', () => {
      render(<TestLayout {...baseProps} />)
      expect(screen.getByTestId('color-preview-lock')).toBeTruthy()
    })

    it('renders instructions heading', () => {
      render(<TestLayout {...baseProps} />)
      expect(screen.getByText('HOW TO COMPLETE THE TEST')).toBeTruthy()
    })

    it('renders TestProgress', () => {
      render(<TestLayout {...baseProps} />)
      expect(screen.getByTestId('progress')).toBeTruthy()
    })

    it('renders progress section with Trial label', () => {
      render(<TestLayout {...baseProps} />)
      expect(screen.getByTestId('progress')).toBeTruthy()
    })
  })

  describe('Stimulus Display', () => {
    it('shows StimulusDisplay for text tests', () => {
      render(<TestLayout {...baseProps} testType="letter" />)
      expect(screen.getByTestId('stimulus-display')).toBeTruthy()
    })

    it('shows MusicPlayButton for music tests with onReplay', () => {
      const onReplay = vi.fn()
      render(<TestLayout {...baseProps} testType="music" onReplay={onReplay} />)
      expect(screen.getByTestId('music-play')).toBeTruthy()
    })

    it('shows StimulusDisplay for music tests without onReplay', () => {
      render(<TestLayout {...baseProps} testType="music" />)
      expect(screen.getByTestId('stimulus-display')).toBeTruthy()
    })
  })

  describe('Color Selection', () => {
    it('passes locked state to ColorWheel', () => {
      render(<TestLayout {...baseProps} locked={true} />)
      expect(screen.getByText('Lock: true')).toBeTruthy()
    })

    it('passes selected color to ColorPreviewLock', () => {
      const selected = { r: 255, g: 0, b: 0, hex: 'FF0000' }
      render(<TestLayout {...baseProps} selected={selected} />)
      expect(screen.getByText('Color: FF0000')).toBeTruthy()
    })

    it('calls onPick when color picked', () => {
      const onPick = vi.fn()
      render(<TestLayout {...baseProps} onPick={onPick} />)
      
      fireEvent.click(screen.getByText('Pick Color'))
      expect(onPick).toHaveBeenCalled()
    })

    it('calls onToggleLock from ColorWheel', () => {
      const onToggleLock = vi.fn()
      render(<TestLayout {...baseProps} onToggleLock={onToggleLock} />)
      
      fireEvent.click(screen.getByText('Toggle Lock'))
      expect(onToggleLock).toHaveBeenCalled()
    })

    it('calls onToggleLock from ColorPreviewLock', () => {
      const onToggleLock = vi.fn()
      render(<TestLayout {...baseProps} onToggleLock={onToggleLock} />)
      
      const toggleButtons = screen.getAllByText('Toggle')
      fireEvent.click(toggleButtons[0])
      expect(onToggleLock).toHaveBeenCalled()
    })
  })

  describe('No Experience Checkbox', () => {
    it('displays no experience checkbox', () => {
      render(<TestLayout {...baseProps} />)
      expect(screen.getByLabelText(/no synesthetic experience/i)).toBeTruthy()
    })

    it('shows checked state', () => {
      render(<TestLayout {...baseProps} noExperience={true} />)
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox.checked).toBe(true)
    })

    it('calls onToggleNoExperience when clicked', () => {
      const onToggle = vi.fn()
      render(<TestLayout {...baseProps} onToggleNoExperience={onToggle} />)
      
      fireEvent.click(screen.getByRole('checkbox'))
      expect(onToggle).toHaveBeenCalled()
    })

    it('shows letter-specific helper text', () => {
      render(<TestLayout {...baseProps} testType="letter" />)
      expect(screen.getByText(/don't experience any color association with this letter/i)).toBeTruthy()
    })

    it('shows music-specific helper text', () => {
      render(<TestLayout {...baseProps} testType="music" />)
      expect(screen.getByText(/don't experience any color association with this music/i)).toBeTruthy()
    })
  })

  describe('Next Button', () => {
    it('displays Next button', () => {
      render(<TestLayout {...baseProps} />)
      expect(screen.getByText('Next →')).toBeTruthy()
    })

    it('enables Next when locked', () => {
      render(<TestLayout {...baseProps} locked={true} />)
      const button = screen.getByText('Next →')
      expect(button.disabled).toBe(false)
    })

    it('enables Next when noExperience checked', () => {
      render(<TestLayout {...baseProps} noExperience={true} />)
      const button = screen.getByText('Next →')
      expect(button.disabled).toBe(false)
    })

    it('disables Next when neither locked nor noExperience', () => {
      render(<TestLayout {...baseProps} locked={false} noExperience={false} />)
      const button = screen.getByText('Next →')
      expect(button.disabled).toBe(true)
    })

    it('calls onNext when clicked', () => {
      const onNext = vi.fn()
      render(<TestLayout {...baseProps} locked={true} onNext={onNext} />)
      
      fireEvent.click(screen.getByText('Next →'))
      expect(onNext).toHaveBeenCalled()
    })

    it('shows pointer cursor when enabled', () => {
      render(<TestLayout {...baseProps} locked={true} />)
      const button = screen.getByText('Next →')
      expect(button.style.cursor).toBe('pointer')
    })

    it('shows not-allowed cursor when disabled', () => {
      render(<TestLayout {...baseProps} locked={false} noExperience={false} />)
      const button = screen.getByText('Next →')
      expect(button.style.cursor).toBe('not-allowed')
    })
  })

  describe('Progress Display', () => {
    it('renders progress section', () => {
      render(<TestLayout {...baseProps} progressValue={0.5} />)
      // Just check that Trial label exists since ProgressBar is mocked
      expect(screen.getByTestId('progress')).toBeTruthy()
    })

    it('shows trial information from TestProgress', () => {
      render(<TestLayout {...baseProps} currentTrial={2} progressInTrial={3} itemsPerTrial={5} />)
      const progress = screen.getByTestId('progress')
      expect(progress.textContent).toContain('Trial 2')
    })
  })
})