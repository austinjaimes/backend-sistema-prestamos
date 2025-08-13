// // cronResetCobradoHoy.js
// import cron from "node-cron";
// import mongoose from "mongoose";
// import Prestamo from "./src/models/Prestamo.js"; // Ajusta la ruta si es necesario
// import dotenv from "dotenv";

// dotenv.config();

// const MONGODB_URI =
//   process.env.MONGO_URI || // ojo que en tu main usas MONGO_URI, no MONGODB_URI
//   "mongodb+srv://austinjaimescruz:magnifico102288@sistema-prestamos.hnb4af2.mongodb.net/prestamos_db?retryWrites=true&w=majority&appName=sistema-prestamos";

// async function conectarDB() {
//   try {
//     await mongoose.connect(MONGODB_URI);
//     console.log("✅ Conectado a MongoDB");
//   } catch (error) {
//     console.error("❌ Error conectando a MongoDB:", error);
//     process.exit(1);
//   }
// }

// async function resetearCobradoHoy() {
//   try {
//     const prestamos = await Prestamo.find();

//     for (const p of prestamos) {
//       // Validar que tenga usuarioId y campos obligatorios
//       if (!p.usuarioId) {
//         console.warn(`Préstamo ${p._id} sin usuarioId, se salta.`);
//         continue;
//       }
//       if (p.interesMensual === undefined) {
//         console.warn(`Préstamo ${p._id} sin interesMensual, se salta.`);
//         continue;
//       }
//       if (p.montoFinal === undefined) {
//         console.warn(`Préstamo ${p._id} sin montoFinal, se salta.`);
//         continue;
//       }
//       if (p.diasTotales === undefined) {
//         console.warn(`Préstamo ${p._id} sin diasTotales, se salta.`);
//         continue;
//       }
//       if (p.pagoDiarioFijo === undefined) {
//         console.warn(`Préstamo ${p._id} sin pagoDiarioFijo, se salta.`);
//         continue;
//       }

//       // Solo resetear cobradoHoy, sin tocar días ni otros campos
//       p.cobradoHoy = false;

//       await p.save();
//     }
//     console.log(`✅ Reseteado cobradoHoy para ${prestamos.length} préstamos`);
//   } catch (error) {
//     console.error("❌ Error en resetearCobradoHoy:", error);
//   }
// }

// async function iniciarCron() {
//   await conectarDB();

//   // Ejecutar cada minuto, puedes ajustar el cron según necesites
//   cron.schedule("* * * * *", async () => {
//     console.log("⏰ Ejecutando tarea programada: resetear cobradoHoy");
//     await resetearCobradoHoy();
//   });

//   console.log("✅ Cron iniciado, ejecutándose cada minuto...");
// }

// iniciarCron();
