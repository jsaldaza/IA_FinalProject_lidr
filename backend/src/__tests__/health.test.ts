// Basic health check test to ensure test infrastructure works
import { describe, it, expect } from '@jest/globals';

describe('Test Infrastructure', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have JWT_SECRET configured', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});
