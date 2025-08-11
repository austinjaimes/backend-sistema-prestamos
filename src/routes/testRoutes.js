import express from "express";
import { verificarToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/protegida", verificarToken, (req, res) => {
  res.json({
    msg: "Acceso concedido a la ruta protegida",
    usuario: req.usuario
  });
});

export default router;
