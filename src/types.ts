export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  coverColor: string; // Tailwind bg color class, e.g., 'bg-amber-600'
  stock: number;
  initialStock: number;
  price: number; // Price in USD ($)
  visible?: boolean; // Show or hide from catalog
  coverImage?: string; // Base64 or URL thumbnail
  discountType?: 'percentage' | 'fixed' | 'none';
  discountValue?: number;
}

export function getEffectivePrice(book: Book): number {
  if (!book.discountType || book.discountType === 'none' || !book.discountValue) {
    return book.price;
  }
  if (book.discountType === 'percentage') {
    const discountPercent = Math.min(100, Math.max(0, book.discountValue));
    return parseFloat((book.price * (1 - discountPercent / 100)).toFixed(2));
  }
  if (book.discountType === 'fixed') {
    return Math.max(0, parseFloat((book.price - book.discountValue).toFixed(2)));
  }
  return book.price;
}

export interface OrderItem {
  bookId: string;
  title: string;
  quantity: number;
  price: number; // Unit price in USD ($)
}

export interface Order {
  id: string;
  firstName: string;
  lastName: string;
  orderDate: string;
  items: OrderItem[];
  totalTitles: number;
  totalQuantity: number;
  totalPayable: number; // Total price in USD ($)
  userEmail?: string; // Optional linked user email
}

export interface StockNotification {
  id: string;
  bookId: string;
  bookTitle: string;
  timestamp: string;
  type: 'depleted' | 'restocked' | 'low_stock';
  read: boolean;
  stockLeft?: number;
}

export interface AdminUserConfig {
  email: string;
  username: string;
  password?: string;
  role: 'administrador' | 'desarrollador';
}

export interface LayoutDesignConfig {
  headerTitle: string;
  headerSubtitle: string;
  heroTitle: string;
  heroSubtitle: string;
  
  // Google Sheets configuration to load books
  googleSheetsUrl?: string;
  googleSheetsAutoSync?: boolean;
  
  // colors
  colorPrimary: string;
  colorSecondary: string;
  colorBg: string;
  colorText: string;
  colorLightBg: string;
  colorBorder: string;
  colorLightBorder: string;
  colorAccentBorder: string;
  colorTerracotta: string;
  colorCardBg: string;
  
  // typography
  fontSans: string;
  fontSerif: string;
  fontSizeBase: 'small' | 'standard' | 'large';
  
  // shapes
  borderRadiusBase: 'square' | 'soft' | 'medium' | 'large' | 'organic';

  // custom stock warning threshold and grid columns configuration
  lowStockThreshold?: number;
  columnsDesktop?: number;
  columnsTablet?: number;
  columnsMobile?: number;

  // Sizes in pixels (number)
  itemTitleSize?: number;
  itemPriceSize?: number;
  itemAuthorSize?: number;
  itemStockSize?: number;

  headerLogoSize?: number;
  headerTitleSize?: number;
  headerIconSize?: number;

  // Custom heading & paragraph font sizes in pixels
  fontSizeH1?: number;
  fontSizeH2?: number;
  fontSizeH3?: number;
  fontSizeH4?: number;
  fontSizeH5?: number;
  fontSizeParagraph?: number;

  // Custom footer text and spacing between item cards
  footerText?: string;
  itemSpacing?: 'narrow' | 'medium' | 'large';

  // Gestión de correos y ventanas (Customizable text/greetings)
  textRegisterSuccessEmail?: string;
  textRegisterSuccessNoAuth?: string;
  textVerificationRequiredTitle?: string;
  textVerificationRequiredSalutation?: string;
  textVerificationRequiredInstructions?: string;
  textVerificationRequiredCheckBtn?: string;
  textVerificationRequiredResendBtn?: string;
  textVerificationRequiredCancelBtn?: string;
  textWelcomeSubtextLogin?: string;
  textWelcomeSubtextRegister?: string;
  textWelcomeSubtextForgot?: string;

  // Gmail SMTP Configurations for Orders
  gmailUser?: string;
  gmailAppPass?: string;
  adminEmail?: string;

