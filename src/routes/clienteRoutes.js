import express from "express";
import {
  crearCliente,
  listarClientes,
  editarCliente,
  eliminarCliente,
} from "../controllers/clienteController.js";
import {
  obtenerClientesPorPagoHoy, // nuevo import
} from "../controllers/prestamoController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verificarToken, crearCliente);
router.get("/", verificarToken, listarClientes);
router.put("/:id", verificarToken, editarCliente);
router.delete("/:id", verificarToken, eliminarCliente);


// NUEVO ENDPOINT: Obtener clientes según pago de hoy
router.get("/pagoHoy", verificarToken, obtenerClientesPorPagoHoy);

export default router;
