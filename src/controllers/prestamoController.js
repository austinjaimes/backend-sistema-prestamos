import Prestamo from "../models/Prestamo.js";
import Cliente from "../models/Cliente.js";
import dayjs from "dayjs";

export const crearPrestamo = async (req, res) => {
  try {
    const { clienteId, monto, interesMensual, fechaInicio, dias } = req.body;

    // Verificar que el cliente exista y pertenezca al usuario
    const cliente = await Cliente.findOne({ _id: clienteId, usuarioId: req.usuario.id });
    if (!cliente) {
      return res.status(404).json({ msg: "Cliente no encontrado" });
    }

    // Convertir el interés mensual a número
    const interesMensualNum = Number(interesMensual);

    // Validar que interesMensual es un número válido
    if (isNaN(interesMensualNum)) {
      return res.status(400).json({ msg: "Debe proporcionar el interés mensual como número válido" });
    }

    // Validar monto, fechaInicio y días si quieres, por ejemplo:
    if (!monto || monto <= 0) {
      return res.status(400).json({ msg: "Debe proporcionar un monto válido" });
    }
    if (!fechaInicio) {
      return res.status(400).json({ msg: "Debe proporcionar la fecha de inicio" });
    }
    if (!dias || dias <= 0) {
      return res.status(400).json({ msg: "Debe proporcionar un número de días válido" });
    }

    // Crear el préstamo
    const prestamo = new Prestamo({
      clienteId,
      usuarioId: req.usuario.id,
      monto,
      interesMensual: interesMensualNum,
      fechaInicio,
      dias,
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
          // Interés diario = interesMensual / 30
          const interesDiarioReal = (Number(p.interesMensual) || 0) / 30;
          return {
            cliente: p.clienteId.nombre,
            diaActual,
            totalCobrarHoy: Math.round(p.monto * interesDiarioReal * 100) / 100,
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
      const interesDiarioReal = (Number(p.interesMensual) || 0) / 30;
      for (let dia = 1; dia <= p.dias; dia++) {
        cobros.push({
          dia,
          monto: Math.round(p.monto * interesDiarioReal * 100) / 100,
        });
      }
      return {
        prestamoId: p._id,
        fechaInicio: p.fechaInicio,
        dias: p.dias,
        cobros,
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
    const prestamos = await Prestamo.find({ clienteId });

    const prestamosConCobro = prestamos.map((p) => {
      const fechaInicio = dayjs(p.fechaInicio);
      const hoy = dayjs();
      const diasTranscurridos = hoy.diff(fechaInicio, "day");

      return {
        ...p.toObject(),
        cobroHoy:
          diasTranscurridos >= 0 && diasTranscurridos < p.dias
            ? Math.round((p.monto / p.dias) * 100) / 100
            : 0,
        interesMensual: p.interesMensual, // directo sin cambio
      };
    });

    res.json(prestamosConCobro);
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
