import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { iniciarGeneradorGastosFijos } from './services/gastos-fijos.service.js';
import { migrarDatosExistentes } from './services/migracion-usuarios.service.js';

const port = Number(process.env['PORT'] ?? 3000);

/** Variables sin las que el backend no puede funcionar correctamente. */
const VARIABLES_OBLIGATORIAS = ['MONGODB_URI', 'JWT_SECRET'] as const;

/**
 * Comprueba la configuración antes de arrancar. Así, si falta una variable
 * en el entorno de despliegue (por ejemplo en Render), el error aparece
 * claramente en los logs en lugar de fallar más tarde en el login.
 */
function validarVariablesEntorno(): void {
  const faltantes = VARIABLES_OBLIGATORIAS.filter((nombre) => !process.env[nombre]);

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de entorno obligatorias: ${faltantes.join(', ')}. ` +
        'Configúralas en el panel del servicio (Render > Environment).'
    );
  }
}

async function startServer(): Promise<void> {
  validarVariablesEntorno();

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
