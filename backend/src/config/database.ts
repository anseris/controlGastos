// import mongoose from 'mongoose';

// export const connectDB = async (): Promise<void> => {
//   try {
//     const uri = process.env.MONGO_URI;
//     if (!uri) {
//       throw new Error('MONGO_URI no está definida en .env');
//     }
//     await mongoose.connect(uri);
//     console.log('✅ MongoDB conectado');
//   } catch (error) {
//     console.error('❌ Error al conectar con MongoDB:', error);
//     process.exit(1);
//   }
// };


import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri = process.env['MONGODB_URI'];

  if (!uri) {
    throw new Error('Falta configurar MONGODB_URI en .env');
  }

  await mongoose.connect(uri);

  console.log('Conexión con MongoDB establecida');
};

