const mercadopago = require("mercadopago");

// Configura tu token de prueba
mercadopago.configure({
  access_token: "TEST-7397708178059176-061015-3300d399e706b2ed0486e4edf631755a-1116201086"
});

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;
const crypto = require("crypto");
// Archivos
const USERS_FILE = path.join(__dirname, 'usuarios.json');
const PRODUCTOS_FILE = path.join(__dirname, 'productos.json');

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(session({
  secret: 'secreto',
  resave: true,
  saveUninitialized: true
}));

// ====================== AUTENTICACIÓN ======================

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ success: false, message: 'Campos incompletos.' });

  const usuarios = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE))
    : [];

  if (usuarios.find(u => u.username === username))
    return res.json({ success: false, message: 'El usuario ya existe.' });

  usuarios.push({ username, password, rol: 'user' });
  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
  res.json({ success: true, message: 'Usuario registrado con éxito.' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const usuarios = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE))
    : [];

  const usuario = usuarios.find(u => u.username === username && u.password === password);
  if (usuario) {
    req.session.loggedin = true;
    req.session.username = username;
    return res.json({ success: true, rol: usuario.rol });
  } else {
    return res.json({ success: false, message: "Usuario o contraseña incorrectos." });
  }
});

app.get('/usuario-actual', (req, res) => {
  if (req.session.loggedin && req.session.username) {
    const usuarios = fs.existsSync(USERS_FILE)
      ? JSON.parse(fs.readFileSync(USERS_FILE))
      : [];
    const usuario = usuarios.find(u => u.username === req.session.username);
    if (usuario) return res.json({ loggedin: true, username: usuario.username, rol: usuario.rol });
  }
  res.json({ loggedin: false });
});

// ====================== USUARIOS ======================

app.get('/usuarios', (req, res) => {
  if (!req.session.loggedin) return res.status(401).send('Acceso denegado');
  const usuarios = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  res.json(usuarios);
});

app.delete('/usuarios/:username', (req, res) => {
  const username = req.params.username;
  let usuarios = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  const nuevoListado = usuarios.filter(u => u.username !== username);
  if (usuarios.length === nuevoListado.length)
    return res.json({ success: false, message: 'Usuario no encontrado.' });

  fs.writeFileSync(USERS_FILE, JSON.stringify(nuevoListado, null, 2));
  res.json({ success: true, message: 'Usuario eliminado correctamente.' });
});

app.put('/usuarios/:username', (req, res) => {
  const { username } = req.params;
  const { password } = req.body;
  if (!password)
    return res.json({ success: false, message: 'Contraseña requerida.' });

  let usuarios = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  const index = usuarios.findIndex(u => u.username === username);
  if (index === -1)
    return res.json({ success: false, message: 'Usuario no encontrado.' });

  usuarios[index].password = password;
  fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
  res.json({ success: true, message: 'Contraseña actualizada.' });
});

// ====================== PRODUCTOS ======================

app.get('/productos', (req, res) => {
  const productos = fs.existsSync(PRODUCTOS_FILE)
    ? JSON.parse(fs.readFileSync(PRODUCTOS_FILE, 'utf-8'))
    : [];
  res.json(productos);
});

app.get('/productos-listado', (req, res) => {
  const productos = fs.existsSync(PRODUCTOS_FILE)
    ? JSON.parse(fs.readFileSync(PRODUCTOS_FILE, 'utf-8'))
    : [];
  res.json(productos);
});

app.post('/productos', (req, res) => {
  if (!req.session.loggedin)
    return res.status(401).json({ success: false, message: "No has iniciado sesión." });

  const usuarios = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE))
    : [];
  const usuario = usuarios.find(u => u.username === req.session.username);

  if (!usuario || usuario.rol !== 'admin')
    return res.status(403).json({ success: false, message: "Solo los administradores pueden agregar productos." });

  const { nombre, descripcion, precio, imagen, categoria } = req.body;
  if (!nombre || !descripcion || !precio)
    return res.json({ success: false, message: "Faltan datos obligatorios." });

  const productos = fs.existsSync(PRODUCTOS_FILE)
    ? JSON.parse(fs.readFileSync(PRODUCTOS_FILE))
    : [];

  const nuevoProducto = {
    id: crypto.randomUUID(),  // 💥 ID único
    nombre,
    descripcion,
    precio,
    imagen,
    categoria
  };

  productos.push(nuevoProducto);

  fs.writeFileSync(PRODUCTOS_FILE, JSON.stringify(productos, null, 2));
  res.json({ success: true, message: "Producto agregado correctamente.", producto: nuevoProducto });
});


