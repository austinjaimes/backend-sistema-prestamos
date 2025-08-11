import express from "express";
import {
  crearCliente,
  listarClientes,
  editarCliente,
  eliminarCliente
} from "../controllers/clienteController.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verificarToken, crearCliente);
router.get("/", verificarToken, listarClientes);
router.put("/:id", verificarToken, editarCliente);
router.delete("/:id", verificarToken, eliminarCliente);

export default router;
