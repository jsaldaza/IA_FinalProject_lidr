// Decodificar el token para verificar su contenido
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNlNWZhNjYyLWZlNzEtNDMwYi05MDg1LTgzOTkyNjViMjYxMyIsImVtYWlsIjoidGVzdDE0QHRlc3Rmb3JnZS5jb20iLCJpYXQiOjE3NTY1MTk5MTMsImV4cCI6MTc1NjYwNjMxM30.waKEM-7Q2rJLHwpdEz1fCUJ1_x64TfttjSW8evHwKHI";

let StructuredLogger;
try {
  StructuredLogger =
    require("../../testforge-backend/dist/utils/structured-logger").StructuredLogger;
} catch (e) {
  StructuredLogger =
    require("../../testforge-backend/src/utils/structured-logger").StructuredLogger;
}

try {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString()
  );
  // Avoid printing full payload in logs; print limited, redacted info
  const now = Math.floor(Date.now() / 1000);
  const isExpired = payload.exp < now;

  StructuredLogger.info("Token decoded", {
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    now: new Date(now * 1000).toISOString(),
    valid: !isExpired,
    userId: String(payload.id).substring(0, 8) + "...",
  });
} catch (e) {
  StructuredLogger.error("Error decoding token", e, {});
}
