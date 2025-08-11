// cronResetCobradoHoy.js
import cron from "node-cron";
import mongoose from "mongoose";
import Prestamo from "./src/models/Prestamo.js"; // Ajusta la ruta según tu estructura
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://austinjaimescruz:magnifico102288@sistema-prestamos.hnb4af2.mongodb.net/prestamos_db?retryWrites=true&w=majority&appName=sistema-prestamos";

async function conectarDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Conectado a MongoDB");
  } catch (error) {
    console.error("Error conectando a MongoDB:", error);
    process.exit(1);
  }
}
async function resetearCobradoHoyYRestarDias() {
  try {
    const prestamos = await Prestamo.find({ dias: { $gt: 0 } });

    for (const p of prestamos) {
      // Validar que tenga usuarioId
      if (!p.usuarioId) {
        console.warn(`Préstamo ${p._id} sin usuarioId, se salta.`);
        continue; // saltar ese registro
      }

      p.cobradoHoy = false;
      p.dias = p.dias - 1;
      await p.save();
    }
    console.log(
      `Reseteado cobradoHoy y descontado 1 día para ${prestamos.length} préstamos`
    );
  } catch (error) {
    console.error("Error en resetearCobradoHoyYRestarDias:", error);
  }
}

async function iniciarCron() {
  await conectarDB();

  // Ejecutar cada minuto
  cron.schedule("* * * * *", async () => {
    console.log("Ejecutando tarea programada: resetear cobradoHoy y descontar días");
    await resetearCobradoHoyYRestarDias();
  });

  console.log("Cron iniciado, ejecutándose cada minuto...");
}

iniciarCron();
