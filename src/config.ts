import dotenv from "dotenv";
dotenv.config();

export const config = {
   port: Number(process.env.PORT || 8080),
   openaiApiKey: process.env.OPENAI_API_KEY || "",
   elevenLabsApiKey: process.env.ELEVEN_LABS_API_KEY || "",
   jwtSecret: process.env.JWT_SECRET || "dev-secret",
   maxClients: Number(process.env.MAX_CLIENTS || 200),
   allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
};
