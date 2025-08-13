import Prestamo from "../models/Prestamo.js";
import PrestamoTerminado from "../models/PrestamoTerminado.js";
import Cliente from "../models/Cliente.js";
import dayjs from "dayjs";

// Función para mover préstamo a terminados y devolver el documento guardado
const moverPrestamoATerminado = async (prestamo) => {
  const prestamoTerminado = new PrestamoTerminado({
    clienteId: prestamo.clienteId,
    usuarioId: prestamo.usuarioId,
    monto: prestamo.monto,
    montoFinal: prestamo.montoFinal,
    interesMensual: prestamo.interesMensual,
    fechaInicio: prestamo.fechaInicio,
    fechaTerminacion: new Date(),
    dias: prestamo.dias,
    diasTotales: prestamo.diasTotales,
    pagoDiarioFijo: prestamo.pagoDiarioFijo,
    montoRecuperado: prestamo.montoRecuperado,
    historialPagos: prestamo.historialPagos,
    cobradoHoy: prestamo.cobradoHoy,
  });

  await prestamoTerminado.save();
  await Prestamo.deleteOne({ _id: prestamo._id });

  return prestamoTerminado;
};

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

    const montoFinal = monto + monto * interesMensualNum;
    const pagoDiarioFijo = montoFinal / dias;

    // Inicializamos historialPagos con objetos
    const historialPagos = new Array(dias).fill(null).map(() => ({
      pagado: false,
      monto: 0,
      fecha: null
    }));

    const prestamo = new Prestamo({
      clienteId,
      usuarioId: req.usuario.id,
      monto: Number(monto.toFixed(2)),
      montoFinal: Number(montoFinal.toFixed(2)),
      interesMensual: interesMensualNum,
      fechaInicio,
      dias,
      diasTotales: dias,
      pagoDiarioFijo: Number(pagoDiarioFijo.toFixed(2)),
      montoRecuperado: 0,
      cobradoHoy: false,
      historialPagos,
    });

    await prestamo.save();
    res.json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al crear préstamo", error: error.message });
  }
};

// Obtener préstamo con historial completo
export const getPrestamoConHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) {
      return res.status(404).json({ msg: "Préstamo no encontrado" });
    }
    res.json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener préstamo", error: error.message });
  }
};

// Actualizar pago diario (marcar pagado + guardar monto + fecha)
export const actualizarPagoDia = async (req, res) => {
  try {
    const { id, dia } = req.params; // día 1-based
    const { pagado, monto } = req.body;

    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) {
      return res.status(404).json({ msg: "Préstamo no encontrado" });
    }

    const diaIndex = parseInt(dia, 10) - 1;
    if (diaIndex < 0 || diaIndex >= prestamo.diasTotales) {
      return res.status(400).json({ msg: "Día inválido" });
    }

    // Inicializar historialPagos si es necesario
    if (!Array.isArray(prestamo.historialPagos) || prestamo.historialPagos.length !== prestamo.diasTotales) {
      prestamo.historialPagos = new Array(prestamo.diasTotales).fill(null).map(() => ({
        pagado: false,
        monto: 0,
        fecha: null
      }));
    }

    prestamo.historialPagos[diaIndex] = {
      pagado: !!pagado,
      monto: pagado ? Number(monto) || prestamo.pagoDiarioFijo : 0,
      fecha: pagado ? new Date() : null
    };

    // Recalcular monto recuperado
    prestamo.montoRecuperado = prestamo.historialPagos.reduce(
      (acc, pago) => acc + (pago.pagado ? pago.monto : 0),
      0
    );

    // Actualizar cobradoHoy
    const hoy = dayjs().startOf("day");
    const fechaInicio = dayjs(prestamo.fechaInicio).startOf("day");
    const diasTranscurridos = hoy.diff(fechaInicio, "day");

    if (diasTranscurridos >= 0 && diasTranscurridos < prestamo.diasTotales) {
      prestamo.cobradoHoy = prestamo.historialPagos[diasTranscurridos]?.pagado || false;
    } else {
      prestamo.cobradoHoy = false;
    }

    // Mover a terminados si ya está pagado completo
    if (prestamo.montoRecuperado >= prestamo.montoFinal) {
      const prestamoTerminado = await moverPrestamoATerminado(prestamo);
      return res.json(prestamoTerminado);
    }

    await prestamo.save();
    res.json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al actualizar pago diario", error: error.message });
  }
};

