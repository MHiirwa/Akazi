import "dotenv/config";
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}
const { default: app } = await import("./app.js");
const PORT = process.env.PORT || 3e3;
const server = app.listen(PORT, () => {
  console.log(`Akazi API running on http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

// Fast, clean shutdown on Ctrl+C or when `tsx watch` restarts us on a file
// save. We drop idle keep-alive sockets so the HTTP server closes *immediately*
// and the port is freed at once — without this, server.close() waits for those
// sockets to drain, tsx times out waiting, and reports "Previous process hasn't
// exited yet. Force killing...". A short timer is a last-resort safety net.
function shutdown() {
  server.closeAllConnections?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1e3).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