  // Admin Panel and User Management Access Control
  adminUsers?: AdminUserConfig[];
}

export const defaultDesignConfig: LayoutDesignConfig = {
  headerTitle: 'Servicio de Literatura Ecuador',
  headerSubtitle: 'Solicitud de Compras',
  heroTitle: 'Servicio de Literatura Ecuador',
  heroSubtitle: '',
  
  googleSheetsUrl: '',
  googleSheetsAutoSync: false,
  
  // default palette matching natural theme
  colorPrimary: '#5F6F52',
  colorSecondary: '#8C8979',
  colorBg: '#FDFCF8',
  colorText: '#3D3D33',
  colorLightBg: '#F4F1E8',
  colorBorder: '#E6E2D3',
  colorLightBorder: '#EEEADD',
  colorAccentBorder: '#DEDAC5',
  colorTerracotta: '#A67B5B',
  colorCardBg: '#FFFFFF',
  
  fontSans: 'Inter',
  fontSerif: 'Libre Baskerville',
  fontSizeBase: 'standard',
  borderRadiusBase: 'organic',

  // defaults for stock threshold and columns configurations
  lowStockThreshold: 10,
  columnsDesktop: 4,
  columnsTablet: 2,
  columnsMobile: 2,

  // Default sizes in pixels
  itemTitleSize: 13,
  itemPriceSize: 15,
  itemAuthorSize: 11,
  itemStockSize: 10,

  headerLogoSize: 36,
  headerTitleSize: 14,
  headerIconSize: 14,

  // Default heading & paragraph sizes in pixels
  fontSizeH1: 32,
  fontSizeH2: 24,
  fontSizeH3: 18,
  fontSizeH4: 16,
  fontSizeH5: 14,
  fontSizeParagraph: 13,

  // Default footer and spacing
  footerText: 'Servicio de Literatura Ecuador - Solicitudes de Compra y Pedidos',
  itemSpacing: 'medium',

  // Default values for Gestión de correos y ventanas
  textRegisterSuccessEmail: '¡Registro exitoso! Un enlace de verificación de Firebase fue enviado a tu correo: {email}. Abre el correo y activa tu cuenta para ingresar.',
  textRegisterSuccessNoAuth: '¡Registro exitoso en la base de datos! (Nota: Proveedor de Auth no configurado, acceso directo habilitado).',
  textVerificationRequiredTitle: 'Verificación de Correo Requerida',
  textVerificationRequiredSalutation: 'Hola {name}, hemos enviado un enlace de confirmación a:',
  textVerificationRequiredInstructions: 'Por favor, abre tu bandeja de entrada (revisa también Spam) y haz clic en el botón o enlace enviado para confirmar tu correo.',
  textVerificationRequiredCheckBtn: 'Ya verifiqué mi correo (Comprobar)',
  textVerificationRequiredResendBtn: 'Reenviar Enlace',
  textVerificationRequiredCancelBtn: 'Cancelar',
  textWelcomeSubtextLogin: 'Ingresa tu correo y contraseña para navegar el catálogo y pedir libros',
  textWelcomeSubtextRegister: 'Regístrate gratis para acceder a todos los items de Living Stream Ministry',
  textWelcomeSubtextForgot: 'Ingresa tu correo para validar y actualizar tus datos',
  gmailUser: '',
  gmailAppPass: '',
  adminEmail: 'admin@literatura.ec',
  adminUsers: [
    { email: 'admin1@literatura.ec', username: 'admin', password: 'adminpassword', role: 'administrador' },
    { email: 'admin2@literatura.ec', username: 'admin2', password: 'adminpassword2', role: 'administrador' },
    { email: 'dev@literatura.ec', username: 'developer', password: 'devpassword', role: 'desarrollador' }
  ]
};

export interface SessionUser {
  role: 'guest' | 'customer' | 'admin';
  email?: string;
  name?: string;
  adminRole?: 'administrador' | 'desarrollador';
  password?: string;
  phoneNumber?: string;
  city?: string;
  profilePic?: string;
  isGoogleUser?: boolean;
}


