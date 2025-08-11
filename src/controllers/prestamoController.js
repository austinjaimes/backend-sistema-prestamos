import Prestamo from "../models/Prestamo.js";
import Cliente from "../models/Cliente.js";
import dayjs from "dayjs";

// Crear préstamo
export const crearPrestamo = async (req, res) => {
  try {
    const { clienteId, monto, interesMensual, fechaInicio, dias } = req.body;

    const cliente = await Cliente.findOne({ _id: clienteId, usuarioId: req.usuario.id });
    if (!cliente) {
      return res.status(404).json({ msg: "Cliente no encontrado" });
    }

    const interesMensualNum = Number(interesMensual);
    if (isNaN(interesMensualNum)) {
      return res.status(400).json({ msg: "Debe proporcionar el interés mensual como número válido" });
    }

    if (!monto || monto <= 0) return res.status(400).json({ msg: "Monto inválido" });
    if (!fechaInicio) return res.status(400).json({ msg: "Fecha de inicio requerida" });
    if (!dias || dias <= 0) return res.status(400).json({ msg: "Días inválidos" });

    const prestamo = new Prestamo({
      clienteId,
      usuarioId: req.usuario.id,
      monto,
      interesMensual: interesMensualNum,
      fechaInicio,
      dias,
      montoRecuperado: 0
    });

    await prestamo.save();
    res.json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al crear préstamo", error: error.message });
  }
};

// Listar cobros de hoy
export const listarCobrosHoy = async (req, res) => {
  try {
    const hoy = dayjs().startOf("day");
    const prestamos = await Prestamo.find({ usuarioId: req.usuario.id }).populate("clienteId");

    const cobros = prestamos
      .map((p) => {
        const diaActual = hoy.diff(dayjs(p.fechaInicio), "day") + 1;
        if (diaActual > 0 && diaActual <= p.dias) {
          const interesDiario = (Number(p.interesMensual) || 0) / 30;
          const pagoDiario = p.monto / p.dias + (p.monto * interesDiario);
          return {
            cliente: p.clienteId.nombre,
            diaActual,
            pagoDiario: Number(pagoDiario.toFixed(2)),
            dineroRestante: Number((p.monto - p.montoRecuperado).toFixed(2)),
            dineroRecuperado: Number(p.montoRecuperado.toFixed(2))
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json(cobros);
  } catch (error) {
    res.status(500).json({ msg: "Error al listar cobros de hoy", error });
  }
};

// Historial de cobros por cliente
export const historialCobrosCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const prestamos = await Prestamo.find({ clienteId, usuarioId: req.usuario.id });

    const historial = prestamos.map((p) => {
      const interesDiario = (Number(p.interesMensual) || 0) / 30;
      const pagoDiario = p.monto / p.dias + (p.monto * interesDiario);

      const cobros = [];
      for (let dia = 1; dia <= p.dias; dia++) {
        cobros.push({
          dia,
          monto: Number(pagoDiario.toFixed(2))
        });
      }

      return {
        prestamoId: p._id,
        fechaInicio: p.fechaInicio,
        dias: p.dias,
        cobros,
        dineroRecuperado: p.montoRecuperado,
        dineroRestante: Number((p.monto - p.montoRecuperado).toFixed(2))
      };
    });

    res.json(historial);
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener historial", error });
  }
};

// Obtener préstamos por cliente
export async function getPrestamosByCliente(req, res) {
  const { clienteId } = req.params;
  try {
    const prestamos = await Prestamo.find({ clienteId, usuarioId: req.usuario.id });

    const prestamosConDatos = prestamos.map((p) => {
      const fechaInicio = dayjs(p.fechaInicio);
      const hoy = dayjs();
      const diasTranscurridos = hoy.diff(fechaInicio, "day");

      const interesDiario = (p.interesMensual || 0) / 30;
      const pagoDiario = p.monto / p.dias + (p.monto * interesDiario);

      return {
        ...p.toObject(),
        cobroHoy:
          diasTranscurridos >= 0 && diasTranscurridos < p.dias
            ? Number(pagoDiario.toFixed(2))
            : 0,
        dineroRecuperado: p.montoRecuperado,
        dineroRestante: Number((p.monto - p.montoRecuperado).toFixed(2))
      };
    });

    res.json(prestamosConDatos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Actualizar préstamo
export const actualizarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) {
      return res.status(404).json({ msg: "Préstamo no encontrado" });
    }

    Object.assign(prestamo, req.body);
    await prestamo.save();

    res.json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar préstamo", error: error.message });
  }
};

// Eliminar préstamo
export const eliminarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamo = await Prestamo.findOneAndDelete({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) return res.status(404).json({ msg: "Préstamo no encontrado" });

    res.json({ msg: "Préstamo eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ msg: "Error al eliminar préstamo", error });
  }
};

// Nuevo: Abonar a préstamo
export const abonarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ msg: "Cantidad inválida" });
    }

    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) {
      return res.status(404).json({ msg: "Préstamo no encontrado" });
    }

    prestamo.montoRecuperado += cantidad;
    if (prestamo.montoRecuperado > prestamo.monto) {
      prestamo.montoRecuperado = prestamo.monto; // no pasar del total
    }

    await prestamo.save();

    res.json({
      msg: "Abono registrado",
      prestamo
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al abonar", error: error.message });
  }
};
