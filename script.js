const STORAGE_KEY = 'inventario-web';
const LOCATIONS_STORAGE_KEY = 'inventario-ubicaciones';
const RECEIPT_STORAGE_KEY = 'inventario-ultimo-recibo';

const productosIniciales = [
  { codigo: '001', nombre: 'Remera básica', stock_actual: 5, stock_minimo: 3, stock_maximo: 10 },
  { codigo: '002', nombre: 'Pantalón jean', stock_actual: 1, stock_minimo: 2, stock_maximo: 8 },
  { codigo: '003', nombre: 'Campera', stock_actual: 7, stock_minimo: 2, stock_maximo: 12 }
];

let productos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || productosIniciales;
let ubicaciones = JSON.parse(localStorage.getItem(LOCATIONS_STORAGE_KEY)) || [];
let ultimoRecibo = JSON.parse(localStorage.getItem(RECEIPT_STORAGE_KEY)) || null;
let carritoVenta = [];

function guardarProductos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
}

function guardarUbicaciones() {
  localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(ubicaciones));
}

function formatearMoneda(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto) || 0);
}

function formatearPrecio(precio) {
  return Number.isFinite(Number(precio)) && Number(precio) > 0 ? formatearMoneda(precio) : 'Sin precio';
}

function convertirPrecio(valor) {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  }

  let texto = String(valor).trim().replace(/[^\d,.-]/g, '');
  if (!texto) return null;
  if (texto.lastIndexOf(',') > texto.lastIndexOf('.')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else {
    texto = texto.replace(/,/g, '');
  }

  const precio = Number(texto);
  return Number.isFinite(precio) && precio > 0 ? precio : null;
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
    if (producto.stock_actual <= 0) {
      row.classList.add('sin-stock');
    }

    [producto.codigo, producto.nombre, producto.ubicacion || 'Sin ubicación', formatearPrecio(producto.precio), producto.stock_actual, clasificarStock(producto)]
      .forEach((valor) => {
        const cell = document.createElement('td');
        cell.textContent = valor;
        row.appendChild(cell);
      });
    tbody.appendChild(row);
  });
}

function renderUbicaciones(ubicacionSeleccionada = '') {
  const select = document.getElementById('ubicacionProducto');
  const lista = document.getElementById('listaUbicaciones');
  select.replaceChildren(new Option('Crea o selecciona una ubicación', ''));
  lista.replaceChildren();

  ubicaciones.forEach((ubicacion) => {
    select.add(new Option(ubicacion, ubicacion));
    const item = document.createElement('li');
    item.textContent = ubicacion;
    lista.appendChild(item);
  });

  select.value = ubicacionSeleccionada;
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
    ubicacion: document.getElementById('ubicacionProducto').value,
    precio: convertirPrecio(document.getElementById('precio').value),
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
  mostrarMensaje(`Producto guardado: ${producto.nombre}`);
});

document.getElementById('ubicacionForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const nombreUbicacion = document.getElementById('nombreUbicacion').value.trim();
  const ubicacionExistente = ubicaciones.find((ubicacion) => ubicacion.toLocaleLowerCase() === nombreUbicacion.toLocaleLowerCase());
  if (ubicacionExistente) {
    document.getElementById('mensajeUbicacion').textContent = 'Esa ubicación ya existe.';
    return;
  }

  ubicaciones.push(nombreUbicacion);
  guardarUbicaciones();
  renderUbicaciones(nombreUbicacion);
  document.getElementById('ubicacionForm').reset();
  document.getElementById('mensajeUbicacion').textContent = `Ubicación creada: ${nombreUbicacion}`;
});

