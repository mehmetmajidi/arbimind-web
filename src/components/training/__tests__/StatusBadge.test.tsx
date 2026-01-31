import React from 'react'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders with correct text for running status', () => {
    render(<StatusBadge status="running" />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('renders with correct text for completed status', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders with correct text for failed status', () => {
    render(<StatusBadge status="failed" />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders with correct text for pending status', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('applies correct styling for different statuses', () => {
    const { rerender } = render(<StatusBadge status="running" />)
    const badge = screen.getByText('Running')
    expect(badge).toHaveStyle({ backgroundColor: expect.stringContaining('22c55e') })

    rerender(<StatusBadge status="failed" />)
    const failedBadge = screen.getByText('Failed')
    expect(failedBadge).toHaveStyle({ backgroundColor: expect.stringContaining('ef4444') })
  })

  it('renders with small size', () => {
    render(<StatusBadge status="running" size="small" />)
    const badge = screen.getByText('Running')
    expect(badge).toBeInTheDocument()
  })
})

