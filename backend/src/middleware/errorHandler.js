function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Invalid input",
      details: err.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
    });
  }
  if (err.name === "MulterError") {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Image must be 5MB or smaller." : err.message;
    return res.status(400).json({ error: msg });
  }
  if (/Only image files are allowed|Only PDF or Word documents/.test(err.message || "")) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Not found" });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ error: "That value is already in use" });
  }
  const status = err.status || 500;
  const message = status === 500 ? "Something went wrong on our end" : err.message;
  res.status(status).json({ error: message });
}
var errorHandler_default = errorHandler;
export {
  errorHandler_default as default
};
