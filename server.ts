import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Load environment variables
dotenv.config();

// Read firebase-applet-config.json to setup Firebase config server-side
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.error('Error reading firebase config in server:', e);
  }
}

// Initialize Firebase Client SDK on Node.js server
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = express();
const getPort = (): number => {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(val)) return val;
  }
  if (process.env.PORT) {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val)) return val;
  }
  return 3000;
};

const getHost = (): string => {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
};

const PORT = getPort();
const HOST = getHost();

// Body parser
app.use(express.json());

// API route to send emails with nodemailer
app.post('/api/send-email', async (req, res) => {
  const {
    id,
    firstName,
    lastName,
    orderDate,
    items,
    totalQuantity,
    totalPayable,
    userEmail
  } = req.body;

  const orderId = id || `PED-${Date.now()}`;
  const customerName = `${firstName || ''} ${lastName || ''}`.trim() || 'Lector';
  const customerEmail = userEmail || 'No registrado';

  // Check if credentials are set (prioritize Firestore configuration, then environment variables)
  let gmailUser = process.env.GMAIL_USER;
  let gmailPass = process.env.GMAIL_APP_PASS;
  let adminEmail = process.env.ADMIN_EMAIL || 'admin@literatura.ec';

  try {
    const configDocRef = doc(db, 'configs', 'designConfig');
    const configSnap = await getDoc(configDocRef);
    if (configSnap.exists()) {
      const data = configSnap.data();
      if (data.gmailUser) gmailUser = data.gmailUser;
      if (data.gmailAppPass) gmailPass = data.gmailAppPass;
      if (data.adminEmail) adminEmail = data.adminEmail;
    }
  } catch (err) {
    console.warn('Could not load dynamic SMTP config from Firestore configs/designConfig, using defaults:', err);
  }

  if (!gmailUser || !gmailPass) {
    console.warn('Gmail credentials (gmailUser and gmailAppPass) are not set in database or environment. Simulating mail send.');
    return res.json({
      success: true,
      simulated: true,
      message: 'El pedido fue procesado. Como no se ha configurado la cuenta emisora en los Ajustes del panel de control, el envío de correos real por Gmail fue simulado con éxito.'
    });
  }

  try {
    // Configure Gmail SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // Build the items list in HTML
    const itemsHtml = items.map((item: any) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px 0; font-family: sans-serif; font-size: 14px; color: #333;">
          <strong>${item.title}</strong>
        </td>
        <td style="padding: 10px 0; font-family: monospace; font-size: 14px; text-align: center; color: #555;">
          x${item.quantity}
        </td>
        <td style="padding: 10px 0; font-family: monospace; font-size: 14px; text-align: right; color: #111; font-weight: bold;">
          $${((item.price || 0) * item.quantity).toFixed(2)} USD
        </td>
      </tr>
    `).join('');

    // --- HTML Template for ADMINISTRATOR ---
    const adminMailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1dec9; border-radius: 12px; background-color: #faf9f5;">
        <div style="text-align: center; border-bottom: 2px solid #5f6f52; padding-bottom: 15px;">
          <h2 style="color: #4f6f52; font-style: italic; margin: 10px 0 0 0;">Literatura Ecuador</h2>
          <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10px; font-weight: bold; color: #a67b5b; margin: 5px 0 0 0;">Notificación de Nuevo Pedido</p>
        </div>
        
        <div style="padding: 20px 0;">
          <p style="font-size: 14px; color: #444; line-height: 1.5;">
            Estimado Administrador, se ha registrado un nuevo pedido a través de la aplicación.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <tr>
              <td style="padding: 12px; font-size: 13px; color: #7e7a69; width: 140px; font-weight: bold;">Código de Pedido:</td>
              <td style="padding: 12px; font-size: 13px; color: #111; font-family: monospace; font-weight: bold;">${orderId}</td>
            </tr>
            <tr style="border-top: 1px solid #f4f3ed;">
              <td style="padding: 12px; font-size: 13px; color: #7e7a69; font-weight: bold;">Cliente:</td>
              <td style="padding: 12px; font-size: 13px; color: #111;">${customerName}</td>
            </tr>
            <tr style="border-top: 1px solid #f4f3ed;">
              <td style="padding: 12px; font-size: 13px; color: #7e7a69; font-weight: bold;">Correo de Usuario:</td>
              <td style="padding: 12px; font-size: 13px; color: #111;">${customerEmail}</td>
            </tr>
            <tr style="border-top: 1px solid #f4f3ed;">
              <td style="padding: 12px; font-size: 13px; color: #7e7a69; font-weight: bold;">Fecha del Pedido:</td>
              <td style="padding: 12px; font-size: 13px; color: #111;">${orderDate}</td>
            </tr>
          </table>

          <h3 style="color: #4f6f52; font-size: 15px; border-bottom: 1px solid #e1dec9; padding-bottom: 8px; margin-top: 25px;">Detalle de Libros</h3>
          <table style="width: 100%; margin-top: 10px;">
            <thead>
              <tr style="border-bottom: 2px solid #eee; text-align: left;">
                <th style="padding-bottom: 8px; font-size: 12px; color: #777;">Libro / Título</th>
                <th style="padding-bottom: 8px; font-size: 12px; color: #777; text-align: center; width: 60px;">Cant.</th>
                <th style="padding-bottom: 8px; font-size: 12px; color: #777; text-align: right; width: 100px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 25px; padding: 15px; background-color: #f4f3ed; border-radius: 8px; text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #7e7a69; font-weight: bold;">Total Cantidad: <span style="font-family: monospace; font-size: 13px; color: #333;">${totalQuantity} uds.</span></p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #4f6f52; font-weight: bold;">Monto Total a Cobrar: <span style="color: #7a4b13; font-family: monospace; font-size: 18px;">$${totalPayable.toFixed(2)} USD</span></p>
          </div>
        </div>

        <div style="border-top: 1px solid #e1dec9; padding-top: 15px; text-align: center; font-size: 11px; color: #7e7a69;">
          <p style="margin: 0;">Este es un mensaje generado automáticamente por Literatura Ecuador.</p>
        </div>
      </div>
    `;

    // --- HTML Template for CUSTOMER ---
    const customerMailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #5f6f52; padding-bottom: 15px; background-color: #f8fafc; margin: -20px -20px 20px -20px; padding-top: 20px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #4f6f52; font-style: italic; margin: 5px 0 0 0;">Literatura Ecuador</h2>
          <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10px; font-weight: bold; color: #5f6f52; margin: 5px 0 5px 0;">Confirmación del Pedido</p>
        </div>
        
        <div style="padding: 10px 0;">
          <p style="font-size: 15px; font-weight: bold; color: #1e293b;">¡Gracias por tu pedido, ${customerName}!</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            Hemos recibido correctamente tu solicitud de libros en Literatura Ecuador. A continuación encontrarás los detalles de tu reserva en nuestro catálogo:
          </p>
          
          <div style="padding: 15px; border-left: 4px solid #5f6f52; background-color: #f8fafc; margin: 15px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Código de Reserva:</strong> <span style="font-family: monospace; font-weight: bold; color: #0f172a;">${orderId}</span></p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;"><strong>Fecha de Solicitud:</strong> ${orderDate}</p>
          </div>

          <h3 style="color: #4f6f52; font-size: 15px; border-bottom: 1px solid #e1dec9; padding-bottom: 8px; margin-top: 20px;">Tu Lista de Libros</h3>
          <table style="width: 100%; margin-top: 10px;">
            <thead>
              <tr style="border-bottom: 2px solid #eee; text-align: left;">
                <th style="padding-bottom: 8px; font-size: 12px; color: #777;">Libro / Título</th>
                <th style="padding-bottom: 8px; font-size: 12px; color: #777; text-align: center; width: 60px;">Cant.</th>
                <th style="padding-bottom: 8px; font-size: 12px; color: #777; text-align: right; width: 100px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 25px; padding: 15px; background-color: #f1f5f9; border-radius: 8px; text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #475569; font-weight: bold;">Total Cantidad: <span style="font-family: monospace; font-size: 13px; color: #0f172a;">${totalQuantity} uds.</span></p>
            <p style="margin: 5px 0 0 0; font-size: 15px; color: #4f6f52; font-weight: bold;">Monto Estimado: <span style="font-family: monospace; font-size: 17px; color: #7a4b13;">$${totalPayable.toFixed(2)} USD</span></p>
          </div>

          <div style="margin-top: 25px; padding: 15px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #fafbfd; text-align: center;">
            <p style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">¿Cuáles son las siguientes etapas?</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #475569; line-height: 1.5;">
              Un administrador revisará su solicitud y se pondrá en contacto con usted a través de este correo electrónico para coordinar el pago, el retiro físico o el envío de sus libros.
            </p>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8; margin-top: 25px;">
          <p style="margin: 0;">Literatura Ecuador • Viviendo el Flujo de la Palabra de Vida</p>
        </div>
      </div>
    `;

    // 1. Send email to ADMINISTRATOR
    const mailOptionsAdmin = {
      from: `"Literatura Ecuador" <${gmailUser}>`,
      to: adminEmail,
      subject: `[NUEVO PEDIDO] Reserva #${orderId} - ${customerName}`,
      html: adminMailHtml
    };
    await transporter.sendMail(mailOptionsAdmin);

    // 2. Send email to CUSTOMER (if a valid email is linked)
    if (userEmail && userEmail.trim().includes('@')) {
      const mailOptionsCustomer = {
        from: `"Literatura Ecuador" <${gmailUser}>`,
        to: userEmail.trim(),
        subject: `Confirmación de Pedido - Literatura Ecuador (Reserva #${orderId})`,
        html: customerMailHtml
      };
      await transporter.sendMail(mailOptionsCustomer);
    }

    return res.json({
      success: true,
      message: 'Los correos de notificación de pedido fueron enviados correctamente vía Gmail.'
    });

  } catch (error: any) {
    console.error('Error sending order notification email:', error);
    return res.status(500).json({
      success: false,
      errorCode: error.code || 'UNKNOWN_ERROR',
      message: `Error al enviar correo por Gmail: ${error.message}`
    });
  }
});

// Configure Vite or Serve static assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development mode with Vite Dev Server Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Running development server with Vite middleware.');
  } else {
    // Production Mode: serve compiled files from 'dist' folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Running production server serving static dist folder.');
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