document.getElementById('importacionForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const archivo = document.getElementById('archivoExcel').files[0];
  const mensaje = document.getElementById('mensajeImportacion');
  if (!archivo) return;
  if (!window.XLSX) {
    mensaje.textContent = 'No se pudo cargar el lector de Excel. Revisa tu conexión a internet y vuelve a intentarlo.';
    return;
  }

  try {
    const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
    const primeraHoja = libro.Sheets[libro.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(primeraHoja, { defval: '', raw: false });
    if (!filas.length) {
      mensaje.textContent = 'El archivo no contiene filas de productos.';
      return;
    }

    const encabezados = Object.keys(filas[0]);
    const buscarEncabezado = (alias) => encabezados.find((encabezado) => alias.includes(
      String(encabezado).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
    ));
    const columnas = {
      codigo: buscarEncabezado(['codigo', 'codigobarras', 'barcode', 'ean']),
      nombre: buscarEncabezado(['nombre', 'prenda', 'producto', 'nombreprenda', 'nombreproducto', 'nombreprendaoproducto']),
      ubicacion: buscarEncabezado(['ubicacion', 'ubicacionalmacenamiento']),
      precio: buscarEncabezado(['precio', 'preciounitario', 'precioventa']),
      stock_actual: buscarEncabezado(['stockactual']),
      stock_minimo: buscarEncabezado(['stockminimo']),
      stock_maximo: buscarEncabezado(['stockmaximo'])
    };
    const encabezadosFaltantes = Object.entries(columnas)
      .filter(([campo, encabezado]) => campo !== 'precio' && !encabezado)
      .map(([campo]) => campo);
    if (encabezadosFaltantes.length) {
      mensaje.textContent = `Faltan columnas requeridas: ${encabezadosFaltantes.join(', ')}. Descarga la plantilla para ver el formato.`;
      return;
    }

    const errores = [];
    const codigosArchivo = new Set();
    const productosValidos = [];
    filas.forEach((fila, indice) => {
      if (Object.values(fila).every((valor) => String(valor).trim() === '')) return;

      const codigo = String(fila[columnas.codigo]).trim();
      const nombre = String(fila[columnas.nombre]).trim();
      const ubicacion = String(fila[columnas.ubicacion]).trim();
      const parseStock = (valor) => {
        if (String(valor).trim() === '') return null;
        const numero = Number(String(valor).trim().replace(',', '.'));
        return Number.isInteger(numero) && numero >= 0 ? numero : null;
      };
      const stockActual = parseStock(fila[columnas.stock_actual]);
      const stockMinimo = parseStock(fila[columnas.stock_minimo]);
      const stockMaximo = parseStock(fila[columnas.stock_maximo]);
      const precioTexto = columnas.precio ? String(fila[columnas.precio]).trim() : '';
      const precio = precioTexto ? convertirPrecio(fila[columnas.precio]) : null;

      let error = '';
      if (!codigo || !nombre || !ubicacion) error = 'faltan código, nombre o ubicación';
      else if (stockActual === null || stockMinimo === null || stockMaximo === null) error = 'stock inválido (usa enteros iguales o mayores a cero)';
      else if (precioTexto && precio === null) error = 'precio inválido (usa un valor mayor a cero)';
      else if (codigosArchivo.has(codigo)) error = `código duplicado: ${codigo}`;

      if (error) {
        errores.push(`fila ${indice + 2}: ${error}`);
        return;
      }

      codigosArchivo.add(codigo);
      productosValidos.push({
        codigo,
        nombre,
        ubicacion,
        precio,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        stock_maximo: stockMaximo
      });
    });

    if (!productosValidos.length) {
      mensaje.textContent = `No se importaron productos. ${errores.slice(0, 4).join('; ')}`;
      return;
    }

    const productosActualizados = [...productos];
    const indicePorCodigo = new Map(productosActualizados.map((producto, indice) => [producto.codigo, indice]));
    const ubicacionesActualizadas = [...ubicaciones];
    const ubicacionPorNombre = new Map(ubicacionesActualizadas.map((ubicacion) => [ubicacion.toLocaleLowerCase(), ubicacion]));
    let nuevos = 0;
    let actualizados = 0;

    productosValidos.forEach((producto) => {
      const ubicacionNormalizada = producto.ubicacion.toLocaleLowerCase();
      if (!ubicacionPorNombre.has(ubicacionNormalizada)) {
        ubicacionesActualizadas.push(producto.ubicacion);
        ubicacionPorNombre.set(ubicacionNormalizada, producto.ubicacion);
      }
      producto.ubicacion = ubicacionPorNombre.get(ubicacionNormalizada);

      const indice = indicePorCodigo.get(producto.codigo);
      if (indice === undefined) {
        indicePorCodigo.set(producto.codigo, productosActualizados.length);
        productosActualizados.push(producto);
        nuevos += 1;
      } else {
        if (producto.precio === null) {
          producto.precio = productosActualizados[indice].precio ?? null;
        }
        productosActualizados[indice] = producto;
        actualizados += 1;
      }
    });

    productos = productosActualizados;
    ubicaciones = ubicacionesActualizadas;
    guardarProductos();
    guardarUbicaciones();
    renderUbicaciones();
    renderTabla();

    const resumen = `Importación completada: ${nuevos} nuevos y ${actualizados} actualizados.`;
    const detalleErrores = errores.length ? ` Se omitieron ${errores.length} filas (${errores.slice(0, 3).join('; ')}).` : '';
    mensaje.textContent = resumen + detalleErrores;
    document.getElementById('importacionForm').reset();
  } catch (error) {
    mensaje.textContent = 'No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx o .xls).';
  }
});

