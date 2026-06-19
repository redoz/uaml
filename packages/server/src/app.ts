import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { authRoutes } from "./routes/auth";
import { dataMartRoutes } from "./routes/datamarts";
import { metaRoutes } from "./routes/meta";

export function buildApp() {
  const app = Fastify({ logger: false });
  app.register(cookie);
  app.register(authRoutes);
  app.register(dataMartRoutes);
  app.register(metaRoutes);
  // Surface the real upstream error (OwoxClient throws with the OWOX status + body)
  // instead of Fastify's generic "Internal Server Error", so the UI can show it.
  app.setErrorHandler((err: Error, _req, reply) => {
    reply.code(502).send({ error: err.message || "Upstream error" });
  });
  return app;
}
