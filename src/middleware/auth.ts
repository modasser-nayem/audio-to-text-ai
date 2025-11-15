import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
   const auth = req.headers.authorization;
   if (!auth) return res.status(401).json({ error: "missing auth" });

   const [scheme, token] = auth.split(" ");
   if (scheme !== "Bearer" || !token)
      return res.status(401).json({ error: "invalid auth format" });

   try {
      const payload = jwt.verify(token, config.jwtSecret);
      // attach if necessary
      (req as any).user = payload;
      next();
   } catch (err) {
      return res.status(401).json({ error: "invalid token" });
   }
}
