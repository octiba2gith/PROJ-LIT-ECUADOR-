import React, { useState, useEffect } from 'react';
import { Calendar, User, ShoppingCart, Send, Info, CheckCircle, ArrowLeft, FileDown, Mail, Lock, Eye, EyeOff, UserPlus, KeyRound, Sparkles, UserCheck, RefreshCw, CheckSquare, Share2, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Book, OrderItem, getEffectivePrice, LayoutDesignConfig } from '../types';
import { 
  fetchGlobalUserByEmail, 
  registerGlobalUser,
  registerAuthWithVerification,
  loginWithAuthCheck,
  checkEmailVerifiedStatus,
  resendVerificationEmail
} from '../firebase';

interface CartProps {
  cart: Record<string, number>;
  books: Book[];
  onUpdateQty: (bookId: string, qty: number) => void;
  onRemoveItem: (bookId: string) => void;
  onSubmitOrder: (firstName: string, lastName: string, orderDate: string, items: OrderItem[]) => void;
  setView: (view: 'catalog' | 'orders' | 'admin' | 'catalog') => void;
  currentUser?: { role: 'guest' | 'customer' | 'admin'; email?: string; name?: string } | null;
  onUpdateCurrentUser?: (user: { role: 'guest' | 'customer' | 'admin'; email?: string; name?: string } | null) => void;
  designConfig?: LayoutDesignConfig;
}

