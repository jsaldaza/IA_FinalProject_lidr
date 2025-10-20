const jwt = require("jsonwebtoken");
let StructuredLogger;
try {
  StructuredLogger =
    require("../../testforge-backend/dist/utils/structured-logger").StructuredLogger;
} catch (e) {
  StructuredLogger =
    require("../../testforge-backend/src/utils/structured-logger").StructuredLogger;
}

// Use the same secret as in config (default value)
const secret = process.env.JWT_SECRET || "your-secret-key";

// Create a test token for demo user
const testUser = {
  id: "demo-user-id",
  email: "demo@test.com",
};

const token = jwt.sign(testUser, secret, { expiresIn: "1d" });

StructuredLogger.info("Generated test token (redacted)", {
  token: token ? `${token.substring(0, 12)}...` : "",
});
StructuredLogger.info("Use this token in your tests", {
  authorization: token ? `Bearer ${token.substring(0, 12)}...` : "",
});
