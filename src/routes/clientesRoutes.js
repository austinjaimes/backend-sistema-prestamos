import express from "express";
import Cliente from "../models/Cliente.js";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 📌 Crear cliente
router.post("/", verificarToken, async (req, res) => {
  try {
    const nuevoCliente = new Cliente(req.body);
    await nuevoCliente.save();
    res.status(201).json(nuevoCliente);
  } catch (error) {
    res.status(500).json({ msg: "Error al crear cliente", error });
  }
});

// 📌 Listar clientes
router.get("/", verificarToken, async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ msg: "Error al cargar clientes", error });
  }
});

export default router;
