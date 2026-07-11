import json
import os


class Producto:
    def __init__(self, codigo_barras, nombre, stock_actual, stock_minimo, stock_maximo):
        self.codigo_barras = codigo_barras
        self.nombre = nombre
        self.stock_actual = stock_actual
        self.stock_minimo = stock_minimo
        self.stock_maximo = stock_maximo

    def mostrar(self):
        return f"{self.codigo_barras} | {self.nombre} | Stock: {self.stock_actual}"

    def to_dict(self):
        return {
            "codigo_barras": self.codigo_barras,
            "nombre": self.nombre,
            "stock_actual": self.stock_actual,
            "stock_minimo": self.stock_minimo,
            "stock_maximo": self.stock_maximo,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            data["codigo_barras"],
            data["nombre"],
            data["stock_actual"],
            data["stock_minimo"],
            data["stock_maximo"],
        )


class Inventario:
    def __init__(self, archivo="inventario.json"):
        self.archivo = archivo
        self.productos = self.cargar()

    def cargar(self):
        if os.path.exists(self.archivo):
            with open(self.archivo, "r", encoding="utf-8") as f:
                datos = json.load(f)
            return {codigo: Producto.from_dict(item) for codigo, item in datos.items()}
        return {
            "001": Producto("001", "Aceite Motor", 5, 3, 10),
            "002": Producto("002", "Filtro de Aire", 1, 2, 8),
            "003": Producto("003", "Batería", 7, 2, 12),
        }

    def guardar(self):
        datos = {codigo: producto.to_dict() for codigo, producto in self.productos.items()}
        with open(self.archivo, "w", encoding="utf-8") as f:
            json.dump(datos, f, indent=2, ensure_ascii=False)

    def buscar(self, codigo_barras):
        return self.productos.get(codigo_barras)

    def listar(self):
        if not self.productos:
            print("No hay productos registrados.")
            return
        for producto in self.productos.values():
            print(producto.mostrar())

    def actualizar(self, producto):
        self.productos[producto.codigo_barras] = producto
        self.guardar()


def clasificar_stock(producto):
    if producto.stock_actual <= 0:
        return "Agotado / Faltante Crítico"
    if producto.stock_actual < producto.stock_minimo:
        return "Faltante / Reposición Necesaria"
    if producto.stock_actual > producto.stock_maximo:
        return "Sobrestock / Stock de Más"
    return "Disponible / Stock Óptimo"


def registrar_nuevo_repuesto(inventario, codigo_barras):
    nombre = input("Ingrese el nombre del repuesto: ").strip()
    stock_actual = int(input("Ingrese el stock actual: ").strip())
    stock_minimo = int(input("Ingrese el stock mínimo: ").strip())
    stock_maximo = int(input("Ingrese el stock máximo: ").strip())

    producto = Producto(codigo_barras, nombre, stock_actual, stock_minimo, stock_maximo)
    inventario.actualizar(producto)
    print(f"Repuesto registrado: {producto.mostrar()}")


def manejar_codigo_escaneado(inventario, codigo_escaneado):
    producto = inventario.buscar(codigo_escaneado)

    if producto is None:
        print("Producto no encontrado.")
        opcion = input("¿Desea registrar un nuevo repuesto? (s/n): ").strip().lower()
        if opcion == "s":
            registrar_nuevo_repuesto(inventario, codigo_escaneado)
        return

    print(f"Producto encontrado: {producto.mostrar()}")
    print(f"Estado: {clasificar_stock(producto)}")

    opcion = input("¿Qué acción desea realizar? [venta/carga/salir]: ").strip().lower()
    if opcion == "venta":
        cantidad = int(input("Ingrese la cantidad vendida: ").strip())
        producto.stock_actual = max(0, producto.stock_actual - cantidad)
    elif opcion == "carga":
        cantidad = int(input("Ingrese la cantidad cargada: ").strip())
        producto.stock_actual += cantidad
    elif opcion == "salir":
        return
    else:
        print("Opción no válida.")
        return

    inventario.actualizar(producto)
    print(f"Stock actualizado: {producto.stock_actual}")
    print(f"Nuevo estado: {clasificar_stock(producto)}")


if __name__ == "__main__":
    inventario = Inventario()
    print("Sistema de administración de stock")
    print("Opciones: listar, escanear, salir")

    while True:
        opcion = input("\nIngrese una opción: ").strip().lower()

        if opcion == "listar":
            inventario.listar()
        elif opcion == "escanear":
            codigo = input("Ingrese el código de barras: ").strip()
            manejar_codigo_escaneado(inventario, codigo)
        elif opcion in {"salir", "exit"}:
            print("Saliendo del sistema...")
            break
        else:
            print("Opción no válida.")
