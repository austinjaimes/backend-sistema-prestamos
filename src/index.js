import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import clienteRoutes from "./routes/clienteRoutes.js";
import prestamoRoutes from "./routes/prestamoRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/prestamos", prestamoRoutes);
app.use("/api/test", testRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error conexión DB:", err));

app.get("/", (req, res) => {
  res.send("Servidor funcionando 🚀 con MongoDB");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`); // <- corregido con backticks
});
