import express from "express";
import {
  crearPrestamo,
  listarCobrosHoy,
  historialCobrosCliente,
  getPrestamosByCliente,
  actualizarPrestamo,
  eliminarPrestamo, // <-- importa el controlador eliminarPrestamo
} from "../controllers/prestamoController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verificarToken, crearPrestamo);
router.get("/cobros-hoy", verificarToken, listarCobrosHoy);
router.get("/historial/:clienteId", verificarToken, historialCobrosCliente);
router.get("/cliente/:clienteId", verificarToken, getPrestamosByCliente);
router.put("/:id", verificarToken, actualizarPrestamo);
router.delete("/:id", verificarToken, eliminarPrestamo); // <-- ¡agrega esta línea!

export default router;
