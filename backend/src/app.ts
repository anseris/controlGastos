import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import movimientosRoutes from "./routes/movimientos.routes.js";
import categoriasRoutes from "./routes/categorias.routes.js";
import presupuestosRoutes from "./routes/presupuestos.routes.js";
import cuentasBancoRoutes from "./routes/cuentas-banco.routes.js";
import gastosFijosRoutes from "./routes/gastos-fijos.routes.js";
import amortizacionPrestamoRoutes from "./routes/amortizacion-prestamo.routes.js";
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:4200",
      "http://localhost:62187",
      "http://127.0.0.1:4200",
      "http://127.0.0.1:62187",
      "https://control-gastos.anseris51-2f5.workers.dev",
    ],
  }),
);

app.use(express.json({ limit: '15mb' }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mensaje: "API funcionando correctamente",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/movimientos", requireAuth, movimientosRoutes);
app.use("/api/categorias", requireAuth, categoriasRoutes);
app.use("/api/presupuestos", requireAuth, presupuestosRoutes);
app.use("/api/cuentas-banco", requireAuth, cuentasBancoRoutes);
app.use("/api/gastos-fijos", requireAuth, gastosFijosRoutes);
app.use("/api/amortizacion-prestamo", requireAuth, amortizacionPrestamoRoutes);

export default app;
