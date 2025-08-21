import express from "express";
import { prestamosPorVencer } from "../controllers/dashboardController.js";
import { verificarToken } from "../middleware/authMiddleware.js"; // si ya tienes middleware de auth

const router = express.Router();

// Ruta para obtener préstamos que terminan hoy y esta semana
router.get("/prestamos/porVencer", verificarToken, prestamosPorVencer);

export default router;