app.put('/productos/:index', (req, res) => {
  const index = parseInt(req.params.index);
  const { nombre, descripcion, precio, imagen, categoria } = req.body;

  if (!nombre || !descripcion || !precio)
    return res.status(400).json({ success: false, message: "Datos incompletos." });

  let productos = fs.existsSync(PRODUCTOS_FILE)
    ? JSON.parse(fs.readFileSync(PRODUCTOS_FILE, "utf-8"))
    : [];

  if (index < 0 || index >= productos.length)
    return res.status(404).json({ success: false, message: "Producto no encontrado." });

  productos[index] = { nombre, descripcion, precio, imagen, categoria };
fs.writeFileSync(PRODUCTOS_FILE, JSON.stringify(productos, null, 2));


  try {
    console.log("Guardando en:", PRODUCTOS_FILE);
    console.log("Nuevo producto:", productos[index]);

    fs.writeFileSync(PRODUCTOS_FILE, JSON.stringify(productos, null, 2));
    console.log("✅ Producto actualizado:", productos[index]);
    res.json({ success: true, message: "Producto actualizado correctamente." });
  } catch (err) {
    console.error("❌ Error al escribir productos.json:", err);
    res.status(500).json({ success: false, message: "Error al guardar el producto." });
  }
});

app.delete('/productos/:index', (req, res) => {
  const index = parseInt(req.params.index);
  let productos = fs.existsSync(PRODUCTOS_FILE)
    ? JSON.parse(fs.readFileSync(PRODUCTOS_FILE, 'utf-8'))
    : [];

  if (index < 0 || index >= productos.length)
    return res.status(404).json({ success: false, message: "Producto no encontrado." });

  productos.splice(index, 1);
  fs.writeFileSync(PRODUCTOS_FILE, JSON.stringify(productos, null, 2));
  res.json({ success: true, message: "Producto eliminado correctamente." });
});

// ====================== PÁGINA LOGIN ======================

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// ====================== INICIAR SERVIDOR ======================

app.listen(PORT, () => {
  console.log(`✅ Servidor iniciado en http://localhost:${PORT}`);
});

const CONTACTOS_FILE = path.join(__dirname, 'mensajes.json');

app.post('/contacto', (req, res) => {
  const { nombre, email, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
  }

  let mensajes = [];
  if (fs.existsSync(CONTACTOS_FILE)) {
    mensajes = JSON.parse(fs.readFileSync(CONTACTOS_FILE));
  }

  mensajes.push({ nombre, email, mensaje, fecha: new Date().toISOString() });

  fs.writeFileSync(CONTACTOS_FILE, JSON.stringify(mensajes, null, 2));

  res.json({ success: true, message: 'Mensaje enviado correctamente.' });
});

const MENSAJES_FILE = path.join(__dirname, 'mensajes.json');

app.get('/mensajes', (req, res) => {
  if (!req.session.loggedin) {
    return res.status(401).json({ error: 'Acceso denegado' });
  }

  const mensajes = fs.existsSync(MENSAJES_FILE)
    ? JSON.parse(fs.readFileSync(MENSAJES_FILE))
    : [];

  res.json(mensajes);
});

app.post("/crear-preferencia", async (req, res) => {
  const { carrito } = req.body;

  if (!Array.isArray(carrito) || carrito.length === 0) {
    return res.status(400).json({ error: "Carrito vacío o inválido" });
  }

  const items = carrito.map(item => ({
    title: item.nombre,
    unit_price: parseFloat(item.precio),
    quantity: 1
  }));

  const preference = {
    items,
    back_urls: {
      success: "http://localhost:3000/gracias.html",
      failure: "http://localhost:3000/error.html",
      pending: "http://localhost:3000/pending.html"
    },
    auto_return: "approved"
  };

  try {
    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (error) {
    console.error("❌ Error al crear preferencia:", error);
    res.status(500).json({ error: "Error al crear preferencia" });
  }
});

const OPINIONES_FILE = path.join(__dirname, 'opiniones.json');

app.post('/opiniones', (req, res) => {
  const { nombre, opinion } = req.body;

  if (!nombre || !mensaje) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }

  const opiniones = fs.existsSync(OPINIONES_FILE)
    ? JSON.parse(fs.readFileSync(OPINIONES_FILE))
    : [];

  opiniones.push({ nombre, opinion, fecha: new Date().toISOString() });
  fs.writeFileSync(OPINIONES_FILE, JSON.stringify(opiniones, null, 2));

  res.json({ success: true, message: 'Opinión guardada' });
});

