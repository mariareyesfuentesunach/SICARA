# SICARA - Módulo del Administrador General

**Sistema de Control de Asistencia y Rendimiento Académico en Escuelas Rurales**

---

## 📌 1. Identidad Visual y Diseño
La interfaz ha sido desarrollada con una estética moderna, limpia y responsive para computadoras y dispositivos móviles, inspirada en tarjetas de esquinas redondeadas, sombras discretas y la paleta de colores institucional:
* **Vino Principal:** `#722F37`
* **Vino Oscuro:** `#4A1722`
* **Vino Claro:** `#A64D5A`
* **Fondo General:** `#F8F5F5`
* **Tarjetas y Ventanas:** `#FFFFFF`
* **Texto Principal:** `#292329`
* **Estados Semánticos:**
  * Verde (`#16A34A`): Aprobadas, Activas, Acciones Exitosas.
  * Rojo (`#DC2626`): Rechazadas, Inactivas, Errores y Confirmaciones de Rechazo.
  * Amarillo / Ámbar (`#D97706`): Pendientes y Advertencias.

---

## 🔑 2. Credenciales del Administrador General

* **Correo Electrónico:** `Admin_Palasio@gmail.com`
* **Contraseña Inicial:** `Admin123`
* **Rol en BD:** `Administrador`
* **Seguridad:** Contraseña encriptada con algoritmo **bcrypt** (10 salt rounds). Sesiones protegidas mediante **JSON Web Tokens (JWT)**.
* **Salvaguardas:**
  * No se permite autoregistro.
  * El Administrador General es una cuenta única; no se pueden crear administradores adicionales ni desactivar la cuenta principal.

---

## 🗄️ 3. Conexión con PostgreSQL y PGAdmin

El sistema se conecta directamente a la base de datos real de PostgreSQL:
* **Host / Servidor:** `localhost` o `127.0.0.1`
* **Puerto:** `5432`
* **Base de Datos:** `SICARA`
* **Usuario:** `postgres`
* **Contraseña:** (Definida en su instalación local de PostgreSQL o sin contraseña según `pg_hba.conf`)

### Tablas utilizadas (sin tablas inventadas):
1. **`usuario`**: Almacena las cuentas del Administrador General, Directivos y Docentes.
2. **`solicitud_escuela`**: Solicitudes de registro de planteles rurales (`Pendiente`, `Aprobada`, `Rechazada`, `motivo_rechazo`).
3. **`escuelas`**: Catálogo oficial de escuelas registradas (`Activa`, `Inactiva`, CCT, nivel, turno, municipio, contacto).
4. **`alerta`**: Alertas de riesgo académico y ausentismo sincronizadas con el centro de notificaciones.
5. **`grupo`**, **`docentes`**, **`alumnos`**: Vinculadas para mostrar métricas reales de grupos y docentes por escuela.

---

## 🚀 4. Instrucciones para Ejecutar el Proyecto

### Opción A: Modo Producción (Recomendado)
Inicia el servidor backend que sirve simultáneamente la API REST y la aplicación web compilada:
```bash
npm start
```
Abrir en el navegador: **`http://localhost:5000`**

### Opción B: Modo Desarrollo
Permite ejecutar backend con recarga automática y frontend con Vite:
```bash
npm run dev
```
* **Frontend (Vite):** `http://localhost:3000`
* **Backend API:** `http://localhost:5000/api`

---

## 💻 5. Módulos y Funcionalidades Implementadas

1. **Inicio de Sesión:**
   * Icono representativo de educación.
   * Campos de correo y contraseña con alternador de visibilidad (mostrar/ocultar).
   * Validación estricta en backend contra la base de datos PostgreSQL.
2. **Dashboard:**
   * Tarjetas con métricas reales: Escuelas registradas, Solicitudes pendientes, Solicitudes aprobadas, Solicitudes rechazadas y Usuarios registrados.
   * Accesos directos a funciones principales.
   * Gráfica/distribución de escuelas por nivel educativo.
   * Listado rápido de solicitudes recientes y alertas académicas activas.
3. **Solicitudes de Escuelas:**
   * Tabla con Nombre, CCT, Nivel Educativo, Municipio, Fecha y Estado.
   * Buscador en tiempo real y filtros por estado.
   * Modal de detalles con todos los campos reales de la solicitud.
   * **Aprobar Solicitud:** Transacción en BD que actualiza la solicitud a `Aprobada`, registra automáticamente el plantel en la tabla `escuelas` y crea/asocia la cuenta directiva en `usuario`.
   * **Rechazar Solicitud:** Solicita confirmación y motivo justificado obligatorio, persistiendo el estado `Rechazada` y el `motivo_rechazo`.
   * **Registrar Solicitud:** Formulario modal para ingresar nuevas solicitudes directamente en PostgreSQL.
4. **Escuelas:**
   * Catálogo de escuelas registradas con sus grupos y alumnos asociados.
   * Consulta de detalles (grupos registrados, docentes vinculados, directivo asignado).
   * Edición de información de contacto (turno, teléfono, dirección, correo).
   * Alternador de estado (Activar / Inactivar escuela).
5. **Usuarios:**
   * Lista de usuarios con rol y escuela vinculada.
   * Modificación de roles entre `Directivo` y `Docente`.
   * Activación / desactivación de cuentas con protección para la cuenta principal.
6. **Notificaciones:**
   * Centro unificado de solicitudes pendientes y alertas del sistema.
   * Opción para resolver alertas académicas y acceso directo al módulo correspondiente.
7. **Mi Perfil:**
   * Visualización de datos de la cuenta de Administrador General.
   * Actualización de nombre y apellidos.
   * Cambio de contraseña seguro con validación de la contraseña actual.
8. **Cerrar Sesión:**
   * Modal de confirmación y eliminación segura del token de sesión.