document.getElementById('descargarPlantillaBtn').addEventListener('click', function () {
  if (!window.XLSX) {
    document.getElementById('mensajeImportacion').textContent = 'No se pudo cargar el generador de Excel. Revisa tu conexión a internet y vuelve a intentarlo.';
    return;
  }

  const hoja = XLSX.utils.aoa_to_sheet([['codigo', 'nombre', 'ubicacion', 'precio', 'stock_actual', 'stock_minimo', 'stock_maximo']]);
  hoja['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Productos');
  XLSX.writeFile(libro, 'plantilla_inventario.xlsx');
});

function calcularTotalVenta() {
  return carritoVenta.reduce((total, linea) => total + linea.precio * linea.cantidad, 0);
}

function renderCarrito() {
  const tbody = document.getElementById('carritoVenta');
  tbody.replaceChildren();

  if (!carritoVenta.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'No hay productos en esta venta.';
    row.appendChild(cell);
    tbody.appendChild(row);
  }

  carritoVenta.forEach((linea) => {
    const row = document.createElement('tr');
    [linea.codigo, linea.nombre, linea.cantidad, formatearPrecio(linea.precio), formatearMoneda(linea.precio * linea.cantidad)]
      .forEach((valor) => {
        const cell = document.createElement('td');
        cell.textContent = valor;
        row.appendChild(cell);
      });

    const removeCell = document.createElement('td');
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'boton-quitar';
    removeButton.textContent = 'Quitar';
    removeButton.setAttribute('aria-label', `Quitar ${linea.nombre} de la venta`);
    removeButton.addEventListener('click', () => {
      carritoVenta = carritoVenta.filter((producto) => producto.codigo !== linea.codigo);
      renderCarrito();
    });
    removeCell.appendChild(removeButton);
    row.appendChild(removeCell);
    tbody.appendChild(row);
  });

  const cantidadTotal = carritoVenta.reduce((total, linea) => total + linea.cantidad, 0);
  document.getElementById('cantidadTotalVenta').textContent = cantidadTotal;
  document.getElementById('precioTotalVenta').textContent = formatearMoneda(calcularTotalVenta());
  document.getElementById('confirmarVentaBtn').disabled = carritoVenta.length === 0;
  document.getElementById('vaciarCarritoBtn').disabled = carritoVenta.length === 0;
}

