import mongoose from "mongoose";
import dotenv from "dotenv";
import Prestamo from "../models/Prestamo.js"; // Ajusta la ruta según estructura de tu proyecto

dotenv.config();

async function agregarUsuarioIdAPlestamos(usuarioId) {
  if (!mongoose.Types.ObjectId.isValid(usuarioId)) {
    console.error("❌ El usuarioId proporcionado NO es un ObjectId válido");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    const resultado = await Prestamo.updateMany(
      { usuarioId: { $exists: false } }, // Solo documentos sin usuarioId
      { $set: { usuarioId } }
    );

    console.log(`🔄 Documentos actualizados: ${resultado.modifiedCount}`);
  } catch (error) {
    console.error("❌ Error al actualizar préstamos:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Desconectado de MongoDB");
  }
}

// UsuarioId para asignar (pasa por argumento o usa este por defecto)
const usuarioIdDePrueba = process.argv[2] || "68979dff25bdc8df03ae98f0";

agregarUsuarioIdAPlestamos(usuarioIdDePrueba);
