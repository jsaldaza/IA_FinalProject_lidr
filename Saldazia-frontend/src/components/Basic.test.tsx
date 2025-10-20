import { describe, it, expect } from 'vitest'

describe('Basic Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test')
    expect(result).toBe('test')
  })

  it('should work with objects', () => {
    const obj = { name: 'Test', value: 42 }
    expect(obj).toHaveProperty('name')
    expect(obj.value).toBe(42)
  })
})