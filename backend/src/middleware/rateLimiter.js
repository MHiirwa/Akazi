import rateLimit from "express-rate-limit";
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a few minutes." }
});
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many write requests. Please slow down and try again shortly."
  }
});
function strictOnPost(req, res, next) {
  if (req.method === "POST") return strictLimiter(req, res, next);
  return next();
}
export {
  generalLimiter,
  strictLimiter,
  strictOnPost
};