app.get('/opiniones', (req, res) => {
  const opiniones = fs.existsSync(OPINIONES_FILE)
    ? JSON.parse(fs.readFileSync(OPINIONES_FILE))
    : [];

  res.json(opiniones);
});

const PEDIDOS_FILE = path.join(__dirname, 'pedidos.json');

app.get('/pedidos', (req, res) => {
  if (!req.session.loggedin) {
    return res.status(401).json({ success: false, message: "No has iniciado sesión." });
  }

  const usuarios = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE))
    : [];

  const user = usuarios.find(u => u.username === req.session.username);
  if (!user || user.rol !== "admin") {
    return res.status(403).json({ success: false, message: "Solo administradores pueden ver los pedidos." });
  }

  const pedidos = fs.existsSync(PEDIDOS_FILE)
    ? JSON.parse(fs.readFileSync(PEDIDOS_FILE))
    : [];

  res.json(pedidos);
});

app.post('/guardar-pedido', (req, res) => {
  const { usuario, items, total } = req.body;

  if (!usuario || !items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: "Datos incompletos." });
  }

  const parsedTotal = parseFloat(total);
  if (isNaN(parsedTotal)) {
    return res.status(400).json({ success: false, message: "Total inválido." });
  }

  const pedidos = fs.existsSync(PEDIDOS_FILE)
    ? JSON.parse(fs.readFileSync(PEDIDOS_FILE))
    : [];

  pedidos.push({
    usuario,
    items,
    total: parsedTotal,
    fecha: new Date().toISOString()
  });

  fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(pedidos, null, 2));
  res.json({ success: true, message: "Pedido guardado con éxito." });
});

app.post('/confirmar-pedido', (req, res) => {
  if (!req.session.loggedin) {
    return res.status(401).json({ success: false, message: "No has iniciado sesión." });
  }

  const { items, total } = req.body;

  if (!Array.isArray(items) || typeof total !== "number") {
    return res.status(400).json({ success: false, message: "Datos inválidos." });
  }

  const pedidos = fs.existsSync(PEDIDOS_FILE)
    ? JSON.parse(fs.readFileSync(PEDIDOS_FILE))
    : [];

  pedidos.push({
    usuario: req.session.username,
    items,
    total,
    fecha: new Date().toISOString(),
    estado: "Pendiente"
  });

  fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(pedidos, null, 2));
  res.json({ success: true });
});

app.get('/pedidos', (req, res) => {
  if (!req.session.loggedin) {
    return res.status(401).json({ success: false, message: "No has iniciado sesión." });
  }

  const usuarios = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE))
    : [];

  const user = usuarios.find(u => u.username === req.session.username);
  if (!user || user.rol !== "admin") {
    return res.status(403).json({ success: false, message: "Solo administradores pueden ver los pedidos." });
  }

  const pedidos = fs.existsSync(PEDIDOS_FILE)
    ? JSON.parse(fs.readFileSync(PEDIDOS_FILE))
    : [];

  res.json(pedidos);
});


app.get("/estadisticas", (req, res) => {
  const usuarios = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
  const productos = fs.existsSync(PRODUCTOS_FILE) ? JSON.parse(fs.readFileSync(PRODUCTOS_FILE)) : [];
  const pedidos = fs.existsSync(PEDIDOS_FILE) ? JSON.parse(fs.readFileSync(PEDIDOS_FILE)) : [];

  // Agrupar ventas por usuario
  const ventasPorUsuario = {};
  let totalVentas = 0;

  pedidos.forEach(pedido => {
    const usuario = pedido.usuario || "Desconocido";
    const total = parseFloat(pedido.total) || 0;

    if (!ventasPorUsuario[usuario]) ventasPorUsuario[usuario] = 0;
    ventasPorUsuario[usuario] += total;
    totalVentas += total;
  });

  const ventasFormateadas = Object.entries(ventasPorUsuario).map(([usuario, total]) => ({
    usuario,
    total
  }));

  res.json({
    totalUsuarios: usuarios.length,
    totalProductos: productos.length,
    totalPedidos: pedidos.length,
    totalVentas,
    ventasPorUsuario: ventasFormateadas
  });
});

app.put('/pedidos/:index/estado', (req, res) => {
  const { index } = req.params;
  const { nuevoEstado } = req.body;

  const pedidos = JSON.parse(fs.readFileSync(PEDIDOS_FILE));
  if (!pedidos[index]) return res.status(404).json({ success: false });

  pedidos[index].estado = nuevoEstado;
  fs.writeFileSync(PEDIDOS_FILE, JSON.stringify(pedidos, null, 2));

  res.json({ success: true, message: "Estado actualizado." });
});