export const Cart: React.FC<CartProps> = ({
  cart,
  books,
  onUpdateQty,
  onRemoveItem,
  onSubmitOrder,
  setView,
  currentUser,
  onUpdateCurrentUser,
  designConfig,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orderDate, setOrderDate] = useState(() => {
    // Default to current date in YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Automatically pre-fill registered account details if present
  React.useEffect(() => {
    if (currentUser?.role === 'customer' && currentUser.name) {
      const names = currentUser.name.trim().split(/\s+/);
      if (names.length > 0) {
        setFirstName(names[0]);
        if (names.length > 1) {
          setLastName(names.slice(1).join(' '));
        } else {
          setLastName('');
        }
      }
    }
  }, [currentUser]);

  // Guest Checkout Checkpoint Authentication States
  const [isAuthCheckpointOpen, setIsAuthCheckpointOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);
  
  const [isOrdered, setIsOrdered] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    totalTitles: number;
    totalQty: number;
    totalPayable: number;
    date: string;
    items: { title: string; quantity: number; price: number }[];
  } | null>(null);

  // Convert the cart records to structured cart items
  const cartItems = Object.entries(cart)
    .map(([bookId, quantity]) => {
      const book = books.find((b) => b.id === bookId);
      return {
        book,
        bookId,
        quantity: quantity as number,
      };
    })
    .filter((item) => item.book !== undefined && item.quantity > 0) as {
    book: Book;
    bookId: string;
    quantity: number;
  }[];

  const totalTitles = cartItems.length;
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Check if we can submit (form validates)
  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    orderDate.length > 0 &&
    cartItems.length > 0;

  // Verify stock levels before actual checkout
  const stockErrors: string[] = [];
  cartItems.forEach((item) => {
    if (item.quantity > item.book.stock) {
      stockErrors.push(
        `El libro «${item.book.title}» solo tiene ${item.book.stock} unidades en existencia. Has pedido ${item.quantity}.`
      );
    }
  });

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || stockErrors.length > 0) return;

    if (currentUser?.role === 'guest') {
      setAuthError('');
      setAuthSuccess('');
      setIsAuthCheckpointOpen(true);
      return;
    }

    const itemsToSubmit: OrderItem[] = cartItems.map((item) => ({
      bookId: item.bookId,
      title: item.book.title,
      quantity: item.quantity,
      price: getEffectivePrice(item.book), // unit price
    }));

    onSubmitOrder(firstName, lastName, orderDate, itemsToSubmit);

    const totalPayable = cartItems.reduce((acc, item) => acc + (getEffectivePrice(item.book) * item.quantity), 0);

    // Save details to display a beautiful congratulations confirmation
    setLastOrderDetails({
      id: `PED-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      firstName,
      lastName,
      totalTitles,
      totalQty: totalQuantity,
      totalPayable,
      date: orderDate,
      items: itemsToSubmit,
    });
    
    // Clear state
    setFirstName('');
    setLastName('');
    setIsOrdered(true);
  };

  const handleCheckpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!authEmail.trim() || !authEmail.trim().includes('@')) {
      setAuthError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (authPassword.length < 3) {
      setAuthError('La contraseña debe tener al menos 3 caracteres.');
      return;
    }

    setIsAuthChecking(true);

    try {
      if (authMode === 'register') {
        if (!authName.trim()) {
          setAuthError('Por favor ingresa tu nombre completo.');
          setIsAuthChecking(false);
          return;
        }

        if (authPassword !== authConfirmPassword) {
          setAuthError('Las contraseñas no coinciden.');
          setIsAuthChecking(false);
          return;
        }

        // Try registering via actual Firebase Auth
        try {
          const fbUser = await registerAuthWithVerification(authName.trim(), authEmail, authPassword);
          if (fbUser) {
            const template = designConfig?.textRegisterSuccessEmail ?? '¡Cuenta de usuario creada! Enviamos un correo de confirmación de Firebase.';
            setAuthSuccess(template.replace('{email}', authEmail));
            setAwaitingVerification(true);
            setIsAuthChecking(false);
            return;
          }
        } catch (authError: any) {
          console.warn("Firebase Auth registration failed or provider not enabled, trying Firestore fallback.", authError);
          if (authError.code === 'auth/email-already-in-use') {
            setAuthError('Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión.');
            setIsAuthChecking(false);
            return;
          }
        }

        // Firestore general fallback
        const cloudUser = await fetchGlobalUserByEmail(authEmail);
        if (cloudUser) {
          setAuthError('Este correo electrónico ya se encuentra registrado. Intenta iniciar sesión.');
          setIsAuthChecking(false);
          return;
        }

        const newUser = {
          name: authName.trim(),
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
        };

        await registerGlobalUser(newUser);

        // Sync list to local registered users
        const savedUsersRaw = localStorage.getItem('lib_registered_users');
        let currentLocalUsers = [];
        if (savedUsersRaw) {
          try {
            currentLocalUsers = JSON.parse(savedUsersRaw);
          } catch (err) {}
        }
        const updatedLocalUsers = [...currentLocalUsers.filter((u: any) => u.email.toLowerCase() !== newUser.email), newUser];
        localStorage.setItem('lib_registered_users', JSON.stringify(updatedLocalUsers));

        const templateNoAuth = designConfig?.textRegisterSuccessNoAuth ?? '¡Cuenta registrada con éxito!';
        setAuthSuccess(templateNoAuth);
        
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser({
            role: 'customer',
            email: newUser.email,
            name: newUser.name,
          });
        }

        const names = newUser.name.trim().split(/\s+/);
        if (names.length > 0) {
          setFirstName(names[0]);
          if (names.length > 1) {
            setLastName(names.slice(1).join(' '));
          }
        }

        setTimeout(() => {
          setIsAuthCheckpointOpen(false);
        }, 1200);

      } else {
        // Login mode
        try {
          const fbUser = await loginWithAuthCheck(authEmail, authPassword);
          if (fbUser) {
            if (!fbUser.emailVerified) {
              setAwaitingVerification(true);
              setAuthSuccess(`Tu cuenta requiere verificar tu correo electrónico para continuar.`);
              setIsAuthChecking(false);
              return;
            }

            // Sync
            setAuthSuccess('¡Sesión iniciada con éxito!');
            if (onUpdateCurrentUser) {
              onUpdateCurrentUser({
                role: 'customer',
                email: fbUser.email || authEmail,
                name: fbUser.displayName || authName || 'Lector',
              });
            }

            const names = (fbUser.displayName || authName || 'Lector').trim().split(/\s+/);
            if (names.length > 0) {
              setFirstName(names[0]);
              if (names.length > 1) {
                setLastName(names.slice(1).join(' '));
              }
            }

            setTimeout(() => {
              setIsAuthCheckpointOpen(false);
            }, 1200);
            return;
          }
        } catch (authErr: any) {
          console.warn("Firebase Auth login failed, trying fallback check.", authErr);
        }

        // Firestore check
        const cloudUser = await fetchGlobalUserByEmail(authEmail);
        if (cloudUser && cloudUser.password === authPassword) {
          setAuthSuccess('¡Sesión iniciada con éxito!');
          
          if (onUpdateCurrentUser) {
            onUpdateCurrentUser({
              role: 'customer',
              email: cloudUser.email,
              name: cloudUser.name,
            });
          }

          const names = cloudUser.name.trim().split(/\s+/);
          if (names.length > 0) {
            setFirstName(names[0]);
            if (names.length > 1) {
              setLastName(names.slice(1).join(' '));
            }
          }

          setTimeout(() => {
            setIsAuthCheckpointOpen(false);
          }, 1200);

        } else {
          // Check local fallback
          const savedUsersRaw = localStorage.getItem('lib_registered_users');
          let currentLocalUsers = [];
          if (savedUsersRaw) {
            try {
              currentLocalUsers = JSON.parse(savedUsersRaw);
            } catch (err) {}
          }
          const foundLocal = currentLocalUsers.find(
            (u: any) => u.email.toLowerCase() === authEmail.trim().toLowerCase() && u.password === authPassword
          );

          if (foundLocal) {
            setAuthSuccess('¡Sesión iniciada con éxito!');
            
            if (onUpdateCurrentUser) {
              onUpdateCurrentUser({
                role: 'customer',
                email: foundLocal.email,
                name: foundLocal.name,
              });
            }

            const names = foundLocal.name.trim().split(/\s+/);
            if (names.length > 0) {
              setFirstName(names[0]);
              if (names.length > 1) {
                setLastName(names.slice(1).join(' '));
              }
            }

            setTimeout(() => {
              setIsAuthCheckpointOpen(false);
            }, 1200);
          } else {
            setAuthError('Correo o contraseña incorrectos.');
          }
        }
      }
    } catch (err: any) {
      setAuthError('Error al procesar autenticación: ' + err.message);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleDownloadFile = () => {
    if (!lastOrderDetails) return;
    
    const sep = "========================================================\n";
    const subsep = "--------------------------------------------------------\n";
    
    let text = "";
    text += sep;
    text += "            SERVICIO DE LITERATURA ECUADOR\n";
    text += "           COMPROBANTE DE SOLICITUD DE COMPRA\n";
    text += sep;
    text += `Código de Reserva : ${lastOrderDetails.id}\n`;
    text += `Cliente           : ${lastOrderDetails.firstName} ${lastOrderDetails.lastName}\n`;
    text += `Fecha de Pedido   : ${new Date(lastOrderDetails.date).toLocaleDateString()}\n`;
    text += sep;
    text += "DESCRIPCIÓN DE ARTÍCULOS:\n";
    text += subsep;
    text += "Título del Libro                         Cant  Unit     Total \n";
    text += subsep;
    
    lastOrderDetails.items.forEach((item) => {
      const displayTitle = item.title.padEnd(40, '.').substring(0, 40);
      const displayQty = item.quantity.toString().padStart(4, ' ');
      const displayPrice = `$${item.price.toFixed(2)}`.padStart(7, ' ');
      const displayTotal = `$${(item.price * item.quantity).toFixed(2)}`.padStart(9, ' ');
      text += `${displayTitle} ${displayQty} ${displayPrice} ${displayTotal}\n`;
    });
    
    text += subsep;
    text += `Total de Títulos Distintos : ${lastOrderDetails.totalTitles}\n`;
    text += `Volumen Total de Copias    : ${lastOrderDetails.totalQty} unidades\n`;
    text += sep;
    text += `TOTAL A PAGAR (USD)        : $${lastOrderDetails.totalPayable.toFixed(2)} USD\n`;
    text += sep;
    text += "\n* Las transacciones se realizan en la moneda oficial: Dólares Americanos ($)\n";
    text += "* Gracias por elegir el Servicio de Literatura Ecuador.\n";
    text += sep;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comprobante_${lastOrderDetails.firstName}_${lastOrderDetails.lastName}_${lastOrderDetails.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!lastOrderDetails) return;
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Background Accent Rectangle on Header
      doc.setFillColor(248, 250, 252); // soft slate
      doc.rect(10, 10, 190, 40, 'F');
      
      // Header border
      doc.setDrawColor(79, 111, 82);
      doc.setLineWidth(1);
      doc.line(10, 10, 200, 10);
      
      // Brand Name
      doc.setTextColor(79, 111, 82);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text("LITERATURA ECUADOR", 15, 23);
      
      // Document Title
      doc.setTextColor(166, 123, 91); // #a67b5b
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text("COMPROBANTE DE SOLICITUD DE PEDIDO", 15, 30);
      
      // Company tagline or info
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text("Ecuador • Servicio de Literatura LSM", 15, 35);
      
      // Order Code Box on the Header Right
      doc.setFillColor(79, 111, 82);
      doc.rect(140, 15, 55, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("CÓDIGOS DE RESERVA", 142, 19);
      doc.setFontSize(10);
      doc.text(lastOrderDetails.id, 142, 24);
      
      // Info Title
      doc.setTextColor(79, 111, 82);
      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.text("INFORMACIÓN DEL PEDIDO", 10, 60);
      doc.line(10, 62, 200, 62);
      
      // Customer details metadata
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.text("Cliente / Lector:", 10, 70);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${lastOrderDetails.firstName} ${lastOrderDetails.lastName}`, 45, 70);
      
      doc.setFont('Helvetica', 'bold');
      doc.text("Fecha del Pedido:", 10, 76);
      doc.setFont('Helvetica', 'normal');
      doc.text(new Date(lastOrderDetails.date).toLocaleDateString(), 45, 76);

      doc.setFont('Helvetica', 'bold');
      doc.text("Moneda de Transacción:", 10, 82);
      doc.setFont('Helvetica', 'normal');
      doc.text("Dólares Americanos ($ USD)", 45, 82);
      
      // Table Header of Items
      doc.setFillColor(244, 243, 237); // match #f4f3ed sand tone
      doc.rect(10, 92, 190, 8, 'F');
      
      doc.setTextColor(79, 111, 82);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("Título del Libro", 12, 97.5);
      doc.text("Cant.", 145, 97.5);
      doc.text("P. Unit", 160, 97.5);
      doc.text("Subtotal", 185, 97.5);
      
      let currentY = 106;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9.5);
      
      // Table detail rows
      lastOrderDetails.items.forEach((item) => {
        // Handle long title truncations in PDF
        const titleStr = item.title.length > 55 ? item.title.substring(0, 52) + "..." : item.title;
        doc.text(titleStr, 12, currentY);
        doc.text(`x${item.quantity}`, 145, currentY);
        doc.text(`$${item.price.toFixed(2)}`, 160, currentY);
        doc.text(`$${(item.price * item.quantity).toFixed(2)}`, 185, currentY);
        
        // Draw very thin separator line
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.15);
        doc.line(10, currentY + 3, 200, currentY + 3);
        
        currentY += 8;
      });
      
      // Grand total recap container box
      currentY += 4;
      doc.setFillColor(248, 250, 252);
      doc.rect(110, currentY, 90, 20, 'F');
      doc.setDrawColor(79, 111, 82);
      doc.setLineWidth(0.5);
      doc.rect(110, currentY, 90, 20, 'D');
      
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`Total Títulos Distintos: ${lastOrderDetails.totalTitles}`, 115, currentY + 6);
      doc.text(`Volumen Total Copias: ${lastOrderDetails.totalQty} unidades`, 115, currentY + 11);
      
      doc.setTextColor(79, 111, 82);
      doc.setFontSize(11);
      doc.text("TOTAL NETO:", 115, currentY + 16);
      doc.setTextColor(122, 75, 19); // amber terracotta
      doc.setFontSize(12);
      doc.text(`$${lastOrderDetails.totalPayable.toFixed(2)} USD`, 165, currentY + 16);
      
      // Footer guidelines
      currentY += 32;
      doc.setFillColor(244, 243, 237);
      doc.rect(10, currentY, 190, 18, 'F');
      doc.setTextColor(79, 111, 82);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("¿CUÁLES SON LAS SIGUIENTES ETAPAS?", 15, currentY + 6);
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text("El administrador revisará tu solicitud y se pondrá en contacto contigo para coordinar el pago,", 15, currentY + 11);
      doc.text("el retiro físico de tus libros originales o la coordinación del envío del pedido.", 15, currentY + 14);
      
      // Brand Watermark signature
      currentY += 26;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Literatura Ecuador • Viviendo el Flujo de la Palabra de Vida", 105, currentY, { align: 'center' });
      doc.text("Comprobante oficial no fiscal generado digitalmente.", 105, currentY + 4, { align: 'center' });

      // Save PDF
      doc.save(`Pedido_LiteraturaEcuador_${lastOrderDetails.firstName}_${lastOrderDetails.id}.pdf`);
    } catch (e: any) {
      console.error("PDF generation failure:", e);
      alert("No se pudo generar el archivo de forma local en formato PDF. Por favor descargue la versión .txt.");
    }
  };

  const handleShareWhatsApp = () => {
    if (!lastOrderDetails) return;
    
    const sep = "---------------------------------------------";
    let text = `*LITERATURA ECUADOR - DETALLE DE RESERVA* 📚\n`;
    text += `${sep}\n`;
    text += `*Código de Reserva:* ${lastOrderDetails.id}\n`;
    text += `*Cliente:* ${lastOrderDetails.firstName} ${lastOrderDetails.lastName}\n`;
    text += `*Fecha del Pedido:* ${new Date(lastOrderDetails.date).toLocaleDateString()}\n`;
    text += `${sep}\n`;
    text += `*Libros Pedidos:*\n`;
    
    lastOrderDetails.items.forEach((item) => {
      text += `• _${item.title}_ (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)} USD\n`;
    });
    
    text += `${sep}\n`;
    text += `*Total de Copias:* ${lastOrderDetails.totalQty}\n`;
    text += `*MONTO ESTIMADO TOTAL:* *$${lastOrderDetails.totalPayable.toFixed(2)} USD*\n`;
    text += `${sep}\n`;
    text += `_Este mensaje fue generado automáticamente desde Literatura Ecuador._`;
    
    const encodedText = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank', 'noreferrer,noopener');
  };

  if (isOrdered && lastOrderDetails) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-natural-border rounded-3xl p-8 text-center shadow-lg space-y-6">
        <div className="w-16 h-16 bg-natural-light-bg text-natural-primary rounded-full flex items-center justify-center mx-auto animate-bounce border border-natural-accent-border">
          <CheckCircle className="w-9 h-9" />
        </div>
        
        <div className="space-y-2">
          <h3 className="font-serif italic text-natural-primary text-2xl">¡Solicitud Procesada con Éxito!</h3>
          <p className="text-natural-secondary text-sm text-[13px]">
            Muchas gracias <span className="font-semibold text-natural-text">{lastOrderDetails.firstName} {lastOrderDetails.lastName}</span>.
            Tu pedido ha sido registrado para la venta y se encuentra listo.
          </p>
          <div className="flex items-center gap-2 justify-center text-xs text-[#4D623F] bg-[#FAF9F5] border border-[#E1DEC9] py-2.5 px-3.5 rounded-xl mt-3 max-w-md mx-auto font-medium shadow-2xs">
            <Mail className="w-4 h-4 text-emerald-700 shrink-0 animate-pulse" />
            <span>Notificación de pedido despachada por Gmail de forma automática al administrador y al lector.</span>
          </div>
        </div>

        {/* Receipt Recap Container */}
        <div className="bg-natural-light-bg/55 rounded-3xl p-5 border border-natural-border text-left space-y-3.5">
          <h4 className="text-xs font-bold text-natural-secondary uppercase tracking-widest border-b border-natural-border pb-2">Resumen de la Solicitud</h4>
          <div className="grid grid-cols-2 gap-4 text-xs font-sans">
            <div>
              <p className="text-natural-secondary">Comprador:</p>
              <p className="font-bold text-natural-text mt-0.5">{lastOrderDetails.firstName} {lastOrderDetails.lastName}</p>
            </div>
            <div>
              <p className="text-natural-secondary">Fecha de Compra:</p>
              <p className="font-bold text-natural-text mt-0.5">
                {new Date(lastOrderDetails.date).toLocaleDateString([], {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-natural-secondary">Títulos:</p>
              <p className="font-bold text-natural-text mt-0.5">{lastOrderDetails.totalTitles} títulos</p>
            </div>
            <div>
              <p className="text-natural-secondary">Cantidad ej.:</p>
              <p className="font-bold text-natural-primary mt-0.5">{lastOrderDetails.totalQty} unidades</p>
            </div>
            <div className="col-span-2 border-t border-natural-border pt-3 mt-1 flex justify-between items-center text-sm">
              <span className="font-bold text-natural-primary">TOTAL NETO EN USD ($):</span>
              <span className="font-serif italic font-bold text-xl text-natural-terracotta">${lastOrderDetails.totalPayable.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* Action downloads & navigation buttons */}
        <div className="space-y-3.5 pt-2">
          {/* Download as PDF */}
          <button
            onClick={handleDownloadPDF}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-800 hover:bg-emerald-850 text-white rounded-2xl text-sm font-extrabold shadow-md transition-all cursor-pointer"
          >
            <FileText className="w-5 h-5 text-emerald-100" />
            Descargar Comprobante en PDF (Recomendado)
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Share to WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Compartir a WhatsApp
            </button>

            {/* Legacy Text fallback */}
            <button
              onClick={handleDownloadFile}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-natural-light-bg hover:bg-natural-accent-border/30 text-natural-primary border border-natural-border/60 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            >
              <FileDown className="w-4 h-4" />
              Descargar archivo (.txt)
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setIsOrdered(false);
                setLastOrderDetails(null);
                setView('catalog');
              }}
              className="flex-1 px-5 py-3 bg-natural-primary hover:opacity-95 text-white rounded-2xl text-sm font-semibold shadow-xs transition-all duration-200 cursor-pointer"
            >
              Seguir Comprando
            </button>
            
            <button
              onClick={() => {
                setIsOrdered(false);
                setLastOrderDetails(null);
                setView('orders');
              }}
              className="flex-1 px-5 py-3 bg-natural-light-bg hover:bg-[#EEEADD] text-natural-primary rounded-2xl text-sm font-semibold border border-natural-border transition-all duration-200 cursor-pointer"
            >
              Historial de Compras
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setView('catalog')}
          className="p-2 hover:bg-natural-light-bg rounded-lg text-natural-secondary hover:text-natural-primary transition-colors flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-natural-secondary uppercase tracking-widest">Resumen del Pedido / Solicitud</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Listing */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-natural-border p-6 shadow-sm">
            <h3 className="font-serif italic text-lg text-natural-primary flex items-center gap-2 pb-4 border-b border-natural-light-border mb-4">
              <ShoppingCart className="w-5 h-5 text-natural-primary" />
              Tus Selección ({totalTitles} {totalTitles === 1 ? 'libro' : 'libros'})
            </h3>

            {cartItems.length === 0 ? (
              <div className="p-12 text-center text-natural-secondary">
                <p className="text-sm font-medium">Tu carrito está vacío</p>
                <p className="text-xs mt-1">Explora nuestro catálogo y selecciona las unidades deseadas.</p>
                <button
                  onClick={() => setView('catalog')}
                  className="mt-4 px-4 py-2 bg-natural-primary hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Explorar catálogo
                </button>
              </div>
            ) : (
              <div className="divide-y divide-natural-light-border/60">
                {cartItems.map((item) => (
                  <div key={item.bookId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-4 items-center">
                      <div className={`w-12 h-16 bg-gradient-to-br ${item.book.coverColor} rounded-lg shadow-xs shrink-0 flex items-center justify-center text-white p-1 text-center`}>
                        <span className="text-[6.5px] font-bold line-clamp-2 uppercase leading-none">{item.book.title}</span>
                      </div>
                      <div>
                        <h4 className="font-serif italic text-sm text-natural-primary">{item.book.title}</h4>
                        <p className="text-xs text-natural-secondary">{item.book.author}</p>
                        <p className="text-[10px] text-natural-secondary mt-1">
                          Precio: {item.book.discountType && item.book.discountType !== 'none' && item.book.discountValue ? (
                            <>
                              <span className="font-bold text-natural-primary">${getEffectivePrice(item.book).toFixed(2)} USD</span>
                              <span className="line-through text-[9px] text-gray-400 font-mono ml-1">${item.book.price?.toFixed(2)} USD</span>
                            </>
                          ) : (
                            <span className="font-bold text-natural-primary">${item.book.price?.toFixed(2)} USD</span>
                          )}
                          <span className="mx-2 text-natural-border">•</span>
                          Stock: <span className="font-medium text-natural-secondary">{item.book.stock} u.</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6">
                      <div className="text-right">
                        <span className="text-[10px] text-natural-secondary block text-right leading-none mb-1">Subtotal</span>
                        <span className="font-mono text-xs font-bold text-natural-primary">${(getEffectivePrice(item.book) * item.quantity).toFixed(2)} USD</span>
                      </div>

                      <div className="flex items-center bg-natural-light-bg/40 border border-natural-accent-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => onUpdateQty(item.bookId, item.quantity - 1)}
                          className="px-2.5 py-1.5 text-natural-primary hover:bg-natural-light-bg transition-colors font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="px-3 font-semibold text-xs text-natural-text">
                          {item.quantity}
                        </span>
                        <button
                          disabled={item.quantity >= item.book.stock}
                          onClick={() => onUpdateQty(item.bookId, item.quantity + 1)}
                          className={`px-2.5 py-1.5 font-bold text-xs transition-colors ${
                            item.quantity >= item.book.stock
                              ? 'text-natural-secondary/30 cursor-not-allowed bg-natural-light-bg/45'
                              : 'text-natural-primary hover:bg-natural-light-bg'
                          }`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.bookId)}
                        className="text-xs text-natural-terracotta hover:opacity-85 transition-colors font-medium border-l border-natural-light-border pl-4 cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert Warnings if stock changes or defaults are exceeded */}
          {stockErrors.length > 0 && (
            <div className="bg-natural-alert-bg border border-dashed border-natural-accent-border rounded-3xl p-5 flex gap-3 text-natural-alert-text text-xs">
              <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-natural-alert-text" />
              <div className="space-y-1 font-medium">
                <p className="font-bold">Ajuste de inventario requerido:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {stockErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* User Information & Confirmation Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleCheckout} className="bg-white rounded-3xl border border-natural-border p-6 shadow-sm space-y-5 sticky top-6">
            <h3 className="font-serif italic text-natural-primary border-b border-natural-light-border pb-3 text-base">Datos del Solicitante</h3>

            {/* First Name */}
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="text-xs font-bold text-natural-secondary uppercase tracking-wider block">Nombre</label>
              <div className="relative">
                <input
                  type="text"
                  id="firstName"
                  required
                  placeholder="Ej. Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-sm text-natural-text transition-all placeholder:text-natural-secondary bg-natural-light-bg/25 focus:bg-white"
                />
                <User className="w-4 h-4 text-natural-secondary absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <label htmlFor="lastName" className="text-xs font-bold text-natural-secondary uppercase tracking-wider block">Apellido</label>
              <div className="relative">
                <input
                  type="text"
                  id="lastName"
                  required
                  placeholder="Ej. Pérez"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-sm text-natural-text transition-all placeholder:text-natural-secondary bg-natural-light-bg/25 focus:bg-white"
                />
                <User className="w-4 h-4 text-natural-secondary absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Date of Request */}
            <div className="space-y-1.5">
              <label htmlFor="orderDate" className="text-xs font-bold text-natural-secondary uppercase tracking-wider block">Fecha del Pedido</label>
              <div className="relative">
                <input
                  type="date"
                  id="orderDate"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-sm text-natural-text transition-all bg-natural-light-bg/25 focus:bg-white"
                />
                <Calendar className="w-4 h-4 text-natural-secondary absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="bg-natural-light-bg/40 rounded-2xl p-4 space-y-2 border border-natural-border text-xs">
              <div className="flex justify-between text-natural-secondary">
                <span>Títulos distintos:</span>
                <span className="font-semibold text-natural-text">{totalTitles}</span>
              </div>
              <div className="flex justify-between text-natural-secondary pb-1">
                <span>Volumen total solicitado:</span>
                <span className="font-semibold text-natural-text">{totalQuantity} ejemplares</span>
              </div>
              <div className="flex justify-between text-natural-secondary pb-2 border-b border-natural-light-border">
                <span>Moneda de pago:</span>
                <span className="font-semibold text-natural-text">USD ($ - Ecuador)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-natural-text pt-1">
                <span>Total a Cancelar:</span>
                <span className="text-natural-terracotta font-serif italic text-base">
                  ${cartItems.reduce((acc, item) => acc + (getEffectivePrice(item.book) * item.quantity), 0).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid || stockErrors.length > 0}
              className={`w-full py-3 px-4 rounded-xl text-center font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                isFormValid && stockErrors.length === 0
                  ? 'bg-natural-primary hover:opacity-95 text-white shadow-md'
                  : 'bg-natural-light-bg text-natural-secondary cursor-not-allowed border border-natural-light-border'
              }`}
            >
              <Send className="w-4 h-4" />
              Registrar Solicitud de Compra
            </button>
          </form>
        </div>
      </div>

      {/* 🔐 Guest Checkout Registration Checkpoint Modal */}
      {isAuthCheckpointOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative max-w-md w-full bg-white rounded-3xl border border-natural-border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header / Intro */}
            <div className="text-center space-y-2">
              <div className="inline-flex w-12 h-12 bg-natural-primary rounded-2xl items-center justify-center text-white shadow-lg mb-1">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-serif italic text-xl font-bold text-natural-primary">
                Identificación Requerida
              </h3>
              <p className="text-xs text-natural-secondary leading-relaxed px-2">
                Para registrar tu pedido de forma segura, gestionar tus reservas y consultar tu historial, por favor crea una cuenta o inicia sesión.
              </p>
            </div>

            {/* Error/Success Feedback */}
            {authError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 animate-fade-in">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="p-3 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-200 animate-fade-in">
                {authSuccess}
              </div>
            )}

            {/* Registry / Login Mode Tabs & Form Or Email Link Verification */}
            {awaitingVerification ? (
              <div className="space-y-5 animate-fade-in text-center py-2">
                <div className="inline-flex w-12 h-12 bg-natural-primary/15 rounded-full items-center justify-center text-natural-primary mx-auto font-sans">
                  <Mail className="w-6 h-6 animate-pulse" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-serif italic text-base font-bold text-natural-primary font-bold">
                    {designConfig?.textVerificationRequiredTitle ?? 'Verificación de Correo Requerida'}
                  </h4>
                  <p className="text-[11px] text-[#7A7768] leading-relaxed">
                    {(designConfig?.textVerificationRequiredSalutation ?? 'Hola {name}, hemos enviado un enlace de confirmación a:').replace('{name}', authName || 'Lector')}
                  </p>
                  <div className="my-1.5 py-2 px-3 bg-[#FAF8F2] border border-natural-border rounded-xl inline-block text-xs font-mono font-bold text-natural-primary">
                    {authEmail}
                  </div>
                  <p className="text-[10px] text-natural-secondary leading-normal max-w-xs mx-auto pt-0.5 animate-pulse">
                    {designConfig?.textVerificationRequiredInstructions ?? 'Por favor, abre tu bandeja de entrada (revisa también Spam) y haz clic en el botón o enlace enviado para confirmar tu correo.'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={async () => {
                      setAuthError('');
                      setIsVerifying(true);
                      try {
                        const isVerified = await checkEmailVerifiedStatus();
                        if (isVerified) {
                          setAuthSuccess("¡Correo verificado con éxito!");
                          setAwaitingVerification(false);
                          
                          // Set user
                          if (onUpdateCurrentUser) {
                            onUpdateCurrentUser({
                              role: 'customer',
                              email: authEmail,
                              name: authName || 'Lector',
                            });
                          }

                          const names = (authName || 'Lector').trim().split(/\s+/);
                          if (names.length > 0) {
                            setFirstName(names[0]);
                            if (names.length > 1) {
                              setLastName(names.slice(1).join(' '));
                            }
                          }

                          setTimeout(() => {
                            setIsAuthCheckpointOpen(false);
                          }, 1200);
                        } else {
                          setAuthError("El correo aún no ha sido verificado. Por favor revisa tu correo y haz clic en el enlace.");
                        }
                      } catch (err: any) {
                        setAuthError("Error: " + err.message);
                      } finally {
                        setIsVerifying(false);
                      }
                    }}
                    className="w-full py-3 px-4 bg-natural-primary hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckSquare className="w-4 h-4" />
                    )}
                    {isVerifying ? 'Verificando...' : (designConfig?.textVerificationRequiredCheckBtn ?? 'Ya verifiqué mi correo (Comprobar)')}
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={async () => {
                        setAuthError('');
                        try {
                          await resendVerificationEmail();
                          setAuthSuccess("¡Se ha reenviado el enlace a tu correo!");
                        } catch (err: any) {
                          setAuthError("Error al reenviar enlace: " + err.message);
                        }
                      }}
                      className="py-2.5 px-3 bg-white text-[#7A7768] hover:text-natural-primary text-xs font-bold rounded-xl border border-natural-border cursor-pointer transition-all flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {designConfig?.textVerificationRequiredResendBtn ?? 'Reenviar Enlace'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAwaitingVerification(false);
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className="py-2.5 px-3 bg-white text-natural-terracotta hover:underline text-xs font-bold rounded-xl border border-natural-border cursor-pointer transition-all font-semibold"
                    >
                      {designConfig?.textVerificationRequiredCancelBtn ?? 'Cancelar'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Registry / Login Mode Tabs */}
                <div className="grid grid-cols-2 bg-natural-light-bg p-1 rounded-2xl border border-natural-border font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setAuthError('');
                      setAuthSuccess('');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-white text-natural-primary shadow-xs border border-natural-light-border'
                        : 'text-natural-secondary hover:text-natural-text'
                    }`}
                  >
                    Crear una Cuenta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                      setAuthSuccess('');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-white text-natural-primary shadow-xs border border-natural-light-border'
                        : 'text-natural-secondary hover:text-natural-text'
                    }`}
                  >
                    Inicia Sesión
                  </button>
                </div>

                {/* Auth Form */}
                <form onSubmit={handleCheckpointSubmit} className="space-y-4 font-sans">
                  
                  {/* Full Name (Only register mode) */}
                  {authMode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-natural-secondary block">
                        Nombre Completo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Ej. Juan Pérez"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 bg-natural-light-bg/30 border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-xs text-natural-text focus:bg-white transition-all"
                        />
                        <User className="w-4 h-4 text-natural-secondary absolute left-3.5 top-3" />
                      </div>
                    </div>
                  )}

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-natural-secondary block">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="ejemplo@correo.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-natural-light-bg/30 border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-xs text-natural-text focus:bg-white transition-all"
                      />
                      <Mail className="w-4 h-4 text-natural-secondary absolute left-3.5 top-3" />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-natural-secondary block">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showAuthPassword ? "text" : "password"}
                        required
                        placeholder="Mínimo 3 caracteres"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-natural-light-bg/30 border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-xs text-natural-text focus:bg-white transition-all"
                      />
                      <Lock className="w-4 h-4 text-natural-secondary absolute left-3.5 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        className="absolute right-3 top-2.5 text-natural-secondary hover:text-natural-primary cursor-pointer p-1"
                      >
                        {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Only register mode) */}
                  {authMode === 'register' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-natural-secondary block">
                        Confirmar Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showAuthConfirmPassword ? "text" : "password"}
                          required
                          placeholder="Repite tu contraseña"
                          value={authConfirmPassword}
                          onChange={(e) => setAuthConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-natural-light-bg/30 border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-xs text-natural-text focus:bg-white transition-all"
                        />
                        <Lock className="w-4 h-4 text-natural-secondary absolute left-3.5 top-3" />
                        <button
                          type="button"
                          onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)}
                          className="absolute right-3 top-2.5 text-natural-secondary hover:text-natural-primary cursor-pointer p-1"
                        >
                          {showAuthConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit / Action Buttons */}
                  <div className="space-y-2.5 pt-3">
                    <button
                      type="submit"
                      disabled={isAuthChecking}
                      className="w-full py-3 px-4 bg-natural-primary hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                      {isAuthChecking ? (
                        <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                      ) : authMode === 'register' ? (
                        <UserPlus className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      {isAuthChecking ? 'Procesando...' : authMode === 'register' ? 'Crear Cuenta y Finalizar' : 'Iniciar Sesión y Finalizar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAuthCheckpointOpen(false)}
                      className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100/80 text-natural-secondary text-xs font-bold rounded-xl border border-natural-border cursor-pointer transition-all"
                    >
                      Regresar al Carrito
                    </button>
                  </div>

                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
