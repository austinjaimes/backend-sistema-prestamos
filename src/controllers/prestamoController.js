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

    // Calcular interés diario y pago diario fijo
    const interesDiario = interesMensualNum / 30;
    const pagoDiarioFijo = monto / dias + (monto * interesDiario);

    const prestamo = new Prestamo({
      clienteId,
      usuarioId: req.usuario.id,
      monto,
      interesMensual: interesMensualNum,
      fechaInicio,
      dias,
      diasTotales: dias,
      pagoDiarioFijo: Number(pagoDiarioFijo.toFixed(2)),
      montoRecuperado: 0,
      cobradoHoy: false,
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
        if (diaActual > 0 && diaActual <= p.diasTotales) {
          return {
            cliente: p.clienteId.nombre,
            diaActual,
            pagoDiario: p.pagoDiarioFijo, // pago diario fijo
            dineroRestante: Number((p.monto - p.montoRecuperado).toFixed(2)),
            dineroRecuperado: Number(p.montoRecuperado.toFixed(2)),
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
      const cobros = [];
      for (let dia = 1; dia <= p.diasTotales; dia++) {
        cobros.push({
          dia,
          monto: p.pagoDiarioFijo,
        });
      }

      return {
        prestamoId: p._id,
        fechaInicio: p.fechaInicio,
        dias: p.diasTotales,
        cobros,
        dineroRecuperado: p.montoRecuperado,
        dineroRestante: Number((p.monto - p.montoRecuperado).toFixed(2)),
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

      return {
        ...p.toObject(),
        cobroHoy:
          diasTranscurridos >= 0 && diasTranscurridos < p.diasTotales
            ? p.pagoDiarioFijo
            : 0,
        dineroRecuperado: p.montoRecuperado,
        dineroRestante: Number((p.monto - p.montoRecuperado).toFixed(2)),
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

    const { monto, interesMensual, fechaInicio, dias, cobradoHoy } = req.body;

    if (monto !== undefined) prestamo.monto = monto;
    if (interesMensual !== undefined) prestamo.interesMensual = interesMensual;
    if (fechaInicio !== undefined) prestamo.fechaInicio = fechaInicio;
    if (dias !== undefined) {
      prestamo.dias = dias;
      prestamo.diasTotales = dias;
      // NO recalcular pagoDiarioFijo para que permanezca el original
    }
    if (cobradoHoy !== undefined) prestamo.cobradoHoy = cobradoHoy;

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

// Abonar a préstamo
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
      prestamo.montoRecuperado = prestamo.monto;
    }

    await prestamo.save();

    const prestamoActualizado = await Prestamo.findById(id);
    res.json(prestamoActualizado);
  } catch (error) {
    res.status(500).json({ msg: "Error al abonar", error: error.message });
  }
};
