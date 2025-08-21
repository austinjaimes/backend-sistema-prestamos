import mongoose from "mongoose";

const PrestamoSchema = new mongoose.Schema({
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente", required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  monto: { type: Number, required: true },           // monto original prestado
  montoFinal: { type: Number, required: true },      // monto + intereses, total a pagar

  interesMensual: { type: Number, required: true },
  fechaInicio: { type: Date, required: true },

  dias: { type: Number, required: true },
  diasTotales: { type: Number, required: true },

  pagoDiarioFijo: { type: Number, required: true }, // pago diario fijo

  cobradoHoy: { type: Boolean, default: false },
  montoRecuperado: { type: Number, default: 0 },

  // Nueva propiedad: fecha en que termina el préstamo
  fechaTerminacion: { type: Date, required: true },

  // historialPagos ahora es array de objetos para guardar más info, no solo booleanos
  historialPagos: {
    type: [
      {
        pagado: { type: Boolean, default: false },
        monto: { type: Number, default: 0 },
        fecha: { type: Date, default: null },
      }
    ],
    default: [],
  }
}, { timestamps: true });

// Virtual para calcular dinero restante basado en montoFinal
PrestamoSchema.virtual("dineroRestante").get(function () {
  return Math.max(this.montoFinal - this.montoRecuperado, 0);
}); 

PrestamoSchema.set("toJSON", { virtuals: true });
PrestamoSchema.set("toObject", { virtuals: true });

// Middleware para calcular automáticamente la fechaTerminacion
PrestamoSchema.pre("save", function (next) {
  if (this.fechaInicio && this.dias && !this.fechaTerminacion) {
    const fecha = new Date(this.fechaInicio);
    fecha.setDate(fecha.getDate() + this.dias);
    this.fechaTerminacion = fecha;
  }
  next();
});

// Evitar OverwriteModelError
export default mongoose.models.Prestamo || mongoose.model("Prestamo", PrestamoSchema);
