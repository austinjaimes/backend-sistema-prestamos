// dashboardController.js
import Prestamo from "../models/Prestamo.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Mexico_City");

export const prestamosPorVencer = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Buscar préstamos y populamos clienteId para traer el nombre
    const prestamos = await Prestamo.find({ usuarioId }).populate("clienteId", "nombre");

    const hoy = dayjs().tz().startOf("day");
    const finSemana = hoy.add(7, "day");

    const terminanHoy = [];
    const terminanSemana = [];
    const retrasosPorCliente = {}; // { clienteId: { nombre, retrasos, montoAtrasado } }

    prestamos.forEach((p) => {
      // validar que clienteId exista
      if (!p.clienteId) return;

      // calcular fecha de terminación automáticamente
      const fechaTerminacion = dayjs(p.fechaInicio).add(p.dias, "day").startOf("day");

      // crear un objeto que incluya cliente, monto y fechaTerminacion
      const prestamoConFecha = {
        _id: p._id,
        cliente: p.clienteId,
        monto: p.monto,
        fechaTerminacion: fechaTerminacion.toISOString(),
      };

      if (fechaTerminacion.isSame(hoy, "day")) {
        terminanHoy.push(prestamoConFecha);
      } else if (fechaTerminacion.isAfter(hoy) && fechaTerminacion.isBefore(finSemana.add(1, "day"))) {
        terminanSemana.push(prestamoConFecha);
      }

      // calcular retrasos solo hasta el día actual
      const diasTranscurridos = Math.min(
        hoy.diff(dayjs(p.fechaInicio).tz().startOf("day"), "day"),
        p.diasTotales
      );

      const retrasos = p.historialPagos
        .slice(0, diasTranscurridos) // solo considerar días que ya pasaron
        .filter(h => !h.pagado).length;

      if (retrasos > 0) {
        const clienteIdStr = p.clienteId._id.toString();
        if (!retrasosPorCliente[clienteIdStr]) {
          retrasosPorCliente[clienteIdStr] = {
            nombre: p.clienteId.nombre,
            retrasos: 0,
            montoAtrasado: 0,
          };
        }
        retrasosPorCliente[clienteIdStr].retrasos += retrasos;
        retrasosPorCliente[clienteIdStr].montoAtrasado += retrasos * p.pagoDiarioFijo;
      }
    });

    res.json({
      terminanHoy,
      terminanSemana,
      clientesRetrasados: Object.values(retrasosPorCliente).sort((a, b) => b.retrasos - a.retrasos),
    });
  } catch (error) {
    res.status(500).json({
      msg: "Error al obtener préstamos por vencer",
      error: error.message,
    });
  }
};
