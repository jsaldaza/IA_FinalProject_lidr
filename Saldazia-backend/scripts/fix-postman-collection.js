const fs = require("fs");
const path = require("path");

const input = path.join(__dirname, "..", "testforge-postman-collection.json");
const output = path.join(
  __dirname,
  "..",
  "testforge-postman-collection-fixed.json"
);

function buildUrlObject(raw) {
  // raw like "{{HOST}}/api/auth/login" or "{{HOST}}/health"
  if (!raw) return { raw };
  // Remove leading variable portion like {{HOST}} or {{HOST}}/
  const variablePrefixMatch = raw.match(/^\s*\{\{[^}]+\}\}\s*(\/)?(.*)$/);
  let rest = raw;
  if (variablePrefixMatch) {
    rest = variablePrefixMatch[2] || "";
  } else {
    // If raw contains full URL, try to parse it
    const m = raw.match(/https?:\/\/([^/]+)(.*)/);
    if (m) {
      const hostAndPort = m[1];
      const pathPart = m[2] || "";
      const hostParts = hostAndPort.split(":");
      const host = hostParts[0];
      const port = hostParts[1] || undefined;
      const pathArray = pathPart.split("/").filter(Boolean);
      return {
        raw,
        protocol: m[0].startsWith("https") ? "https" : "http",
        host: [host],
        port: port,
        path: pathArray,
      };
    }
  }

  const pathParts = rest.split("/").filter(Boolean);
  // Default protocol and host refs use environment variables
  return {
    raw,
    protocol: "http",
    host: ["{{HOSTNAME}}"],
    port: "{{HOST_PORT}}",
    path: pathParts,
  };
}

function processItem(item) {
  if (item.request && item.request.url && item.request.url.raw) {
    item.request.url = buildUrlObject(item.request.url.raw);
  }
  // some items might have event etc, but may also have nested items
  if (item.item && Array.isArray(item.item)) {
    item.item.forEach(processItem);
  }
}

function main() {
  const data = JSON.parse(fs.readFileSync(input, "utf8"));
  if (!data.item || !Array.isArray(data.item)) {
    console.error("Unexpected collection format");
    process.exit(1);
  }
  data.item.forEach(processItem);
  fs.writeFileSync(output, JSON.stringify(data, null, 2), "utf8");
  console.log("Wrote fixed collection to", output);
}

main();
