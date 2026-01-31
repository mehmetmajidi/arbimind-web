import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import TrainingControlsPanel from '../TrainingControlsPanel'
import * as trainingApi from '@/lib/trainingApi'

// Mock the API
jest.mock('@/lib/trainingApi', () => ({
  getPeriodicStatus: jest.fn(),
  triggerPeriodicRetrain: jest.fn(),
}))

describe('TrainingControlsPanel', () => {
  const mockOnStartTraining = jest.fn()
  const mockOnCheckFilter = jest.fn()
  const mockOnSettings = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(trainingApi.getPeriodicStatus as jest.Mock).mockResolvedValue({
      enabled: true,
      last_run: '2024-01-01T00:00:00Z',
      next_run: '2024-01-02T00:00:00Z',
      summary: {
        total_filtered: 10,
        filtered_by_volatility: 5,
        filtered_by_data_freshness: 5,
      },
    })
  })

  it('renders all buttons', () => {
    render(
      <TrainingControlsPanel
        onStartTraining={mockOnStartTraining}
        onCheckFilter={mockOnCheckFilter}
        onSettings={mockOnSettings}
      />
    )
    
    expect(screen.getByText(/Start Training/i)).toBeInTheDocument()
    expect(screen.getByText(/Check Filter/i)).toBeInTheDocument()
    expect(screen.getByText(/Settings/i)).toBeInTheDocument()
  })

  it('calls onStartTraining when Start Training button is clicked', () => {
    render(
      <TrainingControlsPanel
        onStartTraining={mockOnStartTraining}
        onCheckFilter={mockOnCheckFilter}
        onSettings={mockOnSettings}
      />
    )
    
    const startButton = screen.getByText(/Start Training/i)
    startButton.click()
    
    expect(mockOnStartTraining).toHaveBeenCalledTimes(1)
  })

  it('calls onCheckFilter when Check Filter button is clicked', () => {
    render(
      <TrainingControlsPanel
        onStartTraining={mockOnStartTraining}
        onCheckFilter={mockOnCheckFilter}
        onSettings={mockOnSettings}
      />
    )
    
    const checkFilterButton = screen.getByText(/Check Filter/i)
    checkFilterButton.click()
    
    expect(mockOnCheckFilter).toHaveBeenCalledTimes(1)
  })

  it('calls onSettings when Settings button is clicked', () => {
    render(
      <TrainingControlsPanel
        onStartTraining={mockOnStartTraining}
        onCheckFilter={mockOnCheckFilter}
        onSettings={mockOnSettings}
      />
    )
    
    const settingsButton = screen.getByText(/Settings/i)
    settingsButton.click()
    
    expect(mockOnSettings).toHaveBeenCalledTimes(1)
  })

  it('fetches periodic status on mount', async () => {
    render(
      <TrainingControlsPanel
        onStartTraining={mockOnStartTraining}
        onCheckFilter={mockOnCheckFilter}
        onSettings={mockOnSettings}
      />
    )
    
    await waitFor(() => {
      expect(trainingApi.getPeriodicStatus).toHaveBeenCalled()
    })
  })

  it('displays periodic status information', async () => {
    render(
      <TrainingControlsPanel
        onStartTraining={mockOnStartTraining}
        onCheckFilter={mockOnCheckFilter}
        onSettings={mockOnSettings}
      />
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Periodic Retraining/i)).toBeInTheDocument()
    })
  })
})

