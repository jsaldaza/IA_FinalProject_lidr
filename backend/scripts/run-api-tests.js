const fs = require("fs").promises;
const path = require("path");
const HOST = process.env.HOST || "http://localhost:3000";
const resultsDir = path.join(__dirname, "..", "api-test-results");

async function save(name, status, headers, body) {
  const filename = path.join(resultsDir, `${name}.txt`);
  const content = [
    `NAME: ${name}`,
    `STATUS: ${status}`,
    `HEADERS: ${JSON.stringify(headers, null, 2)}`,
    `BODY:\n`,
    typeof body === "string" ? body : JSON.stringify(body, null, 2),
  ].join("\n");
  await fs.writeFile(filename, content, "utf8");
}

const http = require("http");
const https = require("https");

function httpRequest(method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(HOST + urlString);
      const lib = url.protocol === "https:" ? https : http;
      const headers = Object.assign({}, opts.headers || {});
      const body = opts.body ? JSON.stringify(opts.body) : undefined;
      if (body)
        headers["Content-Type"] = headers["Content-Type"] || "application/json";

      const req = lib.request(url, { method, headers }, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const h = res.headers || {};
          resolve({ status: res.statusCode, headers: h, text: data });
        });
      });
      req.on("error", (err) => reject(err));
      if (body) req.write(body);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function req(method, url, opts = {}) {
  return httpRequest(method, url, opts);
}

async function waitForHealth(retries = 15, intervalMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(HOST + "/health", { method: "GET" });
      if (r && r.ok) {
        const body = await r.text();
        return { ok: true, status: r.status, body };
      }
    } catch (e) {
      // ignore and retry
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  return { ok: false };
}

(async () => {
  await fs.mkdir(resultsDir, { recursive: true });
  console.log("Using HOST =", HOST);

  console.log("Waiting for /health to be available...");
  const h = await waitForHealth(20, 1000);
  if (!h.ok) {
    console.error(
      "Server /health did not respond after retries. Aborting tests.",
    );
    process.exitCode = 2;
    return;
  }
  console.log("/health ok, continuing tests.");

  // 1) Health
  try {
    const r = await req("GET", "/health");
    await save("01-health", r.status, r.headers, r.text);
    console.log("Saved 01-health");
  } catch (e) {
    console.error("Health error", e);
  }

  // 2) Register a test user (unique email per run)
  const ts = Date.now();
  const email = `test+${ts}@example.com`;
  const password = "Secret123!";
  const name = "Automated Tester";

  try {
    const r = await req("POST", "/api/auth/register", {
      body: { email, password, name },
    });
    await save("02-register", r.status, r.headers, r.text);
    console.log("Saved 02-register", email);
  } catch (e) {
    console.error("Register error", e);
  }

  // 3) Login
  let token = process.env.TOKEN || "";
  try {
    const r = await req("POST", "/api/auth/login", {
      body: { email, password },
    });
    await save("03-login", r.status, r.headers, r.text);
    console.log("Saved 03-login");
    try {
      const json = JSON.parse(r.text);
      token =
        json?.data?.token ||
        json?.token ||
        json?.accessToken ||
        json?.data?.accessToken ||
        token;
    } catch (e) {
      /* not json */
    }
    console.log("Token captured:", !!token);
  } catch (e) {
    console.error("Login error", e);
  }

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // 4) Create a project
  let projectId = process.env.PROJECT_ID || "";
  try {
    const r = await req("POST", "/api/projects", {
      headers: authHeader,
      body: { title: `Proj ${ts}`, description: "Creado por script" },
    });
    await save("04-create-project", r.status, r.headers, r.text);
    try {
      const json = JSON.parse(r.text);
      projectId =
        json?.data?.project?.id || json?.data?.id || json?.id || projectId;
    } catch {}
    console.log("Saved 04-create-project, id?", projectId);
  } catch (e) {
    console.error("Create project error", e);
  }

  // 5) List projects (in-progress view)
  try {
    const r = await req("GET", "/api/projects/in-progress", {
      headers: authHeader,
    });
    await save("05-list-projects-in-progress", r.status, r.headers, r.text);
    console.log("Saved 05-list-projects-in-progress");
  } catch (e) {
    console.error("List projects error", e);
  }

  // 6) Dashboard stats
  try {
    const r = await req("GET", "/api/dashboard/stats", { headers: authHeader });
    await save("06-dashboard-stats", r.status, r.headers, r.text);
    console.log("Saved 06-dashboard-stats");
  } catch (e) {
    console.error("Dashboard stats error", e);
  }

  // 7) Project status details (if projectId)
  if (projectId) {
    try {
      const r = await req("GET", `/api/projects/${projectId}/status`, {
        headers: authHeader,
      });
      await save("07-project-status", r.status, r.headers, r.text);
      console.log("Saved 07-project-status");
    } catch (e) {
      console.error("Project status error", e);
    }
  }

  // 12) Additional info
  console.log("Run finished. Results in", resultsDir);
})();
