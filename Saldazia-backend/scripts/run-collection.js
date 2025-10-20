const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function resolveVars(str, env) {
  if (!str) return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (_, k) =>
    env[k] !== undefined ? env[k] : `{{${k}}}`
  );
}

function buildUrl(item, env) {
  const urlObj = item.request && item.request.url;
  if (!urlObj) return null;
  if (typeof urlObj === "string") return resolveVars(urlObj, env);
  if (urlObj.raw && urlObj.protocol === undefined)
    return resolveVars(urlObj.raw, env);
  const protocol = urlObj.protocol || "http";
  let host = "";
  if (Array.isArray(urlObj.host))
    host = urlObj.host.map((h) => resolveVars(h, env)).join(".");
  else if (urlObj.host) host = resolveVars(urlObj.host, env);
  const port = urlObj.port ? `:${resolveVars(urlObj.port, env)}` : "";
  const urlPath = Array.isArray(urlObj.path)
    ? "/" + urlObj.path.map((p) => resolveVars(p, env)).join("/")
    : urlObj.path || "";
  const query =
    Array.isArray(urlObj.query) && urlObj.query.length
      ? "?" +
        urlObj.query
          .map(
            (q) =>
              `${q.key}=${encodeURIComponent(resolveVars(q.value || "", env))}`
          )
          .join("&")
      : "";
  return `${protocol}://${host}${port}${urlPath}${query}`;
}

