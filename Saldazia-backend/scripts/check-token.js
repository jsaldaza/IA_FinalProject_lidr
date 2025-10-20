#!/usr/bin/env node
// Use the built-in global fetch available in Node 18+
const fetch = globalThis.fetch;

const email = process.argv[2] || "test@testforge.com";
const password = process.argv[3] || "TestForge2024!";
async function main() {
  try {
    const loginRes = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const loginJson = await loginRes.json();
    console.log("login status", loginRes.status);
    console.log("login body", JSON.stringify(loginJson));

    if (!loginRes.ok) process.exit(1);

    const token = loginJson?.data?.token;
    if (!token) throw new Error("no token");

    const profileRes = await fetch("http://localhost:3001/api/auth/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const profileJson = await profileRes.json();
    console.log("profile status", profileRes.status);
    console.log("profile body", JSON.stringify(profileJson));
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
