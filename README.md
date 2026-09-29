# Tienda Ecommerce (Perú)

Tienda online genérica en **Next.js 16 + PostgreSQL + Prisma 7**, lista para vender celulares, laptops, PCs All in One, autos, ropa, juguetes o cualquier producto. Cobra con todos los medios de pago comunes en Perú.

## Funcionalidades

**Tienda**
- Catálogo con categorías y subcategorías, marcas, búsqueda, filtros (marca, condición, precio) y orden.
- Productos con **variantes** (color/capacidad, talla/color, versión...), cada una con su propio precio y stock.
- **Ficha técnica libre**, con plantillas para celulares, laptops, autos, ropa y juguetes.
- Condición del producto: nuevo, seminuevo o reacondicionado.
- Carrito persistente y checkout con boleta (DNI/CE/pasaporte) o factura (RUC), envío a los 25 departamentos o recojo en tienda.
- SEO: metadatos, `sitemap.xml`, `robots.txt` y datos estructurados de producto para Google.
- Botón flotante de WhatsApp, **Libro de Reclamaciones virtual** (obligatorio por INDECOPI) y términos y condiciones.

**Medios de pago**

| Medio | Confirmación |
|---|---|
| **Mercado Pago Checkout Pro**: tarjetas de crédito y débito, **Yape**, PagoEfectivo | Automática (webhook) |
| **Yape directo**: QR + número | Manual: el cliente reporta el Nº de operación y el voucher, y el admin aprueba |
| **Plin** | Manual |
| **Transferencia / depósito** (BCP, Interbank, BBVA...) | Manual |
| **Contra entrega** | Al entregar |

**Panel admin (`/admin`)**
- Resumen de ventas del día y del mes, pedidos por despachar, pagos por verificar y alertas de stock bajo.
- Pedidos: filtros, aprobar o rechazar pagos manuales (con voucher), estados *pagado → en preparación → enviado → entregado*, cancelación con devolución automática de stock y notas internas.
- CRUD de productos (imágenes, variantes, especificaciones), categorías y marcas.
- Configuración: nombre, logo, WhatsApp, costos de envío, envío gratis desde cierto monto, y datos de Yape, Plin y cuentas bancarias.
- Respuesta a reclamaciones, con la fecha límite legal.

## Requisitos

- Node.js 20.9 o superior (recomendado 22)
- PostgreSQL 14 o superior

## Instalación local

```bash
npm install
cp .env.example .env        # y completa DATABASE_URL, AUTH_SECRET, etc.
npm run db:migrate          # crea las tablas
npm run db:seed             # admin + productos de ejemplo
npm run dev
```

- Tienda: http://localhost:3000
- Panel: http://localhost:3000/admin (usuario y contraseña de `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

> Si la base de datos no existe, créala primero: `createdb -U postgres tienda`, o con pgAdmin.

## Mercado Pago

Hay dos formas de cobrar, y se elige en `/admin/configuracion`:

| Modo | Experiencia |
|---|---|
| **Formulario integrado** (por defecto, Checkout API + Bricks) | El cliente paga **dentro de tu tienda**: tarjeta de crédito o débito (número, CVV, cuotas), **Yape** (celular + código de aprobación) o PagoEfectivo. |
| **Redirección** (Checkout Pro) | El cliente paga en la página de Mercado Pago y vuelve a la tienda. |

### Configuración
1. Crea una aplicación en https://www.mercadopago.com.pe/developers/panel/app (tipo de pago: **Pagos online**, producto **Checkout API / Bricks**).
2. En **Credenciales de prueba** copia:
   - **Access Token** → `MP_ACCESS_TOKEN` (secreto, solo en el servidor)
   - **Public Key** → `MP_PUBLIC_KEY` (la usa el navegador para tokenizar la tarjeta y Yape)
3. Para vender de verdad, reemplázalas por las **credenciales de producción** (`APP_USR-...`).
4. En **Webhooks** configura `https://TU-DOMINIO/api/webhooks/mercadopago` con el evento **Pagos**, y copia la **clave secreta** en `MP_WEBHOOK_SECRET`. Es necesario para que se confirmen los pagos de PagoEfectivo y los pagos pendientes.

### Datos de prueba
- **Tarjetas:** https://www.mercadopago.com.pe/developers/es/docs/checkout-api/integration-test/test-cards. Por ejemplo, Visa `4009 1753 3280 6176`, CVV `123`, vencimiento `11/30`. En el nombre del titular escribe `APRO` (aprobado), `OTHE` (rechazado) o `CONT` (pendiente).
- **Yape:** celular `111111111` y código `123456` → aprobado. Los números `111111112` a `111111118` simulan distintos rechazos.

**Seguridad:** los datos de la tarjeta nunca pasan por tu servidor, porque Mercado Pago los convierte en un token de un solo uso. El monto se toma siempre del pedido guardado en la base de datos, nunca del navegador, y el webhook consulta el estado real del pago a la API de Mercado Pago.

## Personalización

- **Colores**: cambia `--brand` en [src/app/globals.css](src/app/globals.css).
- **Nombre, logo, envíos y pagos**: desde `/admin/configuracion`.
- **Términos y condiciones**: [src/app/(store)/terminos/page.tsx](src/app/(store)/terminos/page.tsx). Revísalos con un asesor legal.

## Despliegue en un droplet (Ubuntu 24.04)

```bash
# 1. Dependencias
sudo apt update && sudo apt install -y postgresql nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2

# 2. Base de datos
sudo -u postgres psql -c "CREATE USER tienda WITH PASSWORD 'CLAVE_SEGURA';"
sudo -u postgres psql -c "CREATE DATABASE tienda OWNER tienda;"

# 3. App
git clone <tu-repo> /var/www/tienda && cd /var/www/tienda
cp .env.example .env && nano .env   # APP_URL=https://tudominio.pe, DATABASE_URL, AUTH_SECRET, MP_*
npm ci
npm run db:deploy
npm run db:seed
npm run build
pm2 start npm --name tienda -- start && pm2 save && pm2 startup
```

Nginx (`/etc/nginx/sites-available/tienda`):

```nginx
server {
    server_name tudominio.pe www.tudominio.pe;
    client_max_body_size 10M;

    location /uploads/products/ { alias /var/www/tienda/uploads/products/; expires 30d; }
    location /uploads/store/    { alias /var/www/tienda/uploads/store/; expires 30d; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tienda /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d tudominio.pe -d www.tudominio.pe
```

Para actualizar: `git pull && npm ci && npm run db:deploy && npm run build && pm2 restart tienda`.

**Respaldos:** programa un `pg_dump` diario de la base de datos y copia la carpeta `uploads/`.

## Estructura

```
prisma/schema.prisma        Modelo de datos (montos en céntimos)
prisma/seed.ts              Datos iniciales
src/app/(store)/            Tienda pública
src/app/admin/              Panel de administración
src/app/api/webhooks/       Webhook de Mercado Pago
src/lib/orders.ts           Creación de pedidos, stock, cancelación
src/lib/payments/           Integraciones de pago (Mercado Pago; aquí se agregarían Culqi, Izipay...)
src/lib/settings.ts         Configuración de tienda, envíos y medios de pago
```