function requestRaw(method, urlStr, headers, body, timeout = 20000) {
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
        if (typeof body === "object") req.write(JSON.stringify(body));
        else req.write(body);
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
  const collPath = path.join(cwd, "testforge-postman-collection-fixed.json");
  const envPath = path.join(cwd, "localhost-lidr.postman_environment.json");
  if (!fs.existsSync(collPath)) {
    console.error("Collection not found:", collPath);
    process.exit(2);
  }
  const coll = loadJson(collPath);
  const envJson = fs.existsSync(envPath) ? loadJson(envPath) : { values: [] };
  const env = {};
  (envJson.values || []).forEach((v) => {
    env[v.key] = v.value;
  });
  // Normalize stored authToken from environment: remove leading 'Bearer ' if present
  if (env["authToken"] && typeof env["authToken"] === "string") {
    env["authToken"] = env["authToken"].replace(/^Bearer\s+/i, "");
  }
  const outDir = path.join(cwd, "api-test-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const results = [];
  const items = coll.item || [];

  async function runItem(i) {
    const it = items[i];
    const name = it.name || `item-${i}`;
    const url = buildUrl(it, env);
    if (!url) {
      console.log(`[SKIP] ${name} - no url`);
      results.push({ name, status: "skipped", reason: "no url" });
      return;
    }
    const method = (it.request && it.request.method) || "GET";
    const headers = {};
    ((it.request && it.request.header) || []).forEach((h) => {
      if (h && h.key) {
        headers[h.key] = resolveVars(h.value || "", env);
      }
    });
    // Normalize Authorization header if present (remove any accidental 'Bearer' prefixes
    // and replace {{authToken}} placeholders with the raw token)
    if (headers["Authorization"]) {
      let hv = String(headers["Authorization"] || "");
      // Replace placeholder with raw token if present
      if (/\{\{\s*authToken\s*\}\}/i.test(hv) && env["authToken"]) {
        hv = hv.replace(/\{\{\s*authToken\s*\}\}/gi, env["authToken"]);
      }
      // Strip any number of 'Bearer' words to get the token-only part
      const tokenOnly = hv.replace(/Bearer\s+/gi, "").trim();
      if (tokenOnly) headers["Authorization"] = `Bearer ${tokenOnly}`;
    }
    // Resolve authToken placeholders and ensure Authorization header is a single 'Bearer <token>'
    Object.keys(headers).forEach((k) => {
      let v = headers[k] || "";
      // If header contains {{authToken}} placeholder, replace with raw token
      if (/\{\{\s*authToken\s*\}\}/i.test(v) && env["authToken"]) {
        v = v.replace(/\{\{\s*authToken\s*\}\}/gi, env["authToken"]);
      }
      // Collapse accidental double 'Bearer Bearer '
      v = v.replace(/Bearer\s+Bearer\s+/i, "Bearer ");
      headers[k] = v;
    });
    // debug: show current stored authToken (raw)
    if (env["authToken"])
      console.log(` -> env.authToken (raw)=${env["authToken"].slice(0, 8)}...`);
    // inject cookie if captured
    if (!headers["Cookie"] && env["cookie"]) headers["Cookie"] = env["cookie"];
    let body = null;
    if (it.request && it.request.body && it.request.body.mode === "raw") {
      const raw = resolveVars(it.request.body.raw || "", env);
      try {
        body = JSON.parse(raw);
      } catch (e) {
        body = raw;
      }
    }
    // Ensure Authorization header is exactly 'Bearer <raw-token>' when we have a token
    if (env["authToken"]) {
      const raw = String(env["authToken"]).replace(/^Bearer\s+/i, "");
      headers["Authorization"] = `Bearer ${raw}`;
    }
    // Also normalize any existing Authorization header that may contain multiple 'Bearer'
    if (headers["Authorization"]) {
      const headerVal = String(headers["Authorization"]);
      const tokenOnly = headerVal.replace(/Bearer\s+/gi, "").trim();
      headers["Authorization"] = `Bearer ${tokenOnly}`;
    }
    console.log(`[RUN] ${name} ${method} ${url}`);
    console.log(` -> Outgoing headers: ${JSON.stringify(headers)}`);
    try {
      const maxRetries = 5;
      let attempt = 0;
      let res;
      for (; attempt <= maxRetries; attempt++) {
        res = await requestRaw(method, url, headers, body);
        // If rate limited, respect retry-after or ratelimit-reset and retry
        if (res && Number(res.statusCode) === 429) {
          const h = res.headers || {};
          const ra =
            h["retry-after"] || h["x-retry-after"] || h["ratelimit-reset"];
          let waitSec = 5;
          if (ra) {
            const n = Number(ra);
            if (!Number.isNaN(n) && n > 0) waitSec = n;
            else {
              // try parse as date
              const t = Date.parse(String(ra));
              if (!Number.isNaN(t)) {
                const delta = Math.max(0, Math.ceil((t - Date.now()) / 1000));
                waitSec = delta || waitSec;
              }
            }
          }
          const waitMs = Math.min(60000, (waitSec + attempt * 2) * 1000);
          console.log(
            ` -> Received 429, waiting ${waitMs}ms before retry (attempt ${
              attempt + 1
            }/${maxRetries})`
          );
          await sleep(waitMs);
          continue;
        }
        break;
      }
      const filename = path.join(
        outDir,
        `${i}_${name.replace(/[^a-z0-9\-_.]/gi, "_")}.json`
      );
      fs.writeFileSync(
        filename,
        JSON.stringify(
          {
            name,
            url,
            method,
            requestHeaders: headers,
            requestBody: body,
            response: res,
          },
          null,
          2
        )
      );
      console.log(` -> ${res.statusCode} saved to ${filename}`);
      results.push({
        name,
        status: "done",
        code: res.statusCode,
        file: filename,
      });
      try {
        const parsed = JSON.parse(res.body || "{}");
        const token =
          parsed.token ||
          parsed.accessToken ||
          parsed.authToken ||
          parsed.jwt ||
          (parsed.data && (parsed.data.token || parsed.data.accessToken));
        if (token) {
          // store raw token (without 'Bearer ' prefix) so templates like
          // 'Bearer {{authToken}}' don't end up as 'Bearer Bearer ...'
          env["authToken"] = token.startsWith("Bearer ")
            ? token.split(/\s+/, 2)[1]
            : token;
          console.log(
            " -> Captured auth token (stored raw token in env.authToken)"
          );
        }

        // Capture set-cookie header(s)
        if (res.headers && res.headers["set-cookie"]) {
          try {
            const cookies = res.headers["set-cookie"];
            // join cookies into single Cookie header
            const cookieHeader = Array.isArray(cookies)
              ? cookies.map((c) => c.split(";")[0]).join("; ")
              : String(cookies).split(";")[0];
            env["cookie"] = cookieHeader;
            console.log(` -> Captured cookie: ${env["cookie"]}`);
          } catch (e) {}
        }

        // Capture common ids (project, analysis, testcase) based on url and body
        const lurl = (url || "").toLowerCase();
        const idCandidates = [];
        if (parsed) {
          if (parsed.id) idCandidates.push({ k: "id", v: parsed.id });
          if (parsed._id) idCandidates.push({ k: "_id", v: parsed._id });
          if (parsed.projectId)
            idCandidates.push({ k: "projectId", v: parsed.projectId });
          if (parsed.project_id)
            idCandidates.push({ k: "project_id", v: parsed.project_id });
          if (parsed.analysisId)
            idCandidates.push({ k: "analysisId", v: parsed.analysisId });
          if (parsed.analysis_id)
            idCandidates.push({ k: "analysis_id", v: parsed.analysis_id });
          if (parsed.testcaseId)
            idCandidates.push({ k: "testcaseId", v: parsed.testcaseId });
          if (parsed.testcase_id)
            idCandidates.push({ k: "testcase_id", v: parsed.testcase_id });
          if (parsed.data && typeof parsed.data === "object") {
            const d = parsed.data;
            if (d.id) idCandidates.push({ k: "data.id", v: d.id });
            if (d.project && d.project.id)
              idCandidates.push({ k: "data.project.id", v: d.project.id });
            if (d.analysis && d.analysis.id)
              idCandidates.push({ k: "data.analysis.id", v: d.analysis.id });
          }
        }

        // Heuristic: if request was POST to /projects -> PROJECT_ID
        if (lurl.includes("/api/projects") && method.toUpperCase() === "POST") {
          const cand = idCandidates.find((c) => !!c.v);
          if (cand) {
            env["PROJECT_ID"] = String(cand.v);
            console.log(` -> Captured PROJECT_ID=${env["PROJECT_ID"]}`);
          }
        }
        // POST to analyses or /analysis -> ANALYSIS_ID
        if (
          (lurl.includes("/api/analysis") || lurl.includes("/analyses")) &&
          method.toUpperCase() === "POST"
        ) {
          const cand = idCandidates.find((c) => !!c.v);
          if (cand) {
            env["ANALYSIS_ID"] = String(cand.v);
            console.log(` -> Captured ANALYSIS_ID=${env["ANALYSIS_ID"]}`);
          }
        }
        // POST to /testcases or similar -> TESTCASE_ID
        if (
          (lurl.includes("/testcases") ||
            lurl.includes("/test-case") ||
            lurl.includes("/test_case")) &&
          method.toUpperCase() === "POST"
        ) {
          const cand = idCandidates.find((c) => !!c.v);
          if (cand) {
            env["TESTCASE_ID"] = String(cand.v);
            console.log(` -> Captured TESTCASE_ID=${env["TESTCASE_ID"]}`);
          }
        }
      } catch (e) {}
    } catch (err) {
      const filename = path.join(
        outDir,
        `${i}_${name.replace(/[^a-z0-9\-_.]/gi, "_")}_error.json`
      );
      fs.writeFileSync(
        filename,
        JSON.stringify(
          {
            name,
            url,
            method,
            requestHeaders: headers,
            requestBody: body,
            error: String(err),
          },
          null,
          2
        )
      );
      console.error(
        ` -> ERROR for ${name}: ${err.message} (saved to ${filename})`
      );
      results.push({
        name,
        status: "error",
        reason: String(err),
        file: filename,
      });
    }
    // small delay between requests to avoid hitting rate limits
    const delayMs = Number(env["requestDelayMs"] || 300);
    await sleep(delayMs);
  }

  const loginIndex = items.findIndex((it) => {
    try {
      const u = buildUrl(it, env) || "";
      return /\/api\/auth\/login/.test(u) || /login/i.test(it.name || "");
    } catch (e) {
      return false;
    }
  });
  if (loginIndex >= 0) await runItem(loginIndex);
  for (let i = 0; i < items.length; i++) {
    if (i === loginIndex) continue;
    await runItem(i);
  }
  const summary = { runAt: new Date().toISOString(), results };
  fs.writeFileSync(
    path.join(outDir, "summary.json"),
    JSON.stringify(summary, null, 2)
  );
  console.log(
    "Run finished. Summary saved to",
    path.join(outDir, "summary.json")
  );
}

run();
