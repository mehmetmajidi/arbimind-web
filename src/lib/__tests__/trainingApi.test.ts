import { jest } from '@jest/globals'
import {
  getTrainingJobs,
  startTraining,
  cancelTraining,
  getPeriodicStatus,
} from '../trainingApi'

// Mock fetch globally
global.fetch = jest.fn()

describe('trainingApi', () => {
  const mockToken = 'test-token'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.setItem('auth_token', mockToken)
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getTrainingJobs', () => {
    it('fetches training jobs successfully', async () => {
      const mockJobs = [
        {
          id: '1',
          status: 'running',
          model_type: 'LSTM',
          symbol: 'BTC/USDT',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: mockJobs }),
      })

      const result = await getTrainingJobs()

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/train/status`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      )

      expect(result).toEqual({ jobs: mockJobs })
    })

    it('handles API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal Server Error' }),
      })

      await expect(getTrainingJobs()).rejects.toThrow()
    })

    it('handles 401 unauthorized', async () => {
      const removeItemSpy = jest.spyOn(localStorage, 'removeItem')
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      await expect(getTrainingJobs()).rejects.toThrow()

      expect(removeItemSpy).toHaveBeenCalledWith('auth_token')
      expect(dispatchEventSpy).toHaveBeenCalled()
    })
  })

  describe('startTraining', () => {
    it('starts training successfully', async () => {
      const mockRequest = {
        model_type: 'LSTM',
        symbol: 'BTC/USDT',
        epochs: 10,
      }

      const mockResponse = {
        job_id: '123',
        status: 'pending',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await startTraining(mockRequest)

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/train/start`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify(mockRequest),
        })
      )

      expect(result).toEqual(mockResponse)
    })

    it('handles validation errors', async () => {
      const mockRequest = {
        model_type: 'LSTM',
        symbol: 'BTC/USDT',
        epochs: 10,
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Invalid request' }),
      })

      await expect(startTraining(mockRequest)).rejects.toThrow()
    })
  })

  describe('cancelTraining', () => {
    it('cancels training successfully', async () => {
      const jobId = '123'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Training cancelled' }),
      })

      await cancelTraining(jobId)

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/train/cancel/${jobId}`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      )
    })

    it('handles job not found', async () => {
      const jobId = '999'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'Job not found' }),
      })

      await expect(cancelTraining(jobId)).rejects.toThrow()
    })
  })

  describe('getPeriodicStatus', () => {
    it('fetches periodic status successfully', async () => {
      const mockStatus = {
        enabled: true,
        last_run: '2024-01-01T00:00:00Z',
        next_run: '2024-01-02T00:00:00Z',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      })

      const result = await getPeriodicStatus()

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/train/periodic-status`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      )

      expect(result).toEqual(mockStatus)
    })
  })
})

