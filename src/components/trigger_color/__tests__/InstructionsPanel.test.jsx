import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InstructionsPanel from '../InstructionsPanel'

describe('InstructionsPanel', () => {
    it('renders heading', () => {
        render(<InstructionsPanel testType="letter" />)
        expect(screen.getByText('HOW TO COMPLETE THE TEST')).toBeTruthy()
    })

    it('renders all instruction steps', () => {
        render(<InstructionsPanel testType="letter" />)
        expect(screen.getByText(/Read the letter/i)).toBeTruthy()
        expect(screen.getByText(/Click and hold/i)).toBeTruthy()
        expect(screen.getByText(/lock/i)).toBeTruthy()
        expect(screen.getByText(/Next/i)).toBeTruthy()
    })

    it('shows letter-specific instruction', () => {
        render(<InstructionsPanel testType="letter" />)
        expect(screen.getByText(/Read the letter on the right/)).toBeTruthy()
    })

    it('shows number-specific instruction', () => {
        render(<InstructionsPanel testType="number" />)
        expect(screen.getByText(/Read the number on the right/)).toBeTruthy()
    })

    it('shows word-specific instruction', () => {
        render(<InstructionsPanel testType="word" />)
        expect(screen.getByText(/Read the word on the right/)).toBeTruthy()
    })

    it('shows music-specific instruction', () => {
        render(<InstructionsPanel testType="music" />)
        expect(screen.getByText(/Read the music on the right/)).toBeTruthy()
    })

    it('mentions red circle indicator', () => {
        render(<InstructionsPanel testType="letter" />)
        expect(screen.getByText(/red/i)).toBeTruthy()
    })

    it('mentions drag instruction', () => {
        render(<InstructionsPanel testType="letter" />)
        expect(screen.getByText(/drag/i)).toBeTruthy()
    })

    // Additional tests to improve coverage and robustness

    it('renders exactly four list items in the correct order', () => {
        render(<InstructionsPanel testType="letter" />)
        const items = screen.getAllByRole('listitem')
        expect(items.length).toBe(4)
        expect(items[0].textContent).toMatch(/Read the letter on the right/i)
        expect(items[1].textContent).toMatch(/Click and hold/i)
        expect(items[2].textContent).toMatch(/lock the color/i)
        expect(items[3].textContent).toMatch(/Next/i)
    })

    it('renders emphasized pieces as strong elements', () => {
        render(<InstructionsPanel testType="letter" />)
        const clickStrong = screen.getByText(/Click and hold/i)
        const nextStrong = screen.getByText(/Next/i)
        // ensure the emphasized pieces are rendered using <strong>
        expect(clickStrong.tagName).toBe('STRONG')
        expect(nextStrong.tagName).toBe('STRONG')
    })

    it('renders the red indicator inside a span with the expected inline color', () => {
        render(<InstructionsPanel testType="letter" />)
        const redEl = screen.getByText(/red/i)
        expect(redEl.tagName).toBe('SPAN')
        const inline = redEl.style.color || ''
        const computed = typeof window !== 'undefined' ? window.getComputedStyle(redEl).color : ''
        // accept either hex or rgb formats
        expect(`${inline}${computed}`).toMatch(/(#?dc2626|rgb\(?\s*220[,\s]+\s*38[,\s]+\s*38\)?)/i)
    })

    it('is accessible via heading role', () => {
        render(<InstructionsPanel testType="letter" />)
        // ensure heading is available through accessibility queries
        const heading = screen.getByRole('heading', { name: /how to complete the test/i })
        expect(heading).toBeTruthy()
    })
})