document.getElementById('agregarVentaForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const codigo = document.getElementById('codigoEscaneado').value.trim();
  const cantidad = Number(document.getElementById('cantidad').value);

  if (!codigo) {
    mostrarMensaje('Escanee o ingrese un código de barras.');
    return;
  }

  const producto = obtenerProductoPorCodigo(codigo);
  if (!producto) {
    mostrarMensaje('Producto no encontrado en el inventario.');
    return;
  }

  if (!Number.isInteger(cantidad) || cantidad < 1) {
    mostrarMensaje('Ingrese una cantidad entera mayor que cero.');
    return;
  }

  if (!Number.isFinite(Number(producto.precio)) || Number(producto.precio) <= 0) {
    mostrarMensaje('Asigne un precio al producto antes de agregarlo a la venta.');
    return;
  }

  const lineaExistente = carritoVenta.find((linea) => linea.codigo === codigo);
  const nuevaCantidad = cantidad + (lineaExistente?.cantidad || 0);
  if (nuevaCantidad > producto.stock_actual) {
    mostrarMensaje(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_actual}.`);
    return;
  }

  if (lineaExistente) {
    lineaExistente.cantidad = nuevaCantidad;
  } else {
    carritoVenta.push({
      codigo: producto.codigo,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      cantidad
    });
  }

  renderCarrito();
  mostrarMensaje(`${producto.nombre} agregado a la venta.`);
  document.getElementById('agregarVentaForm').reset();
  document.getElementById('cantidad').value = '1';
  document.getElementById('codigoEscaneado').focus();
});

document.getElementById('vaciarCarritoBtn').addEventListener('click', function () {
  carritoVenta = [];
  renderCarrito();
  mostrarMensaje('Venta vaciada.');
});

document.getElementById('confirmarVentaBtn').addEventListener('click', function () {
  if (!carritoVenta.length) return;

  const productoSinStock = carritoVenta.find((linea) => {
    const producto = obtenerProductoPorCodigo(linea.codigo);
    return !producto || producto.stock_actual < linea.cantidad;
  });
  if (productoSinStock) {
    mostrarMensaje(`Stock insuficiente para ${productoSinStock.nombre}. Revisa la cantidad antes de cobrar.`);
    return;
  }

  const lineasRecibo = carritoVenta.map((linea) => ({
    ...linea,
    subtotal: Number((linea.precio * linea.cantidad).toFixed(2))
  }));
  lineasRecibo.forEach((linea) => {
    obtenerProductoPorCodigo(linea.codigo).stock_actual -= linea.cantidad;
  });

  const total = Number(lineasRecibo.reduce((suma, linea) => suma + linea.subtotal, 0).toFixed(2));
  const cantidadTotal = lineasRecibo.reduce((suma, linea) => suma + linea.cantidad, 0);
  ultimoRecibo = {
    numero: `V-${Date.now()}`,
    fecha: new Date().toISOString(),
    items: lineasRecibo,
    cantidad_total: cantidadTotal,
    total
  };
  localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(ultimoRecibo));
  guardarProductos();
  renderTabla();
  renderRecibo(ultimoRecibo);
  carritoVenta = [];
  renderCarrito();
  mostrarMensaje(`Venta registrada: ${cantidadTotal} unidades. Total: ${formatearMoneda(total)}.`);
});

document.getElementById('cargaStockForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const codigo = document.getElementById('codigoCargaStock').value.trim();
  const cantidad = Number(document.getElementById('cantidadCargaStock').value);
  const mensajeCarga = document.getElementById('mensajeCargaStock');
  const producto = obtenerProductoPorCodigo(codigo);

  if (!producto) {
    mensajeCarga.textContent = 'Producto no encontrado en el inventario.';
    return;
  }
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    mensajeCarga.textContent = 'Ingrese una cantidad entera mayor que cero.';
    return;
  }

  producto.stock_actual += cantidad;
  guardarProductos();
  renderTabla();
  document.getElementById('cargaStockForm').reset();
  document.getElementById('cantidadCargaStock').value = '1';
  mensajeCarga.textContent = `Carga realizada. Stock actual: ${producto.stock_actual}.`;
});

function renderRecibo(recibo) {
  const items = Array.isArray(recibo.items)
    ? recibo.items
    : [{ codigo: recibo.codigo, nombre: recibo.nombre, cantidad: recibo.cantidad, precio: recibo.precio, subtotal: recibo.total }];
  const tbody = document.getElementById('reciboProductos');
  tbody.replaceChildren();

  items.forEach((item) => {
    const row = document.createElement('tr');
    const productCell = document.createElement('td');
    const name = document.createElement('span');
    const code = document.createElement('small');
    name.textContent = item.nombre;
    code.textContent = item.codigo;
    productCell.append(name, code);
    row.appendChild(productCell);
    [item.cantidad, formatearPrecio(item.precio), formatearMoneda(item.subtotal ?? item.precio * item.cantidad)]
      .forEach((valor) => {
        const cell = document.createElement('td');
        cell.textContent = valor;
        row.appendChild(cell);
      });
    tbody.appendChild(row);
  });

  document.getElementById('reciboNumero').textContent = recibo.numero;
  document.getElementById('reciboFecha').textContent = new Date(recibo.fecha).toLocaleString('es-AR');
  document.getElementById('reciboCantidadTotal').textContent = recibo.cantidad_total ?? recibo.cantidad;
  document.getElementById('reciboTotal').textContent = formatearMoneda(recibo.total);
  document.getElementById('reciboVenta').hidden = false;
}

document.getElementById('imprimirReciboBtn').addEventListener('click', function () {
  window.print();
});

function mostrarMensaje(texto) {
  document.getElementById('mensaje').textContent = texto;
}

renderUbicaciones();
renderTabla();
renderCarrito();
if (ultimoRecibo) renderRecibo(ultimoRecibo);
