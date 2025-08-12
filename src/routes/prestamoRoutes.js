import express from "express";
import {
  crearPrestamo,
  listarCobrosHoy,
  historialCobrosCliente,
  getPrestamosByCliente,
  actualizarPrestamo,
  eliminarPrestamo,
  abonarPrestamo,
} from "../controllers/prestamoController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verificarToken, crearPrestamo);
router.get("/cobros-hoy", verificarToken, listarCobrosHoy);
router.get("/historial/:clienteId", verificarToken, historialCobrosCliente);
router.get("/cliente/:clienteId", verificarToken, getPrestamosByCliente);
router.put("/:id", verificarToken, actualizarPrestamo);
router.delete("/:id", verificarToken, eliminarPrestamo);

// Nuevo endpoint para registrar un abono
router.post("/:id/abonar", verificarToken, abonarPrestamo);

export default router;
