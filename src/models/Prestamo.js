import mongoose from "mongoose";

const PrestamoSchema = new mongoose.Schema({
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente", required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  monto: { type: Number, required: true },
  interesMensual: { type: Number, required: true },
  fechaInicio: { type: Date, required: true },

  dias: { type: Number, required: true },
  diasTotales: { type: Number, required: true },

  pagoDiarioFijo: { type: Number, required: true }, // nuevo campo fijo

  cobradoHoy: { type: Boolean, default: false },
  montoRecuperado: { type: Number, default: 0 },
}, { timestamps: true });

PrestamoSchema.virtual("dineroRestante").get(function () {
  return Math.max(this.monto - this.montoRecuperado, 0);
});

PrestamoSchema.set("toJSON", { virtuals: true });
PrestamoSchema.set("toObject", { virtuals: true });

export default mongoose.model("Prestamo", PrestamoSchema);
