const { execSync } = require("child_process");

const ALLOWED_PACKAGES = new Set(["minimatch", "glob", "swagger-jsdoc"]);
const ALLOWED_ADVISORY_IDS = new Set(["ghsa-3ppc-4f35-3m26"]);

function runAuditJson() {
  try {
    execSync("npm audit --omit=dev --json", {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      vulnerabilities: {},
      metadata: { vulnerabilities: { high: 0, critical: 0 } },
    };
  } catch (error) {
    const stdout = error && error.stdout ? String(error.stdout) : "";
    if (!stdout) {
      const stderr = error && error.stderr ? String(error.stderr) : "";
      throw new Error(
        `No se pudo obtener salida JSON de npm audit. ${stderr}`.trim(),
      );
    }

    try {
      return JSON.parse(stdout);
    } catch (parseError) {
      throw new Error(
        `Salida JSON inválida de npm audit: ${parseError.message}`,
      );
    }
  }
}

function normalizeVulnerabilities(auditJson) {
  if (!auditJson || typeof auditJson !== "object") {
    return [];
  }

  const vulnerabilities = auditJson.vulnerabilities || {};

  return Object.entries(vulnerabilities).map(([name, vulnerability]) => ({
    name,
    severity: vulnerability.severity || "unknown",
    via: Array.isArray(vulnerability.via) ? vulnerability.via : [],
    nodes: Array.isArray(vulnerability.nodes) ? vulnerability.nodes : [],
    effects: Array.isArray(vulnerability.effects) ? vulnerability.effects : [],
  }));
}

function isAllowedKnownIssue(vulnerability) {
  if (!ALLOWED_PACKAGES.has(vulnerability.name)) {
    return false;
  }

  const fromSwaggerJsdocTree = vulnerability.nodes.some((node) =>
    String(node).includes("node_modules/swagger-jsdoc"),
  );

  if (!fromSwaggerJsdocTree) {
    return false;
  }

  const hasKnownAdvisory = vulnerability.via.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const url = String(entry.url || "").toLowerCase();
    for (const advisoryId of ALLOWED_ADVISORY_IDS) {
      if (url.includes(advisoryId)) {
        return true;
      }
    }

    return false;
  });

  const hasKnownTransitiveChain = vulnerability.via.some((entry) => {
    if (typeof entry === "string") {
      return ALLOWED_PACKAGES.has(entry.toLowerCase());
    }

    if (entry && typeof entry === "object") {
      const title = String(entry.title || "").toLowerCase();
      return title.includes("minimatch") || title.includes("redos");
    }

    return false;
  });

  const referencesAllowedEffects = vulnerability.effects.some((effect) =>
    ALLOWED_PACKAGES.has(String(effect).toLowerCase()),
  );

  return hasKnownAdvisory || hasKnownTransitiveChain || referencesAllowedEffects;
}

function main() {
  const auditJson = runAuditJson();
  const vulnerabilities = normalizeVulnerabilities(auditJson);

  const blocking = vulnerabilities.filter((vulnerability) => {
    const isHighOrCritical =
      vulnerability.severity === "high" ||
      vulnerability.severity === "critical";
    if (!isHighOrCritical) {
      return false;
    }

    return !isAllowedKnownIssue(vulnerability);
  });

  const allowed = vulnerabilities.filter(
    (vulnerability) =>
      (vulnerability.severity === "high" ||
        vulnerability.severity === "critical") &&
      isAllowedKnownIssue(vulnerability),
  );

  if (allowed.length > 0) {
    console.log(
      "⚠️ Vulnerabilidades conocidas permitidas temporalmente (transitivas):",
    );
    for (const vulnerability of allowed) {
      console.log(
        `  - ${vulnerability.name} (${vulnerability.severity}) via swagger-jsdoc`,
      );
    }
  }

  if (blocking.length > 0) {
    console.error("❌ Vulnerabilidades bloqueantes detectadas por CI:");
    for (const vulnerability of blocking) {
      console.error(`  - ${vulnerability.name} (${vulnerability.severity})`);
    }
    process.exit(1);
  }

  console.log(
    "✅ Audit CI aprobado: sin vulnerabilidades high/critical bloqueantes.",
  );
}

main();
