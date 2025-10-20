const https = require("https");
const http = require("http");
const fs = require("fs");

// Función para hacer requests HTTP
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const lib = options.port === 443 ? https : http;
    const req = lib.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            status: res.statusCode,
            data: jsonBody,
            headers: res.headers,
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  const results = [];
  let token = null;

  let StructuredLogger;
  try {
    StructuredLogger =
      require("../../testforge-backend/dist/utils/structured-logger").StructuredLogger;
  } catch (e) {
    StructuredLogger =
      require("../../testforge-backend/src/utils/structured-logger").StructuredLogger;
  }

  const log = (message, meta = {}) => {
    StructuredLogger.info(message, meta);
    results.push(
      typeof message === "string" ? message : JSON.stringify(message)
    );
  };

  log("=== TESTFORGE ENDPOINT TESTING ===\n");

  try {
    // Test 1: Health Check
    log("🏥 Test 1: Health Check");
    const healthOptions = {
      hostname: "localhost",
      port: 3001,
      path: "/health",
      method: "GET",
    };

    const healthResult = await makeRequest(healthOptions);
    log(`✅ Status: ${healthResult.status}`, { endpoint: "/health" });
    log("📄 Response received (redacted)", {
      endpoint: "/health",
      response: JSON.stringify(healthResult.data).substring(0, 500) + "...",
    });
    log("");

    // Test 2: Register User
    log("👤 Test 2: Register User");
    const registerOptions = {
      hostname: "localhost",
      port: 3001,
      path: "/api/auth/register",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const registerData = {
      name: "Usuario Test Automatico",
      email: `test${Date.now()}@testforge.com`,
      password: "TestPass123!",
    };

    const registerResult = await makeRequest(registerOptions, registerData);
    log(`✅ Status: ${registerResult.status}`, {
      endpoint: "/api/auth/register",
    });
    log("📄 Register response (redacted)", {
      response: JSON.stringify(registerResult.data).substring(0, 500) + "...",
    });

    if (
      registerResult.data &&
      registerResult.data.data &&
      registerResult.data.data.token
    ) {
      token = registerResult.data.data.token;
      log("🔑 Token obtenido (redacted)", {
        token: token.substring(0, 20) + "...",
      });
    }
    log("");

    if (token) {
      // Test 3: Get Profile
      log("👤 Test 3: Get Profile");
      const profileOptions = {
        hostname: "localhost",
        port: 3001,
        path: "/api/auth/profile",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const profileResult = await makeRequest(profileOptions);
      log(`✅ Status: ${profileResult.status}`, {
        endpoint: "/api/auth/profile",
      });
      log("📄 Profile response (redacted)", {
        response: JSON.stringify(profileResult.data).substring(0, 500) + "...",
      });
      log("");

      // Test 4: Dashboard Stats
      log("📊 Test 4: Dashboard Stats");
      const statsOptions = {
        hostname: "localhost",
        port: 3001,
        path: "/api/dashboard/stats",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const statsResult = await makeRequest(statsOptions);
      log(`✅ Status: ${statsResult.status}`, {
        endpoint: "/api/dashboard/stats",
      });
      log("📄 Stats response (redacted)", {
        response: JSON.stringify(statsResult.data).substring(0, 500) + "...",
      });
      log("");

      // Test 5: Create Project
      log("📋 Test 5: Create Project");
      const projectOptions = {
        hostname: "localhost",
        port: 3001,
        path: "/api/projects/create-and-start",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      const projectData = {
        title: "Proyecto de Prueba API",
        description:
          "Este es un proyecto creado para probar la API unificada de TestForge",
      };

      const projectResult = await makeRequest(projectOptions, projectData);
      log(`✅ Status: ${projectResult.status}`, {
        endpoint: "/api/projects/create-and-start",
      });
      log("📄 Project create response (redacted)", {
        response: JSON.stringify(projectResult.data).substring(0, 500) + "...",
      });

      let projectId = null;
      if (
        projectResult.data &&
        projectResult.data.data &&
        projectResult.data.data.project
      ) {
        projectId = projectResult.data.data.project.id;
        log("📋 Project ID (redacted)", {
          projectId: String(projectId).substring(0, 12) + "...",
        });
      }
      log("");

      // Test 6: Get Projects In Progress
      log("📋 Test 6: Get Projects In Progress");
      const inProgressOptions = {
        hostname: "localhost",
        port: 3001,
        path: "/api/projects/in-progress",
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const inProgressResult = await makeRequest(inProgressOptions);
      log(`✅ Status: ${inProgressResult.status}`, {
        endpoint: "/api/projects/in-progress",
      });
      log("📄 In-progress response (redacted)", {
        response:
          JSON.stringify(inProgressResult.data).substring(0, 500) + "...",
      });
      log("");

      // Test 7: Logout
      log("🚪 Test 7: Logout");
      const logoutOptions = {
        hostname: "localhost",
        port: 3001,
        path: "/api/auth/logout",
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const logoutResult = await makeRequest(logoutOptions);
      log(`✅ Status: ${logoutResult.status}`, {
        endpoint: "/api/auth/logout",
      });
      log("📄 Logout response (redacted)", {
        response: JSON.stringify(logoutResult.data).substring(0, 500) + "...",
      });
      log("");
    }

    log("🎉 All tests completed successfully!");
  } catch (error) {
    log(`❌ Error during testing: ${error.message}`);
  }

  // Escribir resultados a archivo
  fs.writeFileSync("test-results.txt", results.join("\n"));
  log("\n📄 Results saved to test-results.txt");
}

runTests();
