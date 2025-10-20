#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || "test@example.com";
  const password = args[1] || "Secret123";

  const url = "http://localhost:3001/api/auth/login";
  console.log(`Requesting token for ${email} -> ${url}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Non-JSON response (${res.status}): ${text}`);
    }

    if (!res.ok) {
      throw new Error(`Login failed: ${res.status} ${JSON.stringify(json)}`);
    }

    const token = json?.data?.token;
    if (!token) throw new Error("No token found in response");

    const envPath = path.join(
      __dirname,
      "..",
      "TestForge-Local.postman_environment.json"
    );
    const envRaw = fs.readFileSync(envPath, "utf8");
    const env = JSON.parse(envRaw);

    if (!env.values || !Array.isArray(env.values)) {
      throw new Error("Environment file is missing expected `values` array");
    }

    const idx = env.values.findIndex((v) => v.key === "authToken");
    if (idx >= 0) {
      env.values[idx].value = token;
    } else {
      env.values.push({
        key: "authToken",
        value: token,
        type: "text",
        enabled: true,
      });
    }

    fs.writeFileSync(envPath, JSON.stringify(env, null, 2));
    console.log("Token saved to TestForge-Local.postman_environment.json");
    console.log(token);
  } catch (err) {
    console.error("Error:", err.message || err);
    process.exit(1);
  }
}

main();
