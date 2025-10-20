// Simple server test
console.log("🚀 Starting TestForge Backend...");

// Test basic imports
try {
  const express = require("express");
  console.log("✅ Express imported successfully");

  const { PrismaClient } = require("@prisma/client");
  console.log("✅ Prisma imported successfully");

  const app = express();
  const port = process.env.PORT || 3000;

  // Basic middleware
  app.use(express.json());

  // Test endpoint
  app.get("/test", (req, res) => {
    res.json({
      message: "TestForge Backend is working!",
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "testforge-backend",
      timestamp: new Date().toISOString(),
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(`🚀 TestForge Backend running on http://localhost:${port}`);
    console.log(`🔍 Health check: http://localhost:${port}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${port}/test`);
  });
} catch (error) {
  console.error("❌ Error starting server:", error);
  process.exit(1);
}
