import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { iniciarGeneradorGastosFijos } from './services/gastos-fijos.service.js';
import { migrarDatosExistentes } from './services/migracion-usuarios.service.js';

const port = Number(process.env['PORT'] ?? 3000);

async function startServer(): Promise<void> {
  await connectDatabase();

  // Asigna los datos antiguos a su dueño y prepara los índices por usuario.
  await migrarDatosExistentes();

  // Genera automáticamente los movimientos de los gastos fijos del mes actual.
  iniciarGeneradorGastosFijos();

  app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor iniciado en el puerto ${port}`);
});
}

startServer().catch((error: unknown) => {
  console.error('Error al iniciar el servidor:', error);
  process.exit(1);
});
