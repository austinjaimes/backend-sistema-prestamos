import mongoose from "mongoose";

const PrestamoSchema = new mongoose.Schema({
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente", required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  monto: { type: Number, required: true },
  interesMensual: { type: Number, required: true },
  fechaInicio: { type: Date, required: true },
  dias: { type: Number, required: true },
  cobradoHoy: { type: Boolean, default: false },
  montoRecuperado: { type: Number, default: 0 }, // nuevo campo para abonos
}, { timestamps: true });

export default mongoose.model("Prestamo", PrestamoSchema);
