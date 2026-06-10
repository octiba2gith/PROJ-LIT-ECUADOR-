# Especificación de Seguridad de Firestore (Security Specs)

Esta especificación detalla las reglas de acceso y validación basadas en atributos (ABAC) para garantizar que la base de datos de Firestore sea impenetrable frente a ataques externos o inyecciones de datos no autorizados.

## 1. Invariantes de Datos (Data Invariants)

- **Catálogo de Libros (books)**:
  - Cualquier visitante (invitado o registrado) puede leer y listar libros.
  - Únicamente los administradores validados pueden añadir (`create`), actualizar (`update`) o eliminar (`delete`) libros.
  - El precio unitario de un libro debe ser un número estrictamente mayor o igual a cero.
  - El stock debe ser un entero no negativo.

- **Pedidos de Compra (orders)**:
  - Cualquier lector (registrado o invitado) puede crear un pedido (`create`).
  - Únicamente un administrador puede ver la lista general completa de pedidos.
  - Un usuario registrado puede consultar únicamente la lista de sus propios pedidos (filtrado por su dirección de correo electrónico).
  - Un pedido no puede ser modificado ni alterado tras su creación (los pedidos son de solo lectura y eliminación selectiva por administrador).

- **Preferencias de Diseño (configs)**:
  - Cualquier usuario puede leer la configuración del diseño visual.
  - Únicamente los administradores pueden guardar o modificar la identidad visual (`configs/designConfig`).

- **Usuarios Registrados (users)**:
  - Cualquier usuario puede registrarse (`create`).
  - El usuario propietario es el único que puede leer y modificar su propio registro de cuenta (comparación de UID o email).

- **Alertas de Stock (notifications)**:
  - Cualquier usuario puede crear una alerta de stock cuando realiza un pedido de reserva y el inventario se agota.
  - Solo los administradores pueden leer, marcar como leídas o borrar alertas de stock.

---

## 2. Los Payloads de la "Docena Sucia" (The Dirty Dozen)

Intentos deliberados de violar la integridad para verificar que las reglas denieguen el acceso:

1. **Inyección de Libro por Cliente**: Un usuario no administrador intenta subir un libro nuevo con un identificador pirateado. *(Esperado: PERMISSION_DENIED)*
2. **Alteración del Precio de Libro**: Un usuario común intenta actualizar el precio de un libro para que cueste `$0.00`. *(Esperado: PERMISSION_DENIED)*
3. **Escalada de Privilegios de Diseño**: Un lector intenta cambiar la paleta de colores o el título del sitio en Firestore. *(Esperado: PERMISSION_DENIED)*
4. **Lectura de Pedidos Ajenos**: Un cliente autenticado intenta consultar la lista completa de pedidos realizados por otros clientes. *(Esperado: PERMISSION_DENIED)*
5. **Modificación de Pedido Existente**: Un usuario intenta modificar las cantidades o precios de un pedido que ya está procesado. *(Esperado: PERMISSION_DENIED)*
6. **Inyección de Alerta Huérfana**: Un usuario intenta insertar una notificación de stock fraudulenta que no está vinculada a ningún libro real. *(Esperado: PERMISSION_DENIED)*
7. **Lectura de Cuentas de Usuarios**: Un visitante intenta realizar una consulta general sobre los correos y contraseñas de todos los lectores registrados. *(Esperado: PERMISSION_DENIED)*
8. **Creación de Libro con ID Malformado**: Intento de crear un libro usando caracteres unicode extraños o cadenas de 2KB como ID. *(Esperado: PERMISSION_DENIED)*
9. **Eliminación del Catálogo**: Un usuario registrado o invitado intenta borrar un libro del inventario. *(Esperado: PERMISSION_DENIED)*
10. **Lectura de Alertas por Lector**: Un cliente registrado intenta listar las notificaciones para conocer fallas del servidor. *(Esperado: PERMISSION_DENIED)*
11. **Registro de Usuario con Email de Admin**: Un usuario intenta dar de alta una cuenta usando el correo de administración sin verificar. *(Esperado: PERMISSION_DENIED)*
12. **Inyección de Stock Negativo**: Un administrador o sistema intenta asignar un stock de `-100` copias a un libro. *(Esperado: PERMISSION_DENIED)*

---

## 3. Matriz de Auditoría del Red Team

| Recurso / Colección | Identity Spoofing | State Shortcutting | Resource Poisoning |
| :--- | :--- | :--- | :--- |
| `/books/{bookId}` | Cerrado (Solo Admin) | Bloqueado por esquema | Evitado (size en campos de texto, enteros no negativos) |
| `/orders/{orderId}` | Solo dueño lee su email | Bloqueado (Inmutable tras creación) | Evitado con campos obligatorios |
| `/users/{userId}` | Validado contra Auth.uid | Imposible (Solo su documento) | Restringido por tamaño |
| `/configs/{configId}` | Cerrado (Solo Admin) | N/A | Bloqueado por campos de formato color |
| `/notifications/{id}`| Cerrado (Solo Admin lee) | N/A | Validado por enumerador de tipo |
