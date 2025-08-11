import Cliente from "../models/Cliente.js";

export const crearCliente = async (req, res) => {
  try {
    const cliente = new Cliente({ ...req.body, usuarioId: req.usuario.id });
    await cliente.save();
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ msg: "Error al crear cliente", error });
  }
};

export const listarClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find({ usuarioId: req.usuario.id });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ msg: "Error al listar clientes", error });
  }
};

export const editarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOneAndUpdate(
      { _id: req.params.id, usuarioId: req.usuario.id },
      req.body,
      { new: true }
    );
    if (!cliente) return res.status(404).json({ msg: "Cliente no encontrado" });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ msg: "Error al editar cliente", error });
  }
};

export const eliminarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOneAndDelete({ _id: req.params.id, usuarioId: req.usuario.id });
    if (!cliente) return res.status(404).json({ msg: "Cliente no encontrado" });
    res.json({ msg: "Cliente eliminado" });
  } catch (error) {
    res.status(500).json({ msg: "Error al eliminar cliente", error });
  }
};