// Abonar préstamo tradicional
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

    // Inicializar historialPagos si no existe o tamaño incorrecto
    if (!Array.isArray(prestamo.historialPagos) || prestamo.historialPagos.length !== prestamo.diasTotales) {
      prestamo.historialPagos = new Array(prestamo.diasTotales).fill(null).map(() => ({
        pagado: false,
        monto: 0,
        fecha: null,
      }));
    }

    // Calcular día actual respecto a fechaInicio
    const hoy = dayjs().startOf("day");
    const fechaInicio = dayjs(prestamo.fechaInicio).startOf("day");
    const diaIndex = hoy.diff(fechaInicio, "day"); // 0-based

    if (diaIndex >= 0 && diaIndex < prestamo.diasTotales) {
      prestamo.historialPagos[diaIndex] = {
        pagado: true,
        monto: cantidad,
        fecha: new Date(),
      };
    }

    // Recalcular monto recuperado sumando historialPagos
    prestamo.montoRecuperado = prestamo.historialPagos.reduce(
      (acc, pago) => acc + (pago?.pagado ? pago.monto : 0),
      0
    );

    // Actualizar cobradoHoy igual que en actualizarPagoDia
    if (diaIndex >= 0 && diaIndex < prestamo.diasTotales) {
      prestamo.cobradoHoy = prestamo.historialPagos[diaIndex]?.pagado || false;
    } else {
      prestamo.cobradoHoy = false;
    }

    // Mover a terminados si ya está pagado completo
    if (prestamo.montoRecuperado >= prestamo.montoFinal) {
      const prestamoTerminado = await moverPrestamoATerminado(prestamo);
      return res.json(prestamoTerminado);
    }

    await prestamo.save();
    res.json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al abonar", error: error.message });
  }
};

// Editar préstamo básico
export const actualizarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, interesMensual, fechaInicio, dias, cobradoHoy } = req.body;

    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) return res.status(404).json({ msg: "Préstamo no encontrado" });

    // Validación y actualización de días
    const diasNum = Number(dias);
    if (!isNaN(diasNum) && diasNum > 0 && diasNum !== prestamo.dias) {
      prestamo.dias = diasNum;

      // Mantener historial previo si posible
      const historialPrevio = prestamo.historialPagos || [];
      prestamo.historialPagos = new Array(diasNum).fill(null).map((_, index) => {
        return historialPrevio[index] || { pagado: false, monto: 0, fecha: null };
      });
    }

    // Actualizar otros campos solo si vienen definidos
    prestamo.monto = monto !== undefined ? Number(monto) : prestamo.monto;
    prestamo.interesMensual = interesMensual !== undefined ? Number(interesMensual) : prestamo.interesMensual;
    prestamo.fechaInicio = fechaInicio !== undefined ? fechaInicio : prestamo.fechaInicio;
    prestamo.cobradoHoy = cobradoHoy !== undefined ? cobradoHoy : prestamo.cobradoHoy;

    // Recalcular montos
    prestamo.montoFinal = prestamo.monto + prestamo.monto * prestamo.interesMensual;
    prestamo.pagoDiarioFijo = prestamo.montoFinal / prestamo.dias;

    await prestamo.save();
    res.json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al editar préstamo", error: error.message });
  }
};

// Eliminar préstamo
export const eliminarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamo = await Prestamo.findOneAndDelete({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) {
      return res.status(404).json({ msg: "Préstamo no encontrado" });
    }
    res.json({ msg: "Préstamo eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ msg: "Error al eliminar préstamo", error: error.message });
  }
};

// Listar préstamos por cliente
export const listarPrestamosPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const prestamos = await Prestamo.find({ clienteId, usuarioId: req.usuario.id });
    res.json(prestamos);
  } catch (error) {
    res.status(500).json({ msg: "Error al listar préstamos", error: error.message });
  }
};

// NUEVO: Obtener clientes que pagaron hoy y que no pagaron hoy
export const obtenerClientesPorPagoHoy = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const hoy = dayjs().startOf("day"); // inicio del día actual

    // Traemos todos los clientes del usuario
    const clientes = await Cliente.find({ usuarioId });

    const clientesPagaronHoy = [];
    const clientesNoPagaronHoy = [];

    for (const cliente of clientes) {
      // Obtener todos los préstamos del cliente
      const prestamos = await Prestamo.find({ clienteId: cliente._id, usuarioId });

      // Verificar si algún préstamo tiene un pago en historialPagos hecho hoy
      const pagadoHoy = prestamos.some((prestamo) =>
        prestamo.historialPagos.some(
          (pago) => pago.pagado && dayjs(pago.fecha).isSame(hoy, "day")
        )
      );

      if (pagadoHoy) {
        clientesPagaronHoy.push(cliente);
      } else {
        clientesNoPagaronHoy.push(cliente);
      }
    }

    res.json({ clientesPagaronHoy, clientesNoPagaronHoy });
  } catch (error) {
    res.status(500).json({
      msg: "Error al obtener clientes por pago de hoy",
      error: error.message,
    });
  }
};