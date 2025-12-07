import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import HelpDialog from '../HelpDialog'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
})

describe('HelpDialog', () => {
  it('renders dialog', () => {
    const { container } = render(<HelpDialog isOpen={false} />)
    expect(container.querySelector('dialog')).toBeTruthy()
  })

  it('displays heading', () => {
    render(<HelpDialog isOpen={false} />)
    expect(screen.getByText('Quick Help')).toBeTruthy()
  })

  it('renders OK button', () => {
    render(<HelpDialog isOpen={false} />)
    expect(screen.getByText('OK')).toBeTruthy()
  })

  it('shows word content by default', () => {
    render(<HelpDialog isOpen={false} />)
    expect(screen.getByText(/word/i)).toBeTruthy()
  })

  it('shows letter content', () => {
    render(<HelpDialog isOpen={false} type="letter" />)
    expect(screen.getByText(/letter/i)).toBeTruthy()
  })

  it('shows number content', () => {
    render(<HelpDialog isOpen={false} type="number" />)
    expect(screen.getByText(/number/i)).toBeTruthy()
  })

  it('calls onClose when OK clicked', () => {
    const onClose = vi.fn()
    render(<HelpDialog isOpen={true} onClose={onClose} />)
    
    screen.getByText('OK').click()
    expect(onClose).toHaveBeenCalled()
  })
})