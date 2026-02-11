/// <reference types="jest" />
import { jest } from '@jest/globals'
// Jest setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://test:test@localhost:5432/testdb';

// Increase timeout for database operations

jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
