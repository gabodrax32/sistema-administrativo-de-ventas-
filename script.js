const STORAGE_KEY = 'inventario-web';

const productosIniciales = [
  { codigo: '001', nombre: 'Aceite Motor', stock_actual: 5, stock_minimo: 3, stock_maximo: 10 },
  { codigo: '002', nombre: 'Filtro de Aire', stock_actual: 1, stock_minimo: 2, stock_maximo: 8 },
  { codigo: '003', nombre: 'Batería', stock_actual: 7, stock_minimo: 2, stock_maximo: 12 }
];

let productos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || productosIniciales;

function guardarProductos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
}

function clasificarStock(producto) {
  if (producto.stock_actual <= 0) return 'Agotado / Crítico';
  if (producto.stock_actual < producto.stock_minimo) return 'Faltante / Reposición';
  if (producto.stock_actual > producto.stock_maximo) return 'Sobrestock';
  return 'Óptimo';
}

function renderTabla() {
  const tbody = document.getElementById('tablaProductos');
  tbody.innerHTML = '';

  productos.forEach((producto) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${producto.codigo}</td>
      <td>${producto.nombre}</td>
      <td>${producto.stock_actual}</td>
      <td>${clasificarStock(producto)}</td>
    `;
    tbody.appendChild(row);
  });
}

function obtenerProductoPorCodigo(codigo) {
  return productos.find((p) => p.codigo === codigo);
}

function resetFormulario() {
  document.getElementById('productoForm').reset();
}

document.getElementById('productoForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const producto = {
    codigo: document.getElementById('codigo').value.trim(),
    nombre: document.getElementById('nombre').value.trim(),
    stock_actual: Number(document.getElementById('stockActual').value),
    stock_minimo: Number(document.getElementById('stockMinimo').value),
    stock_maximo: Number(document.getElementById('stockMaximo').value)
  };

  const index = productos.findIndex((p) => p.codigo === producto.codigo);
  if (index >= 0) {
    productos[index] = producto;
  } else {
    productos.push(producto);
  }

  guardarProductos();
  renderTabla();
  resetFormulario();
  mostrarMensaje(`Repuesto guardado: ${producto.nombre}`);
});

document.getElementById('procesarBtn').addEventListener('click', function () {
  const codigo = document.getElementById('codigoEscaneado').value.trim();
  const accion = document.getElementById('accion').value;
  const cantidad = Number(document.getElementById('cantidad').value || 1);

  if (!codigo) {
    mostrarMensaje('Ingrese un código de barras.');
    return;
  }

  let producto = obtenerProductoPorCodigo(codigo);
  if (!producto) {
    mostrarMensaje('Producto no encontrado. Puede guardarlo desde el formulario.');
    return;
  }

  if (accion === 'venta') {
    producto.stock_actual = Math.max(0, producto.stock_actual - cantidad);
  } else {
    producto.stock_actual += cantidad;
  }

  guardarProductos();
  renderTabla();
  mostrarMensaje(`${accion === 'venta' ? 'Venta' : 'Carga'} realizada. Stock actual: ${producto.stock_actual}`);
});

function mostrarMensaje(texto) {
  document.getElementById('mensaje').textContent = texto;
}

renderTabla();
