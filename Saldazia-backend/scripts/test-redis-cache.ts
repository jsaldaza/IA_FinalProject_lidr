import { RedisCache } from '../src/utils/redis-cache';
import { StructuredLogger } from '../src/utils/structured-logger';

async function testRedisCache() {
    console.log('🧪 Testing Redis Cache Implementation...\n');

    try {
        // Test 1: Connect to Redis
        console.log('1. Testing Redis connection...');
        await RedisCache.connect();

        if (RedisCache.isReady()) {
            console.log('✅ Redis connected successfully');
        } else {
            console.log('❌ Redis connection failed');
            return;
        }

        // Test 2: Basic set/get operations
        console.log('\n2. Testing basic cache operations...');
        const testKey = 'test:key';
        const testData = { message: 'Hello Redis!', timestamp: new Date().toISOString() };

        // Set data
        const setResult = await RedisCache.set(testKey, testData, 60); // 1 minute TTL
        console.log(`Set operation: ${setResult ? '✅ Success' : '❌ Failed'}`);

        // Get data
        const retrievedData = await RedisCache.get(testKey);
        console.log(`Get operation: ${retrievedData ? '✅ Success' : '❌ Failed'}`);
        if (retrievedData) {
            console.log(`Retrieved data: ${JSON.stringify(retrievedData, null, 2)}`);
        }

        // Test 3: Dashboard cache methods
        console.log('\n3. Testing dashboard cache methods...');
        const userId = 'test-user-123';
        const dashboardStats = {
            totalProjects: 5,
            totalTestCases: 25,
            completedAnalyses: 3,
            inProgressAnalyses: 2,
            activeProjects: 2,
            passRate: 60
        };

        // Test dashboard stats caching
        const dashboardSet = await RedisCache.setDashboardStats(userId, dashboardStats);
        console.log(`Dashboard stats set: ${dashboardSet ? '✅ Success' : '❌ Failed'}`);

        const dashboardGet = await RedisCache.getDashboardStats(userId);
        console.log(`Dashboard stats get: ${dashboardGet ? '✅ Success' : '❌ Failed'}`);
        if (dashboardGet) {
            console.log(`Dashboard stats: ${JSON.stringify(dashboardGet, null, 2)}`);
        }

        // Test 4: Cache invalidation
        console.log('\n4. Testing cache invalidation...');
        await RedisCache.invalidateUserCache(userId);
        const afterInvalidation = await RedisCache.getDashboardStats(userId);
        console.log(`After invalidation: ${afterInvalidation ? '❌ Still exists' : '✅ Properly invalidated'}`);

        // Test 5: Health check
        console.log('\n5. Testing health check...');
        const health = await RedisCache.healthCheck();
        console.log(`Health check: ${health ? '✅ Redis is healthy' : '❌ Redis is not healthy'}`);

        // Test 6: Get cache stats
        console.log('\n6. Getting cache statistics...');
        const stats = await RedisCache.getStats();
        console.log(`Cache stats: ${JSON.stringify(stats, null, 2)}`);

        // Cleanup
        console.log('\n7. Cleaning up test data...');
        await RedisCache.delete(testKey);
        console.log('✅ Test data cleaned up');

        console.log('\n🎉 All Redis cache tests completed successfully!');

    } catch (error) {
        console.error('❌ Redis cache test failed:', error);
        StructuredLogger.error('Redis cache test failed', error as Error);
    } finally {
        // Disconnect
        await RedisCache.disconnect();
        console.log('🔌 Redis disconnected');
    }
}

// Run the test
testRedisCache().catch(console.error);