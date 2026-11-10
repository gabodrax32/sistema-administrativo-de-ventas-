# Sistema de Administración de Stock

Este proyecto es una página web sencilla para gestionar un inventario de repuestos.

## ¿Qué incluye?
- Agregar y editar repuestos
- Registrar ventas y cargas de stock
- Ver el estado del stock
- Guardar los datos en el navegador con localStorage

## Archivos principales
- index.html: estructura de la página
- styles.css: estilos visuales
- script.js: lógica de la aplicación

## Abrir la aplicación

La aplicación publicada estará disponible en:
https://gabodrax32.github.io/sistema-administrativo-de-ventas-/

También puedes abrir `index.html` directamente en el navegador.

Los cambios que se suban a `main` se publican automáticamente en GitHub Pages.
La primera vez, selecciona **Settings > Pages > Build and deployment > Source > GitHub Actions**.

## Almacenamiento

La página es estática y no necesita servidor backend. El inventario se guarda en
`localStorage` del navegador; no se sincroniza entre dispositivos ni usuarios y
se puede perder si se borran los datos del navegador.
