import mongoose from "mongoose";

const PrestamoTerminadoSchema = new mongoose.Schema({
  clienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Cliente", required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  monto: { type: Number, required: true },
  montoFinal: { type: Number, required: true },

  interesMensual: { type: Number, required: true },
  fechaInicio: { type: Date, required: true },
  fechaTerminacion: { type: Date, required: true },  // fecha en que se terminó de pagar

  dias: { type: Number, required: true },
  diasTotales: { type: Number, required: true },

  pagoDiarioFijo: { type: Number, required: true },

  cobradoHoy: { type: Boolean, default: false },
  montoRecuperado: { type: Number, default: 0 },

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

// Virtual para calcular dinero restante basado en montoFinal (por si acaso)
PrestamoTerminadoSchema.virtual("dineroRestante").get(function () {
  return Math.max(this.montoFinal - this.montoRecuperado, 0);
});

PrestamoTerminadoSchema.set("toJSON", { virtuals: true });
PrestamoTerminadoSchema.set("toObject", { virtuals: true });

// Evitar OverwriteModelError:
export default mongoose.models.PrestamoTerminado || mongoose.model("PrestamoTerminado", PrestamoTerminadoSchema);
