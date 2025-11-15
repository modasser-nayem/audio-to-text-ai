import rateLimit from "express-rate-limit";
export const apiLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   max: 200, // adjust
   standardHeaders: true,
   legacyHeaders: false,
});
