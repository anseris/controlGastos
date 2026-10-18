import express from 'express';
import cors from 'cors';
import movimientosRoutes from './routes/movimientos.routes.js';
import categoriasRoutes from './routes/categorias.routes.js';

const app = express();

app.use(cors({
  origin: 'http://localhost:4200'
}));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mensaje: 'API funcionando correctamente'
  });
});

app.use('/api/movimientos', movimientosRoutes);
app.use('/api/categorias', categoriasRoutes);

export default app;
