import User from "../models/User.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET no está definido en las variables de entorno");
}

export const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const existeUsuario = await User.findOne({ email });
    if (existeUsuario) {
      return res.status(400).json({ msg: "El usuario ya existe" });
    }

    const nuevoUsuario = new User({ nombre, email, password });
    await nuevoUsuario.save();

    // Generar token directamente al registrarse
    const token = jwt.sign(
      { id: nuevoUsuario._id, email: nuevoUsuario.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      msg: "Usuario registrado con éxito",
      token
    });
  } catch (error) {
    res.status(500).json({ msg: "Error en el servidor", error });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const esPasswordCorrecta = await usuario.comparePassword(password);
    if (!esPasswordCorrecta) {
      return res.status(400).json({ msg: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: usuario._id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ msg: "Error en el servidor", error });
  }
};
