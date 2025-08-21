import Prestamo from "../models/Prestamo.js";
import PrestamoTerminado from "../models/PrestamoTerminado.js";
import Cliente from "../models/Cliente.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

// Función para mover préstamo a terminados
const moverPrestamoATerminado = async (prestamo) => {
  const prestamoTerminado = new PrestamoTerminado({
    clienteId: prestamo.clienteId,
    usuarioId: prestamo.usuarioId,
    monto: prestamo.monto,
    montoFinal: prestamo.montoFinal,
    interesMensual: prestamo.interesMensual,
    fechaInicio: prestamo.fechaInicio,
    fechaTerminacion: dayjs().tz().toDate(),
    dias: prestamo.diasTotales, // mantener estático
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
    if (!cliente) return res.status(404).json({ msg: "Cliente no encontrado" });

    let interesMensualNum = Number(interesMensual);
    if (isNaN(interesMensualNum)) return res.status(400).json({ msg: "Interés mensual inválido" });
    interesMensualNum = interesMensualNum / 100; // Convertir porcentaje a decimal

    if (!monto || monto <= 0) return res.status(400).json({ msg: "Monto inválido" });
    if (!fechaInicio) return res.status(400).json({ msg: "Fecha de inicio requerida" });
    if (!dias || dias <= 0) return res.status(400).json({ msg: "Días inválidos" });

    const montoFinal = monto + monto * interesMensualNum;
    const pagoDiarioFijo = montoFinal / dias;

    const fechaInicioLocal = dayjs.tz(fechaInicio).startOf("day").toDate();
    const fechaTerminacion = dayjs(fechaInicioLocal).add(dias, "day").toDate(); // <-- Calculamos automáticamente

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
      fechaInicio: fechaInicioLocal,
      fechaTerminacion, // <-- Asignamos la fecha de terminación
      dias,
      diasTotales: dias,
      pagoDiarioFijo: Number(pagoDiarioFijo.toFixed(2)),
      montoRecuperado: 0,
      cobradoHoy: false,
      historialPagos,
    });

    await prestamo.save();
    res.status(201).json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al crear préstamo", error: error.message });
  }
};


// Obtener préstamo con historial completo
export const getPrestamoConHistorial = async (req, res) => {
  try {
    const { id } = req.params;
    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) return res.status(404).json({ msg: "Préstamo no encontrado" });
    res.json(prestamo);
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener préstamo", error: error.message });
  }
};

// Actualizar pago diario
export const actualizarPagoDia = async (req, res) => {
  try {
    const { id, dia } = req.params;
    const { pagado, monto } = req.body;

    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) return res.status(404).json({ msg: "Préstamo no encontrado" });

    const diaIndex = parseInt(dia, 10) - 1;
    if (diaIndex < 0 || diaIndex >= prestamo.diasTotales) return res.status(400).json({ msg: "Día inválido" });

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
      fecha: pagado ? dayjs().tz().toDate() : null
    };

    prestamo.montoRecuperado = prestamo.historialPagos.reduce(
      (acc, pago) => acc + (pago.pagado ? pago.monto : 0),
      0
    );

    const hoy = dayjs().tz().startOf("day");
    const fechaInicio = dayjs(prestamo.fechaInicio).tz().startOf("day");
    const diasTranscurridos = hoy.diff(fechaInicio, "day");

    prestamo.cobradoHoy = (diasTranscurridos >= 0 && diasTranscurridos < prestamo.diasTotales)
      ? prestamo.historialPagos[diasTranscurridos]?.pagado || false
      : false;

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

// Abonar préstamo
export const abonarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;

    if (!cantidad || cantidad <= 0) return res.status(400).json({ msg: "Cantidad inválida" });

    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) return res.status(404).json({ msg: "Préstamo no encontrado" });

    if (!Array.isArray(prestamo.historialPagos) || prestamo.historialPagos.length !== prestamo.diasTotales) {
      prestamo.historialPagos = new Array(prestamo.diasTotales).fill(null).map(() => ({
        pagado: false,
        monto: 0,
        fecha: null,
      }));
    }

    const hoy = dayjs().tz().startOf("day");
    const fechaInicio = dayjs(prestamo.fechaInicio).tz().startOf("day");
    const diaIndex = hoy.diff(fechaInicio, "day");

    if (diaIndex >= 0 && diaIndex < prestamo.diasTotales) {
      prestamo.historialPagos[diaIndex] = {
        pagado: true,
        monto: cantidad,
        fecha: dayjs().tz().toDate(),
      };
    }

    prestamo.montoRecuperado = prestamo.historialPagos.reduce(
      (acc, pago) => acc + (pago?.pagado ? pago.monto : 0),
      0
    );

    prestamo.cobradoHoy = (diaIndex >= 0 && diaIndex < prestamo.diasTotales)
      ? prestamo.historialPagos[diaIndex]?.pagado || false
      : false;

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

// Editar préstamo
// Editar préstamo
export const actualizarPrestamo = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, interesMensual, fechaInicio, dias, cobradoHoy } = req.body;

    const prestamo = await Prestamo.findOne({ _id: id, usuarioId: req.usuario.id });
    if (!prestamo) return res.status(404).json({ msg: "Préstamo no encontrado" });

    // Actualizar días
    if (dias !== undefined && !isNaN(dias) && dias > 0) {
      prestamo.diasTotales = Number(dias);
      const historialPrevio = prestamo.historialPagos || [];
      prestamo.historialPagos = new Array(prestamo.diasTotales).fill(null).map((_, index) => {
        return historialPrevio[index] || { pagado: false, monto: 0, fecha: null };
      });
    }

    prestamo.monto = monto !== undefined ? Number(monto) : prestamo.monto;

    if (interesMensual !== undefined) {
      let interesNum = Number(interesMensual);
      if (isNaN(interesNum)) return res.status(400).json({ msg: "Interés mensual inválido" });
      prestamo.interesMensual = interesNum / 100; // <-- Convertir a decimal
    }

    prestamo.fechaInicio = fechaInicio !== undefined
      ? dayjs.tz(fechaInicio).startOf("day").toDate()
      : prestamo.fechaInicio;

    prestamo.cobradoHoy = cobradoHoy !== undefined ? cobradoHoy : prestamo.cobradoHoy;

    prestamo.montoFinal = prestamo.monto + prestamo.monto * prestamo.interesMensual;
    prestamo.pagoDiarioFijo = prestamo.montoFinal / prestamo.diasTotales;

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
    if (!prestamo) return res.status(404).json({ msg: "Préstamo no encontrado" });
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

// Clientes que pagaron hoy y que no pagaron
export const obtenerClientesPorPagoHoy = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const hoy = dayjs().tz().startOf("day");

    const clientes = await Cliente.find({ usuarioId });
    const clientesPagaronHoy = [];
    const clientesNoPagaronHoy = [];

    for (const cliente of clientes) {
      const prestamos = await Prestamo.find({ clienteId: cliente._id, usuarioId });

      const pagadoHoy = prestamos.some((prestamo) =>
        prestamo.historialPagos.some(
          (pago) => pago.pagado && dayjs(pago.fecha).tz().isSame(hoy, "day")
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
    res.status(500).json({ msg: "Error al obtener clientes por pago de hoy", error: error.message });
  }
};
