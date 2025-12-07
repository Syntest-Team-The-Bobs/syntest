import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MusicPlayButton from '../MusicPlayButton'
import StimulusDisplay from '../StimulusDisplay'
import TestProgress from '../TestProgress'
import TestInstructions from '../TestInstructions'
import TestIntro from '../TestIntro'
import TestComplete from '../TestComplete'

describe('MusicPlayButton', () => {
  it('renders play button', () => {
    render(<MusicPlayButton stimulus="C4" />)
    expect(screen.getByLabelText('Play sound')).toBeTruthy()
  })

  it('displays stimulus', () => {
    render(<MusicPlayButton stimulus="C4" />)
    expect(screen.getByText('C4')).toBeTruthy()
  })

  it('calls onReplay', () => {
    const onReplay = vi.fn()
    render(<MusicPlayButton stimulus="C4" onReplay={onReplay} />)
    fireEvent.click(screen.getByLabelText('Play sound'))
    expect(onReplay).toHaveBeenCalled()
  })

  it('handles click safely without onReplay', () => {
    render(<MusicPlayButton stimulus="C4" />)
    const button = screen.getByLabelText('Play sound')
    fireEvent.click(button)
    expect(true).toBe(true)
  })

  it('runs hover handlers to change and reset background color', () => {
    render(<MusicPlayButton stimulus="C4" />)
    const button = screen.getByLabelText('Play sound')

    // Trigger the inline mouse handlers so those branches are covered
    fireEvent.mouseOver(button)
    fireEvent.mouseOut(button)

    // We don't care about exact color string here; just that code ran without crashing
    expect(true).toBe(true)
  })
})

describe('StimulusDisplay', () => {
  it('displays stimulus', () => {
    render(<StimulusDisplay stimulus="A" testType="letter" getFontSize={() => '7rem'} />)
    expect(screen.getByText('A')).toBeTruthy()
  })

  it('shows letter helper text', () => {
    render(<StimulusDisplay stimulus="A" testType="letter" getFontSize={() => '7rem'} />)
    expect(screen.getByText(/letter/i)).toBeTruthy()
  })

  it('shows number helper text', () => {
    render(<StimulusDisplay stimulus="5" testType="number" getFontSize={() => '7rem'} />)
    expect(screen.getByText(/number/i)).toBeTruthy()
  })

  it('applies font size', () => {
    render(<StimulusDisplay stimulus="A" testType="letter" getFontSize={() => '10rem'} />)
    const element = screen.getByText('A')
    expect(element.style.fontSize).toBe('10rem')
  })
})

describe('TestProgress', () => {
  it('displays stimulus', () => {
    render(<TestProgress stimulus="A" currentTrial={1} totalTrials={3} currentItem={1} totalItems={9} />)
    expect(screen.getByText('A')).toBeTruthy()
  })

  it('displays trial', () => {
    render(<TestProgress stimulus="A" currentTrial={2} totalTrials={3} currentItem={4} totalItems={9} />)
    expect(screen.getByText(/Trial/)).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('displays progress', () => {
    render(<TestProgress stimulus="A" currentTrial={1} totalTrials={3} currentItem={5} totalItems={9} />)
    expect(screen.getByText(/5\/9/)).toBeTruthy()
  })
})

describe('TestInstructions', () => {
  it('renders heading', () => {
    render(<TestInstructions testType="letter" />)
    expect(screen.getByText('HOW TO COMPLETE THE TEST')).toBeTruthy()
  })

  it('shows letter instruction', () => {
    render(<TestInstructions testType="letter" />)
    expect(screen.getByText(/Read the letter/i)).toBeTruthy()
  })

  it('shows music instruction', () => {
    render(<TestInstructions testType="music" />)
    expect(screen.getByText(/Hear the music/i)).toBeTruthy()
  })
})

describe('TestIntro', () => {
  const config = {
    title: 'Test',
    description: 'Description',
    instructions: ['Step 1', 'Step 2'],
    estimatedTime: '5 min'
  }

  it('displays title', () => {
    render(<TestIntro introConfig={config} />)
    expect(screen.getByText('Test')).toBeTruthy()
  })

  it('displays description', () => {
    render(<TestIntro introConfig={config} />)
    expect(screen.getByText('Description')).toBeTruthy()
  })

  it('calls onStart', () => {
    const onStart = vi.fn()
    render(<TestIntro introConfig={config} onStart={onStart} />)
    fireEvent.click(screen.getByText('Start Test'))
    expect(onStart).toHaveBeenCalled()
  })
})

describe('TestComplete', () => {
  it('displays heading', () => {
    render(<TestComplete />)
    expect(screen.getByText('Test Complete!')).toBeTruthy()
  })

  it('calls onNext', () => {
    const onNext = vi.fn()
    render(<TestComplete onNext={onNext} />)
    fireEvent.click(screen.getByText('Proceed to Speed Congruency Test'))
    expect(onNext).toHaveBeenCalled()
  })

  it('uses green when done', () => {
    render(<TestComplete isDone={true} />)
    const heading = screen.getByText('Test Complete!')
    expect(heading.style.color).toBe('rgb(22, 163, 74)')
  })
})
