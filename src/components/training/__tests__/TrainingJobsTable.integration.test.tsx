import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { jest } from '@jest/globals'
import TrainingJobsTable from '../TrainingJobsTable'
import * as trainingApi from '@/lib/trainingApi'
import { showToast } from '../ToastContainer'

// Mock dependencies
jest.mock('@/lib/trainingApi')
jest.mock('../ToastContainer', () => ({
  showToast: jest.fn(),
}))
jest.mock('@/lib/trainingWebSocket', () => ({
  getTrainingWebSocketService: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    onJobUpdate: jest.fn(),
  })),
}))

describe('TrainingJobsTable Integration', () => {
  const mockJobs = [
    {
      id: '1',
      status: 'running',
      model_type: 'LSTM',
      symbol: 'BTC/USDT',
      created_at: '2024-01-01T00:00:00Z',
      progress: 50,
    },
    {
      id: '2',
      status: 'completed',
      model_type: 'GRU',
      symbol: 'ETH/USDT',
      created_at: '2024-01-02T00:00:00Z',
      progress: 100,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(trainingApi.getTrainingJobs as jest.Mock).mockResolvedValue({
      jobs: mockJobs,
    })
  })

  it('fetches and displays training jobs on mount', async () => {
    render(<TrainingJobsTable />)

    await waitFor(() => {
      expect(trainingApi.getTrainingJobs).toHaveBeenCalled()
    })

    expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
    expect(screen.getByText('ETH/USDT')).toBeInTheDocument()
  })

  it('filters jobs by status', async () => {
    render(<TrainingJobsTable />)

    await waitFor(() => {
      expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
    })

    // Find and click status filter
    const statusFilter = screen.getByLabelText(/status/i)
    if (statusFilter) {
      fireEvent.change(statusFilter, { target: { value: 'completed' } })
      
      await waitFor(() => {
        expect(screen.queryByText('BTC/USDT')).not.toBeInTheDocument()
        expect(screen.getByText('ETH/USDT')).toBeInTheDocument()
      })
    }
  })

  it('cancels a training job', async () => {
    ;(trainingApi.cancelTraining as jest.Mock).mockResolvedValue({
      message: 'Training cancelled',
    })

    render(<TrainingJobsTable />)

    await waitFor(() => {
      expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
    })

    // Find cancel button and click
    const cancelButtons = screen.getAllByText(/cancel/i)
    if (cancelButtons.length > 0) {
      fireEvent.click(cancelButtons[0])

      await waitFor(() => {
        expect(trainingApi.cancelTraining).toHaveBeenCalled()
      })
    }
  })

  it('handles API errors gracefully', async () => {
    const errorMessage = 'Failed to fetch jobs'
    ;(trainingApi.getTrainingJobs as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    )

    render(<TrainingJobsTable />)

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('error', expect.stringContaining(errorMessage))
    })
  })

  it('refreshes jobs on manual refresh', async () => {
    render(<TrainingJobsTable />)

    await waitFor(() => {
      expect(trainingApi.getTrainingJobs).toHaveBeenCalledTimes(1)
    })

    // Find refresh button
    const refreshButton = screen.getByLabelText(/refresh/i) || screen.getByText(/refresh/i)
    if (refreshButton) {
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(trainingApi.getTrainingJobs).toHaveBeenCalledTimes(2)
      })
    }
  })
})

