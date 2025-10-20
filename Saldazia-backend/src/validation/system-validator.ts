/**
 * Integration Test and Validation Script
 * Tests the enhanced backend systems and frontend components
 */

import { enhancedConfig, validateConfig, getConfigSummary } from '../config/validated-config';
import logger from '../utils/logger';

// Test configuration system
const testConfiguration = () => {
  console.log('\n🔧 Testing Configuration System...');
  
  const isValid = validateConfig();
  console.log(`Configuration Valid: ${isValid ? '✅' : '❌'}`);
  
  if (isValid) {
    const summary = getConfigSummary();
    console.log('Configuration Summary:', summary);
    
    console.log('\n📋 Key Settings:');
    console.log(`- Environment: ${enhancedConfig.NODE_ENV}`);
    console.log(`- Port: ${enhancedConfig.server.port}`);
    console.log(`- OpenAI Model: ${enhancedConfig.openai.model}`);
    console.log(`- Circuit Breaker Threshold: ${enhancedConfig.circuitBreaker.failureThreshold}`);
    console.log(`- Daily AI Budget: $${enhancedConfig.aiCost.budgetDaily}`);
  }
  
  return isValid;
};

// Test logger system
const testLogger = () => {
  console.log('\n📝 Testing Logger System...');
  
  try {
    logger.info('Logger test - INFO level');
    logger.warn('Logger test - WARN level');
    logger.error('Logger test - ERROR level');
    logger.debug('Logger test - DEBUG level');
    
    console.log('Logger: ✅ Working');
    return true;
  } catch (error) {
    console.log('Logger: ❌ Error -', error);
    return false;
  }
};

// Test environment variables
const testEnvironment = () => {
  console.log('\n🌍 Testing Environment Variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'OPENAI_API_KEY'
  ];
  
  const missing: string[] = [];
  const present: string[] = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });
  
  console.log(`✅ Present: ${present.join(', ')}`);
  if (missing.length > 0) {
    console.log(`❌ Missing: ${missing.join(', ')}`);
  }
  
  return missing.length === 0;
};

// Main validation function
const runValidation = async () => {
  console.log('🚀 TestForge System Validation Starting...\n');
  
  const results = {
    configuration: testConfiguration(),
    logger: testLogger(),
    environment: testEnvironment(),
  };
  
  console.log('\n📊 Validation Results:');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${test.padEnd(15)}: ${result ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL SYSTEMS GO' : '❌ ISSUES DETECTED'}`);
  
  if (allPassed) {
    console.log('\n🎉 System is ready for integration!');
    console.log('\nNext steps:');
    console.log('1. Start the backend server: npm run dev');
    console.log('2. Start the frontend: npm run dev (in frontend directory)');
    console.log('3. Test the enhanced features');
  } else {
    console.log('\n⚠️  Please fix the issues before proceeding.');
  }
  
  return allPassed;
};

// Run if called directly
if (require.main === module) {
  runValidation().catch(console.error);
}

export { runValidation, testConfiguration, testLogger, testEnvironment };