import express from "express";
import {
  crearPrestamo,
  listarPrestamosPorCliente,
  getPrestamoConHistorial,
  actualizarPagoDia,
  actualizarPrestamo,
  eliminarPrestamo,
  abonarPrestamo
} from "../controllers/prestamoController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Crear préstamo
router.post("/", verificarToken, crearPrestamo);

// Listar préstamos por cliente
router.get("/cliente/:clienteId", verificarToken, listarPrestamosPorCliente);

// Obtener préstamo con historial completo
router.get("/:id", verificarToken, getPrestamoConHistorial);

// Actualizar pago diario en historial (marcar pago de un día específico)
router.put("/:id/pago/:dia", verificarToken, actualizarPagoDia);

// Actualizar préstamo (editar datos básicos)
router.put("/:id", verificarToken, actualizarPrestamo);

// Eliminar préstamo
router.delete("/:id", verificarToken, eliminarPrestamo);

// Registrar un abono
router.post("/:id/abonar", verificarToken, abonarPrestamo);


export default router;
