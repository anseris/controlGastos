// import 'dotenv/config';
// import app from './app';
// import { connectDB } from './config/database';

// const PORT = process.env.PORT ?? 3000;

// const main = async (): Promise<void> => {
//   await connectDB();
//   app.listen(PORT, () => {
//     console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
//   });
// };

// main();


import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env['PORT'] ?? 3000);

async function startServer(): Promise<void> {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('Error al iniciar el servidor:', error);
  process.exit(1);
});
