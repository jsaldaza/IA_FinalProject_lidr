const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function request(method, urlStr, headers, body, timeout = 20000) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const opts = {
        method,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + (url.search || ""),
        headers: headers || {},
        timeout,
      };
      const lib = url.protocol === "https:" ? https : http;
      const req = lib.request(opts, (res) => {
        let data = "";
        res.on("data", (c) => (data += c.toString()));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          })
        );
      });
      req.on("error", (err) => reject(err));
      if (body) {
        req.write(typeof body === "string" ? body : JSON.stringify(body));
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function run() {
  const cwd = path.join(__dirname, "..");
  const envPath = path.join(cwd, "localhost-lidr.postman_environment.json");
  const outDir = path.join(cwd, "api-test-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const envJson = fs.existsSync(envPath) ? loadJson(envPath) : { values: [] };
  const env = {};
  (envJson.values || []).forEach((v) => (env[v.key] = v.value));
  const base =
    (env.HOST || env.host || "http://localhost") +
    (env.HOST_PORT ? `:${env.HOST_PORT}` : "");
  const host = base.replace(/:\/\//, "://");
  const email = env.EMAIL || "test@example.com";
  const password = env.PASSWORD || "Secret123";
  let token = env.authToken;
  let cookie = env.cookie;

  function outFile(name) {
    return path.join(
      outDir,
      `${Date.now()}_${name.replace(/[^a-z0-9\-_.]/gi, "_")}.json`
    );
  }

  // login
  console.log("Login...");
  try {
    const res = await request(
      "POST",
      `${host}/api/auth/login`,
      { "Content-Type": "application/json" },
      { email, password }
    );
    fs.writeFileSync(
      outFile("e2e_auth_login"),
      JSON.stringify({ req: { email }, res }, null, 2)
    );
    if (res.statusCode !== 200) {
      console.error("Login failed", res.statusCode, res.body);
      return (process.exitCode = 2);
    }
    const parsed = JSON.parse(res.body || "{}");
    token =
      parsed.token ||
      (parsed.data && parsed.data.token) ||
      (parsed.data && parsed.data.accessToken) ||
      parsed.accessToken ||
      parsed.authToken ||
      parsed.jwt;
    if (token && !token.startsWith("Bearer ")) token = `Bearer ${token}`;
    if (res.headers && res.headers["set-cookie"]) {
      const cookies = res.headers["set-cookie"];
      cookie = Array.isArray(cookies)
        ? cookies.map((c) => c.split(";")[0]).join("; ")
        : String(cookies).split(";")[0];
    }
    console.log(" -> got token");
  } catch (e) {
    console.error("Login error", e.message);
    return (process.exitCode = 3);
  }

  const authHeaders = {};
  if (token) authHeaders["Authorization"] = token;
  if (cookie) authHeaders["Cookie"] = cookie;
  authHeaders["Content-Type"] = "application/json";

  // create and start project
  console.log("Create and start project...");
  let projectId = env.PROJECT_ID;
  try {
    const body = {
      title: env.NAME || "E2E Project",
      description: "Created by e2e-run",
    };
    const res = await request(
      "POST",
      `${host}/api/projects/create-and-start`,
      authHeaders,
      body
    );
    fs.writeFileSync(
      outFile("e2e_projects_create_and_start"),
      JSON.stringify({ req: body, res }, null, 2)
    );
    if (res.statusCode === 201 || res.statusCode === 200) {
      const parsed = JSON.parse(res.body || "{}");
      projectId =
        parsed.id ||
        (parsed.data && parsed.data.id) ||
        (parsed.data && parsed.data.project && parsed.data.project.id) ||
        parsed.projectId ||
        parsed.project_id;
      if (
        !projectId &&
        parsed.data &&
        parsed.data.project &&
        parsed.data.project.id
      )
        projectId = parsed.data.project.id;
      console.log(" -> projectId", projectId);
    } else if (res.statusCode === 401) {
      console.error("Unauthorized when creating project. Check credentials.");
    } else {
      console.error("Create project returned", res.statusCode, res.body);
    }
  } catch (e) {
    console.error("Create project error", e.message);
  }

  if (!projectId) {
    console.log("Attempting fallback: POST /api/projects");
    try {
      const body = {
        title: env.NAME || "E2E Project",
        description: "Created by e2e-run",
      };
      const res = await request(
        "POST",
        `${host}/api/projects`,
        authHeaders,
        body
      );
      fs.writeFileSync(
        outFile("e2e_projects_create"),
        JSON.stringify({ req: body, res }, null, 2)
      );
      if (res.statusCode === 201 || res.statusCode === 200) {
        const parsed = JSON.parse(res.body || "{}");
        projectId =
          parsed.id || (parsed.data && parsed.data.id) || parsed.projectId;
        console.log(" -> projectId", projectId);
      } else {
        console.error("Fallback create returned", res.statusCode);
      }
    } catch (e) {
      console.error("Fallback create error", e.message);
    }
  }

  if (!projectId) {
    console.error("Could not determine projectId. Stopping.");
    return (process.exitCode = 4);
  }

  // poll project status
  console.log("Polling project status...");
  let status = null;
  for (let attempts = 0; attempts < 60; attempts++) {
    try {
      const res = await request(
        "GET",
        `${host}/api/projects/${projectId}/status`,
        authHeaders
      );
      fs.writeFileSync(
        outFile("e2e_projects_status"),
        JSON.stringify({ res }, null, 2)
      );
      if (res.statusCode === 200) {
        const parsed = JSON.parse(res.body || "{}");
        status =
          parsed.status ||
          (parsed.data && parsed.data.status) ||
          parsed.state ||
          parsed.message;
        console.log(" -> status:", status);
        if (
          String(status).toLowerCase() === "completed" ||
          String(status).toLowerCase() === "done" ||
          String(status).toLowerCase() === "finished"
        )
          break;
      } else if (res.statusCode === 404) {
        console.log(" -> status endpoint returned 404, will retry");
      } else if (res.statusCode === 401) {
        console.error(" -> unauthorized polling status");
      }
    } catch (e) {
      console.error("Status poll error", e.message);
    }
    await sleep(5000);
  }

  if (!status)
    console.log(
      "Status unknown after polling, continuing to attempt generation"
    );

  // generate test cases
  console.log("Generate test cases...");
  try {
    const res = await request(
      "POST",
      `${host}/api/test-cases/generate`,
      authHeaders,
      { projectId }
    );
    fs.writeFileSync(
      outFile("e2e_testcases_generate"),
      JSON.stringify({ req: { projectId }, res }, null, 2)
    );
    console.log("Generate status", res.statusCode);
  } catch (e) {
    console.error("Generate error", e.message);
  }

  console.log("E2E run finished. Results in", outDir);
}

run();
