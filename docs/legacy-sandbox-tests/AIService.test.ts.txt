import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIService } from '../../sandbox/services/AIService'

// Mock fetch
global.fetch = vi.fn()

describe('AIService', () => {
  let aiService: AIService
  const mockFetch = fetch as any

  beforeEach(() => {
    vi.clearAllMocks()
    aiService = new AIService()
  })

  it('should generate response with valid LLM response', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: 'Hello there, stranger.'
        }
      }]
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const response = await aiService.generateResponse(
      'Sheriff Martinez',
      'protective, secretive',
      'You are the town sheriff',
      'Hello'
    )

    expect(response).toBe('Hello there, stranger.')
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ollama'
        }
      })
    )
  })

  it('should throw error on HTTP failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(
      aiService.generateResponse('Sheriff', 'test', 'test', 'Hello')
    ).rejects.toThrow('HTTP 500: Internal Server Error')
  })

  it('should throw error on invalid response format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invalid: 'response' })
    })

    await expect(
      aiService.generateResponse('Sheriff', 'test', 'test', 'Hello')
    ).rejects.toThrow('Invalid response format from LLM')
  })

  it('should test connection successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true
    })

    const result = await aiService.testConnection()
    
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ollama'
        }
      })
    )
  })

  it('should handle connection test failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await aiService.testConnection()
    
    expect(result).toBe(false)
  })
})