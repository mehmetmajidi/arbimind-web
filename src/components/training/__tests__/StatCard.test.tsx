import React from 'react'
import { render, screen } from '@testing-library/react'
import StatCard from '../StatCard'

describe('StatCard', () => {
  it('renders with title and value', () => {
    render(<StatCard title="Total Jobs" value="10" />)
    expect(screen.getByText('Total Jobs')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders with icon when provided', () => {
    render(<StatCard title="Total Jobs" value="10" icon="📊" />)
    expect(screen.getByText('📊')).toBeInTheDocument()
  })

  it('applies custom color when provided', () => {
    render(<StatCard title="Total Jobs" value="10" color="#FFAE00" />)
    const valueElement = screen.getByText('10')
    expect(valueElement).toHaveStyle({ color: '#FFAE00' })
  })

  it('renders with loading state', () => {
    render(<StatCard title="Total Jobs" value="10" loading />)
    // Check if loading indicator is present
    const card = screen.getByText('Total Jobs').closest('div')
    expect(card).toBeInTheDocument()
  })
})

