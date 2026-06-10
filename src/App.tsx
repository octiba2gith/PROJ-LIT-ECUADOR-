import { useState, useEffect } from 'react';
import { INITIAL_BOOKS } from './data';
import { Book, Order, OrderItem, StockNotification, LayoutDesignConfig, defaultDesignConfig, SessionUser } from './types';
import { Catalog } from './components/Catalog';
import { Cart } from './components/Cart';
import { AdminPanel } from './components/AdminPanel';
import { NotificationsDropdown, LiveToastAlerts } from './components/Notifications';
import { WelcomeScreen } from './components/WelcomeScreen';
import { DesignStudio } from './components/DesignStudio';
import { SheetsManagement } from './components/SheetsManagement';
import { UserProfileModal } from './components/UserProfileModal';
import { 
  BookOpen, 
  ShoppingBag, 
  Terminal, 
  Bell, 
  ClipboardList, 
  Database, 
  Search, 
  Settings, 
  Sparkles,
  Info,
  LogOut,
  User,
  ShoppingBasket,
  FileDown,
  Paintbrush,
  FileSpreadsheet,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  Pencil
} from 'lucide-react';
import {
  fetchBooks,
  saveBook,
  fetchOrders,
  saveOrder,
  fetchNotifications,
  saveNotification,
  fetchDesignConfig,
  saveDesignConfig,
  deleteBook
} from './firebase';
import { fetchBooksFromSheet } from './googleSheets';

// Helper to prevent Firestore or Google Sheets from blocking startup on unstable mobile connections
function timeoutPromise<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => {
        console.warn(`[Startup Timeout] Sync call exceeded ${ms}ms limit. Falling back to cached state.`);
        resolve(fallbackValue);
      }, ms);
    })
  ]);
}

export default function App() {
  // --- Persistent States from LocalStorage ---
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem('lib_books');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading books from storage", e);
      }
    }
    return INITIAL_BOOKS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('lib_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading orders from storage", e);
      }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<StockNotification[]>(() => {
    const saved = localStorage.getItem('lib_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading notifications from storage", e);
      }
    }
    // Initialize standard starting notification if Sapiens starts at stock 0
    return [
      {
        id: 'notif-init',
        bookId: 'book-6',
        bookTitle: 'Sapiens: De animales a dioses',
        timestamp: new Date().toISOString(),
        type: 'depleted',
        read: false,
      }
    ];
  });

  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState(true);

  // Basket is simple record: bookId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  
  // Navigation View
  const [view, setView] = useState<'catalog' | 'cart' | 'admin' | 'orders' | 'developer' | 'sheets'>('catalog');
  
  // Developer authorization passcode checks
  const [isDevAuthorized, setIsDevAuthorized] = useState(true);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [devPasswordError, setDevPasswordError] = useState('');
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [showDevInfo, setShowDevInfo] = useState(false);
  
  // Dynamic bidirectional hash synchronization for friendly standalone URL routes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#catalogo' || hash === '#catalog') {
        setView('catalog');
      } else if (hash === '#carrito' || hash === '#cart') {
        setView('cart');
      } else if (hash === '#inventario' || hash === '#admin') {
        setView('admin');
      } else if (hash === '#pedidos' || hash === '#orders') {
        setView('orders');
      } else if (hash === '#desarrollador' || hash === '#developer') {
        setView('developer');
      } else if (hash === '#sheets') {
        setView('sheets');
      }
    };

    // Initialize state from hash URL
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    let hash = '';
    if (view === 'catalog') hash = '#catalogo';
    else if (view === 'cart') hash = '#carrito';
    else if (view === 'admin') hash = '#inventario';
    else if (view === 'orders') hash = '#pedidos';
    else if (view === 'developer') hash = '#desarrollador';
    else if (view === 'sheets') hash = '#sheets';

    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash || ' ');
    }
  }, [view]);

  // UI Panels
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);

  // Design Settings State from localStorage or defaults
  const [designConfig, setDesignConfig] = useState<LayoutDesignConfig>(() => {
    const saved = localStorage.getItem('lib_design_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading design config from storage", e);
      }
    }
    return defaultDesignConfig;
  });

  // Track the configuration state to warn on unsaved developer additions
  const [lastSavedConfig, setLastSavedConfig] = useState<LayoutDesignConfig>(() => {
    const saved = localStorage.getItem('lib_design_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return defaultDesignConfig;
  });
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  const isConfigDirty = JSON.stringify(designConfig) !== JSON.stringify(lastSavedConfig);

  const handleReturnWithCheck = () => {
    if (isConfigDirty) {
      setShowUnsavedPrompt(true);
    } else {
      setView('admin');
    }
  };

  // --- Sync with Firestore Cloud Databases on mount ---
  useEffect(() => {
    async function syncOnMount() {
      try {
        // 1. First, load the Design/Sheets Configuration
        let currentDesign = designConfig;
        const cloudDesign = await timeoutPromise(fetchDesignConfig(), 2200, null);
        if (cloudDesign) {
          setDesignConfig(cloudDesign);
          setLastSavedConfig(cloudDesign);
          currentDesign = cloudDesign;
        } else {
          console.log("Firestore 'configs/designConfig' is empty or timed out. Syncing current design configuration...");
          await timeoutPromise(saveDesignConfig(designConfig), 1500, undefined);
          setLastSavedConfig(designConfig);
        }

        // 2. Books Sync (Sincronización de libros vía Google Sheets o Firestore)
        let booksLoaded: Book[] = [];
        let fetchedFromSheetsSuccess = false;

        if (currentDesign.googleSheetsUrl && currentDesign.googleSheetsAutoSync) {
          console.log("Auto-sincronizando literatura desde Google Sheets al iniciar...", currentDesign.googleSheetsUrl);
          try {
            const sheetBooks = await timeoutPromise(fetchBooksFromSheet(currentDesign.googleSheetsUrl), 3000, []);
            if (sheetBooks && sheetBooks.length > 0) {
              booksLoaded = sheetBooks;
              fetchedFromSheetsSuccess = true;
              
              // Deletions / Updates synchronizations
              const existingCloudBooks = await timeoutPromise(fetchBooks(), 2000, []);
              const newBookIds = new Set(sheetBooks.map((b) => b.id));
              const itemsToDelete = existingCloudBooks.filter(oldBook => !newBookIds.has(oldBook.id));
              
              // SAFETY LIMIT GUARD: If the sheet would delete more than 40% of the active database, 
              // we treat it as an anomaly or editing state, bypassing destructive deletions to avoid data loss.
              const exceedsSafeDeleteLimit = existingCloudBooks.length > 4 && itemsToDelete.length > (existingCloudBooks.length * 0.4);
              
              if (exceedsSafeDeleteLimit) {
                console.warn(
                  `[AutoSync Guard] Omitiendo eliminación masiva automática de ${itemsToDelete.length} libros de Firestore (límite de resguardo del 40% excedido). Sincronización segura de solo adición y actualización activada.`
                );
              } else {
                // Deprecate entries not present in Sheets (safe margin)
                for (const oldBook of itemsToDelete) {
                  await timeoutPromise(deleteBook(oldBook.id), 1200, undefined);
                }
              }
              
              // Upsert entries in Sheets (non-blocking async)
              for (const book of sheetBooks) {
                timeoutPromise(saveBook(book), 1200, undefined).catch(() => {});
              }
              console.log(`¡Auto-sincronización exitosa! ${sheetBooks.length} libros procesados.`);
            }
          } catch (sheetsErr) {
            console.warn("La auto-sincronización con Google Sheets falló, usando caché o Firestore estándar:", sheetsErr);
          }
        }

        if (fetchedFromSheetsSuccess) {
          setBooks(booksLoaded);
          localStorage.setItem('lib_books', JSON.stringify(booksLoaded));
        } else {
          // Fallback normal a Firestore
          const cloudBooks = await timeoutPromise(fetchBooks(), 2200, []);
          if (cloudBooks && cloudBooks.length > 0) {
            setBooks(cloudBooks);
          } else {
            console.log("Firestore 'books' collection is empty or request timed out. Syncing local books state to initialize...");
            for (const book of books) {
              timeoutPromise(saveBook(book), 1200, undefined).catch(() => {});
            }
          }
        }

        // 3. Orders
        const cloudOrders = await timeoutPromise(fetchOrders(), 2200, []);
        if (cloudOrders && cloudOrders.length > 0) {
          setOrders(cloudOrders);
        } else if (orders.length > 0) {
          console.log("Firestore 'orders' collection is empty or timed out. Syncing local orders state to initialize...");
          for (const ord of orders) {
            timeoutPromise(saveOrder(ord), 1200, undefined).catch(() => {});
          }
        }

        // 4. Notifications
        const cloudNotifs = await timeoutPromise(fetchNotifications(), 2200, []);
        if (cloudNotifs && cloudNotifs.length > 0) {
          setNotifications(cloudNotifs);
        } else if (notifications.length > 0) {
          console.log("Firestore 'notifications' collection is empty or timed out. Syncing local notifications to initialize...");
          for (const notif of notifications) {
            timeoutPromise(saveNotification(notif), 1200, undefined).catch(() => {});
          }
        }
      } catch (e) {
        console.warn("Could not sync with Google Firebase Firestore on mount. Local storage and memory cache are active:", e);
      } finally {
        setIsFirebaseSyncing(false);
      }
    }
    syncOnMount();
  }, []);

  // Forzar sincronización de base de datos local a global de Firebase Firestore
  const handleForceSyncToCloud = async (booksOverride?: Book[]) => {
    try {
      const booksToSync = booksOverride || books;
      
      // If booksOverride is explicitly passed (e.g., from Sheets Import), we align Firestore
      if (booksOverride) {
        const existingCloudBooks = await fetchBooks();
        const newBookIds = new Set(booksOverride.map(b => b.id));
        const itemsToDelete = existingCloudBooks.filter(oldBook => !newBookIds.has(oldBook.id));
        
        // Safety check: don't delete everything if the imported list has very few valid items compared to Firestore
        const exceedsSafeDeleteLimit = existingCloudBooks.length > 4 && itemsToDelete.length > (existingCloudBooks.length * 0.4);
        if (exceedsSafeDeleteLimit) {
          console.warn("[Manual Sync Guard] Se omitió el borrado masivo por exceder el límite seguro del 40%. Solo se agregaron y actualizaron libros.");
        } else {
          for (const oldBook of itemsToDelete) {
            await deleteBook(oldBook.id);
          }
        }
      }

      for (const book of booksToSync) {
        await saveBook(book);
      }
      for (const ord of orders) {
        await saveOrder(ord);
      }
      for (const notif of notifications) {
        await saveNotification(notif);
      }
      await saveDesignConfig(designConfig);
    } catch (e) {
      console.error("Error during manual cloud sync:", e);
      throw e;
    }
  };

  // Effect to load custom fonts, colors, and border shapes dynamically
  useEffect(() => {
    const root = document.documentElement;
    // 1. Inyectar variables de color de Tailwind CSS v4 para el theme
    root.style.setProperty('--color-natural-primary', designConfig.colorPrimary);
    root.style.setProperty('--color-natural-secondary', designConfig.colorSecondary);
    root.style.setProperty('--color-natural-bg', designConfig.colorBg);
    root.style.setProperty('--color-natural-text', designConfig.colorText);
    root.style.setProperty('--color-natural-light-bg', designConfig.colorLightBg);
    root.style.setProperty('--color-natural-border', designConfig.colorBorder);
    root.style.setProperty('--color-natural-light-border', designConfig.colorLightBorder);
    root.style.setProperty('--color-natural-accent-border', designConfig.colorAccentBorder);
    root.style.setProperty('--color-natural-terracotta', designConfig.colorTerracotta);
    root.style.setProperty('--color-natural-footer-bg', designConfig.colorLightBg);
    root.style.setProperty('--color-card-bg', designConfig.colorCardBg);

    // 2. Inyectar fuentes tipográficas personalizadas
    root.style.setProperty('--font-sans', `"${designConfig.fontSans}", ui-sans-serif, system-ui, sans-serif`);
    root.style.setProperty('--font-serif', `"${designConfig.fontSerif}", Georgia, serif`);

    // Dynamic Google Fonts loader
    const fontLinkId = 'link-dynamic-google-fonts';
    let fontLink = document.getElementById(fontLinkId) as HTMLLinkElement;
    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.id = fontLinkId;
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    const families = [designConfig.fontSans, designConfig.fontSerif]
      .filter((v, i, a) => a.indexOf(v) === i && v !== 'system-ui') // unique & non-system
      .map(font => font.replace(/\s+/g, '+') + ':wght@300;400;500;600;700;800;900');
    
    if (families.length > 0) {
      fontLink.href = `https://fonts.googleapis.com/css2?family=${families.join('&family=')}&display=swap`;
    } else {
      fontLink.href = '';
    }

    // 3. Modificaciones de tamaño de fuente
    let fontPct = '100%';
    if (designConfig.fontSizeBase === 'small') fontPct = '90%';
    if (designConfig.fontSizeBase === 'large') fontPct = '110%';
    root.style.setProperty('font-size', fontPct);

    // 4. Modificaciones de redondez (border radius)
    let radius = '24px';
    if (designConfig.borderRadiusBase === 'square') radius = '0px';
    if (designConfig.borderRadiusBase === 'soft') radius = '6px';
    if (designConfig.borderRadiusBase === 'medium') radius = '12px';
    if (designConfig.borderRadiusBase === 'large') radius = '18px';
    if (designConfig.borderRadiusBase === 'organic') radius = '28px';
    root.style.setProperty('--border-radius-custom', radius);

    // Dynamic <style> block insertion to handle overrides for standard utilities
    const styleBlockId = 'style-dynamic-layout-overrides';
    let styleBlock = document.getElementById(styleBlockId) as HTMLStyleElement;
    if (!styleBlock) {
      styleBlock = document.createElement('style');
      styleBlock.id = styleBlockId;
      document.head.appendChild(styleBlock);
    }
    styleBlock.textContent = `
      body, html {
        background-color: ${designConfig.colorBg} !important;
        color: ${designConfig.colorText} !important;
      }
      .bg-white {
        background-color: ${designConfig.colorCardBg} !important;
      }
      .rounded-3xl {
        border-radius: var(--border-radius-custom) !important;
      }
      .rounded-2xl {
        border-radius: calc(var(--border-radius-custom) * 0.75) !important;
      }
      .rounded-xl {
        border-radius: calc(var(--border-radius-custom) * 0.5) !important;
      }
      .rounded-lg {
        border-radius: calc(var(--border-radius-custom) * 0.35) !important;
      }
      .border-natural-border {
        border-color: ${designConfig.colorBorder} !important;
      }
      .border-natural-light-border {
        border-color: ${designConfig.colorLightBorder} !important;
      }
      .border-natural-accent-border {
        border-color: ${designConfig.colorAccentBorder} !important;
      }
      
      /* --- Global Custom Tag Sizing Overrides --- */
      h1, .custom-h1 {
        font-size: ${designConfig.fontSizeH1 ?? 32}px !important;
      }
      h2, .custom-h2 {
        font-size: ${designConfig.fontSizeH2 ?? 24}px !important;
      }
      h3, .custom-h3 {
        font-size: ${designConfig.fontSizeH3 ?? 18}px !important;
      }
      h4, .custom-h4 {
        font-size: ${designConfig.fontSizeH4 ?? 16}px !important;
      }
      h5, .custom-h5 {
        font-size: ${designConfig.fontSizeH5 ?? 14}px !important;
      }
      p, .custom-p, .paragraph-block {
        font-size: ${designConfig.fontSizeParagraph ?? 13}px !important;
      }
      
      /* --- Custom Developers Item Sizing Overrides --- */
      .custom-item-title {
        font-size: ${designConfig.itemTitleSize ?? 13}px !important;
      }
      .custom-item-author {
        font-size: ${designConfig.itemAuthorSize ?? 11}px !important;
      }
      .custom-item-price {
        font-size: ${designConfig.itemPriceSize ?? 15}px !important;
      }
      .custom-item-stock {
        font-size: ${designConfig.itemStockSize ?? 10}px !important;
      }
      
      /* --- Header Icon & Logo customization --- */
      .custom-header-logo {
        width: ${designConfig.headerLogoSize ?? 36}px !important;
        height: ${designConfig.headerLogoSize ?? 36}px !important;
      }
      .custom-header-logo svg {
        width: calc(${designConfig.headerLogoSize ?? 36}px * 0.6) !important;
        height: calc(${designConfig.headerLogoSize ?? 36}px * 0.6) !important;
      }
      .custom-header-title {
        font-size: ${designConfig.headerTitleSize ?? 14}px !important;
      }
      .custom-header-icon {
        width: ${designConfig.headerIconSize ?? 14}px !important;
        height: ${designConfig.headerIconSize ?? 14}px !important;
      }
    `;

  }, [designConfig]);

  const handleSaveDesign = async (configOverride?: LayoutDesignConfig) => {
    const activeConfig = configOverride || designConfig;
    localStorage.setItem('lib_design_config', JSON.stringify(activeConfig));
    try {
      await saveDesignConfig(activeConfig);
      setLastSavedConfig(activeConfig);
    } catch (e) {
      console.error("Error saving design configuration dynamically in Firestore:", e);
    }
  };

  const handleResetDesign = async () => {
    setDesignConfig(defaultDesignConfig);
    localStorage.removeItem('lib_design_config');
    try {
      await saveDesignConfig(defaultDesignConfig);
      setLastSavedConfig(defaultDesignConfig);
    } catch (e) {
      console.error("Error resetting design configuration in Firestore:", e);
    }
  };

  const handleUpdateSheetsConfig = async (url: string, autoSync: boolean) => {
    const updated = {
      ...designConfig,
      googleSheetsUrl: url,
      googleSheetsAutoSync: autoSync
    };
    setDesignConfig(updated);
    localStorage.setItem('lib_design_config', JSON.stringify(updated));
    try {
      await saveDesignConfig(updated);
    } catch (e) {
      console.error("Error saving updated sheets config to Firestore:", e);
    }
  };

  // Session User State loaded from localStorage
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => {
    const saved = localStorage.getItem('lib_currentUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading currentUser from storage", e);
      }
    }
    return null;
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // --- Localstorage Synchronizers ---
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('lib_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('lib_currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('lib_books', JSON.stringify(books));
  }, [books]);

  useEffect(() => {
    localStorage.setItem('lib_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('lib_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // --- Core Handlers ---
  
  // Add item or set quantity in cart
  const handleAddToCart = (bookId: string, qty: number) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    if (qty <= 0) {
      handleRemoveItem(bookId);
      return;
    }

    // Limit to available stock
    const safeQty = Math.min(qty, book.stock);
    setCart((prev) => ({
      ...prev,
      [bookId]: safeQty,
    }));
  };

  const handleUpdateQty = (bookId: string, qty: number) => {
    handleAddToCart(bookId, qty);
  };

  const handleRemoveItem = (bookId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[bookId];
      return updated;
    });
  };

  // Submit Order logic (reduces inventory, checks for zero-stock alerts, submits)
  const handleSubmitOrder = async (
    firstName: string,
    lastName: string,
    orderDate: string,
    items: OrderItem[]
  ) => {
    const newNotifications: StockNotification[] = [];

    // 1. Subtract book quantities
    let updatedBooks: Book[] = [];
    setBooks((prevBooks) => {
      const res = prevBooks.map((book) => {
        const orderedItem = items.find((it) => it.bookId === book.id);
        if (orderedItem) {
          const rawNextStock = book.stock - orderedItem.quantity;
          const nextStock = Math.max(0, rawNextStock);

          // Trigger zero stock notification when stock hits 0!
          if (nextStock === 0 && book.stock > 0) {
            newNotifications.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              bookId: book.id,
              bookTitle: book.title,
              timestamp: new Date().toISOString(),
              type: 'depleted',
              read: false,
            });
          }

          // Trigger low stock notification when stock falls <= custom threshold, but was previously > custom threshold or was not yet warned as unread
          const customThreshold = designConfig.lowStockThreshold ?? 10;
          if (nextStock <= customThreshold && nextStock > 0) {
            const alreadyNotified = notifications.some(
              (n) => n.bookId === book.id && !n.read && (n.type === 'low_stock' || n.type === 'depleted')
            );
            if (!alreadyNotified) {
              newNotifications.push({
                id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                bookId: book.id,
                bookTitle: book.title,
                timestamp: new Date().toISOString(),
                type: 'low_stock',
                read: false,
                stockLeft: nextStock,
              });
            }
          }
          return { ...book, stock: nextStock };
        }
        return book;
      });
      updatedBooks = res;
      return res;
    });

    // 2. Clear shopping cart
    setCart({});

    // 3. Save new order (with potential registered customer email link)
    const newOrder: Order = {
      id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      firstName,
      lastName,
      orderDate,
      items,
      totalTitles: items.length,
      totalQuantity: items.reduce((acc, it) => acc + it.quantity, 0),
      totalPayable: items.reduce((acc, it) => acc + ((it.price || 0) * it.quantity), 0),
      userEmail: currentUser?.role === 'customer' ? currentUser.email : undefined,
    };

    setOrders((prevOrders) => [...prevOrders, newOrder]);

    // 4. Inject newly triggered stock depleted notifications
    if (newNotifications.length > 0) {
      setNotifications((prevNotifs) => [...newNotifications, ...prevNotifs]);
    }

    // --- Firebase Sync Back ---
    try {
      await saveOrder(newOrder);
      for (const item of items) {
        const bookToUpdate = updatedBooks.find(b => b.id === item.bookId);
        if (bookToUpdate) {
          await saveBook(bookToUpdate);
        }
      }
      for (const notif of newNotifications) {
        await saveNotification(notif);
      }

      // --- Send Gmail Notification ---
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newOrder.id,
          firstName: newOrder.firstName,
          lastName: newOrder.lastName,
          orderDate: newOrder.orderDate,
          items: newOrder.items,
          totalQuantity: newOrder.totalQuantity,
          totalPayable: newOrder.totalPayable,
          userEmail: newOrder.userEmail
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log("Notificaciones de correo procesadas para Gmail:", data.message);
        } else {
          console.warn("Error al enviar notificación de correo:", data.message);
        }
      })
      .catch(err => {
        console.error("Error contactando al servidor de correo SMTP:", err);
      });

    } catch (err) {
      console.error("Firebase error backing up order details:", err);
    }
  };

  // Restock logic (recharges books and handles potential 'restocked' notification)
  const handleRestock = async (bookId: string, amount: number) => {
    let targetBook: Book | undefined;
    const restockedAlerts: StockNotification[] = [];
    setBooks((prevBooks) => {
      return prevBooks.map((book) => {
        if (book.id === bookId) {
          const wasDepleted = book.stock === 0;
          const nextStock = book.stock + amount;

          // Trigger "restocked" notification!
          if (wasDepleted && nextStock > 0) {
            const restockedNotif: StockNotification = {
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              bookId: book.id,
              bookTitle: book.title,
              timestamp: new Date().toISOString(),
              type: 'restocked',
              read: false,
            };
            restockedAlerts.push(restockedNotif);
            setNotifications((prevNotifs) => [restockedNotif, ...prevNotifs]);
          }

          targetBook = { ...book, stock: nextStock };
          return targetBook;
        }
        return book;
      });
    });

    if (targetBook) {
      try {
        await saveBook(targetBook);
        for (const notif of restockedAlerts) {
          await saveNotification(notif);
        }
      } catch (e) {
        console.error("Firebase restock sync error:", e);
      }
    }
  };

  // Full raw edit of stock inside admin table
  const handleUpdateFullStock = async (bookId: string, newStock: number) => {
    let targetBook: Book | undefined;
    const stockAlerts: StockNotification[] = [];
    setBooks((prevBooks) => {
      return prevBooks.map((book) => {
        if (book.id === bookId) {
          const wasDepleted = book.stock === 0;

          if (wasDepleted && newStock > 0) {
            const restockedNotif: StockNotification = {
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              bookId: book.id,
              bookTitle: book.title,
              timestamp: new Date().toISOString(),
              type: 'restocked',
              read: false,
            };
            stockAlerts.push(restockedNotif);
            setNotifications((prev) => [restockedNotif, ...prev]);
          } else if (newStock === 0 && book.stock > 0) {
            const depletedNotif: StockNotification = {
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              bookId: book.id,
              bookTitle: book.title,
              timestamp: new Date().toISOString(),
              type: 'depleted',
              read: false,
            };
            stockAlerts.push(depletedNotif);
            setNotifications((prev) => [depletedNotif, ...prev]);
          }

          targetBook = { ...book, stock: newStock };
          return targetBook;
        }
        return book;
      });
    });

    if (targetBook) {
      try {
        await saveBook(targetBook);
        for (const notif of stockAlerts) {
          await saveNotification(notif);
        }
      } catch (e) {
        console.error("Firebase update full stock error:", e);
      }
    }
  };

  // Full raw backend update of categories, titles, authors, and prices
  const handleUpdateBook = async (bookId: string, updatedFields: Partial<Book>) => {
    let targetBook: Book | undefined;
    const updateAlerts: StockNotification[] = [];
    setBooks((prevBooks) => {
      return prevBooks.map((book) => {
        if (book.id === bookId) {
          const nextStock = updatedFields.stock !== undefined ? updatedFields.stock : book.stock;
          const wasDepleted = book.stock === 0;

          if (wasDepleted && nextStock > 0) {
            const restockedNotif: StockNotification = {
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              bookId: book.id,
              bookTitle: updatedFields.title || book.title,
              timestamp: new Date().toISOString(),
              type: 'restocked',
              read: false,
            };
            updateAlerts.push(restockedNotif);
            setNotifications((prev) => [restockedNotif, ...prev]);
          } else if (nextStock === 0 && book.stock > 0) {
            const depletedNotif: StockNotification = {
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              bookId: book.id,
              bookTitle: updatedFields.title || book.title,
              timestamp: new Date().toISOString(),
              type: 'depleted',
              read: false,
            };
            updateAlerts.push(depletedNotif);
            setNotifications((prev) => [depletedNotif, ...prev]);
          }

          targetBook = { ...book, ...updatedFields };
          return targetBook;
        }
        return book;
      });
    });

    if (targetBook) {
      try {
        await saveBook(targetBook);
        for (const notif of updateAlerts) {
          await saveNotification(notif);
        }
      } catch (e) {
        console.error("Firebase update book error:", e);
      }
    }
  };

  const handleAddBook = async (newBook: Omit<Book, 'id'>) => {
    let fullBook: Book | undefined;
    setBooks((prevBooks) => {
      const numericIds = prevBooks
        .map((b) => parseInt(b.id.replace('book-', '')))
        .filter((val) => !isNaN(val));
      const maxId = numericIds.length > 0 ? Math.max(...numericIds) : prevBooks.length;
      const nextId = `book-${maxId + 1}`;
      
      fullBook = {
        id: nextId,
        title: newBook.title,
        author: newBook.author,
        category: newBook.category,
        description: newBook.description,
        coverColor: newBook.coverColor,
        stock: newBook.stock,
        initialStock: newBook.initialStock,
        price: newBook.price,
        visible: newBook.visible !== false,
        coverImage: newBook.coverImage,
        discountType: newBook.discountType,
        discountValue: newBook.discountValue,
      };
      
      return [...prevBooks, fullBook];
    });

    if (fullBook) {
      try {
        await saveBook(fullBook);
      } catch (e) {
        console.error("Firebase add book error:", e);
      }
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm("¿Seguro que deseas eliminar este libro?")) {
      setBooks((prevBooks) => prevBooks.filter((book) => book.id !== bookId));
      try {
        await deleteBook(bookId);
      } catch (e) {
        console.error("Firebase delete book error:", e);
      }
    }
  };

  // Reset database fallback 
  const handleResetDatabase = async () => {
    if (window.confirm("¿Deseas restaurar la base de datos de libros, pedidos e historial a su estado original?")) {
      const initNotif = {
        id: 'notif-init',
        bookId: 'book-6',
        bookTitle: 'Sapiens: De animales a dioses',
        timestamp: new Date().toISOString(),
        type: 'depleted' as const,
        read: false,
      };

      setBooks(INITIAL_BOOKS);
      setOrders([]);
      setNotifications([initNotif]);
      setCart({});
      setView('catalog');

      try {
        // Force delete, re-save INITIAL_BOOKS, notify admin & save config
        for (const book of INITIAL_BOOKS) {
          await saveBook(book);
        }
        await saveNotification(initNotif);
        await saveDesignConfig(defaultDesignConfig);
        setDesignConfig(defaultDesignConfig);
      } catch (e) {
        console.error("Firebase database reset error:", e);
      }
    }
  };

  // Dismiss / Mark Notifications As Read
  const handleMarkAsRead = async (id: string) => {
    let target: StockNotification | undefined;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          target = { ...n, read: true };
          return target;
        }
        return n;
      })
    );
    if (target) {
      try {
        await saveNotification(target);
      } catch (e) {
        console.error("Error saving notification read status:", e);
      }
    }
  };

  const handleClearAllNotifs = async () => {
    let updatedList: StockNotification[] = [];
    setNotifications((prev) => {
      const res = prev.map((n) => ({ ...n, read: true }));
      updatedList = res;
      return res;
    });
    try {
      for (const n of updatedList) {
        await saveNotification(n);
      }
    } catch (e) {
      console.error("Error saving cleared notifications:", e);
    }
  };

  // Filter active notifications to remove old entries & book warnings that are not in the database
  const filteredNotifications = notifications.filter((n) => {
    // 1. Must exist in books database
    const bookExists = books.some((b) => b.id === n.bookId);
    if (!bookExists) return false;

    // 2. Clear old notifications (older than 3 days)
    const notificationAgeMs = new Date().getTime() - new Date(n.timestamp).getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    if (notificationAgeMs > threeDaysMs) return false;

    return true;
  });

  // Count unread alerts
  const unreadAlertsCount = filteredNotifications.filter((n) => !n.read).length;
  const hasUnreadCriticalAlerts = filteredNotifications.some((n) => !n.read && (n.type === 'low_stock' || n.type === 'depleted'));
  
  // Total items in cart
  const cartTotalItemsCount = (Object.values(cart) as number[]).reduce((sum, qty) => sum + qty, 0);

  // Handle downloading invoice on client-side
  const handleDownloadInvoiceForOrder = (order: Order) => {
    const sep = "========================================================\n";
    const subsep = "--------------------------------------------------------\n";
    
    let text = "";
    text += sep;
    text += "            SERVICIO DE LITERATURA ECUADOR\n";
    text += "           COMPROBANTE DE SOLICITUD DE COMPRA\n";
    text += sep;
    text += `Código de Reserva : ${order.id}\n`;
    text += `Cliente           : ${order.firstName} ${order.lastName}\n`;
    text += `Fecha de Pedido   : ${new Date(order.orderDate).toLocaleDateString()}\n`;
    if (order.userEmail) {
      text += `Correo Cliente    : ${order.userEmail}\n`;
    }
    text += sep;
    text += "DESCRIPCIÓN DE ARTÍCULOS:\n";
    text += subsep;
    text += "Título del Libro                         Cant  Unit     Total \n";
    text += subsep;
    
    order.items.forEach((item) => {
      const displayTitle = item.title.padEnd(40, '.').substring(0, 40);
      const displayQty = item.quantity.toString().padStart(4, ' ');
      const displayPrice = `$${(item.price || 0).toFixed(2)}`.padStart(7, ' ');
      const displayTotal = `$${((item.price || 0) * item.quantity).toFixed(2)}`.padStart(9, ' ');
      text += `${displayTitle} ${displayQty} ${displayPrice} ${displayTotal}\n`;
    });
    
    text += subsep;
    text += `Total de Títulos Distintos : ${order.totalTitles}\n`;
    text += `Volumen Total de Copias    : ${order.totalQuantity} unidades\n`;
    text += sep;
    text += `TOTAL A PAGAR (USD)        : $${order.totalPayable.toFixed(2)} USD\n`;
    text += sep;
    text += "\n* Las transacciones se realizan en la moneda oficial: Dólares Americanos ($)\n";
    text += "* Gracias por elegir el Servicio de Literatura Ecuador.\n";
    text += sep;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comprobante_${order.firstName}_${order.lastName}_${order.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!currentUser) {
    return (
      <WelcomeScreen
        designConfig={designConfig}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'admin') {
            setView('admin');
          } else {
            setView('catalog');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text flex flex-col font-sans">
      
      {/* --- Unified Sticky Header & Navigation Block --- */}
      <div className="min-[701px]:sticky relative top-0 z-40 w-full flex flex-col bg-white shadow-xs">
        
        {/* --- 1. Unified Barra Superior (Fija siempre, across all screens) --- */}
        <div className="bg-[#6C7C5F] border-b border-[#5C6C50] h-[54px] w-full text-xs font-sans">
          <div className="max-w-7xl w-full h-full flex items-center justify-between pl-3 pr-3 ml-0 mr-0 pt-[9px] pb-[9px] mt-0 mb-0 font-['Arial']">
          
          {/* Left: Client/Admin Access (Icono de persona o cliente) with Profiles popover */}
          <div className="relative flex items-center gap-2 animate-fade-in">
            {currentUser?.role === 'admin' ? (
              <>
                {/* Mobile version (vertical/portrait, hidden on sm and up) */}
                <div className="flex sm:hidden items-center gap-1.5 select-none font-sans">
                  <button
                    type="button"
                    title="Administrador"
                    onClick={() => {
                      setView('admin');
                      setIsProfileDropdownOpen(false);
                    }}
                    className={`flex items-center justify-center p-2 rounded-lg transition-all duration-300 shadow-xs cursor-pointer active:scale-95 ${
                      view === 'admin'
                        ? 'bg-[#4F6F52] text-white'
                        : 'bg-white border border-natural-border text-[#4F6F52] hover:bg-natural-light-bg'
                    }`}
                  >
                    <User className="w-[19px] h-[19px] shrink-0" />
                  </button>

                  <button
                    type="button"
                    title="Desarrollador (Ajustes)"
                    onClick={() => {
                      setView('developer');
                      setIsProfileDropdownOpen(false);
                    }}
                    className={`flex items-center justify-center p-2 rounded-lg transition-all duration-300 shadow-xs cursor-pointer active:scale-95 ${
                      view === 'developer'
                        ? 'bg-[#A34343] text-white'
                        : 'bg-white border border-natural-border text-[#A34343] hover:bg-natural-light-bg'
                    }`}
                  >
                    <Settings className="w-[19px] h-[19px] shrink-0" />
                  </button>

                  <button
                    type="button"
                    title="Salir"
                    onClick={() => {
                      setCurrentUser(null);
                      setCart({});
                      setView('catalog');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="flex items-center justify-center p-2 rounded-lg bg-white border border-natural-border text-red-600 hover:bg-rose-50 transition-all duration-300 shadow-xs cursor-pointer active:scale-95"
                  >
                    <LogOut className="w-[19px] h-[19px] shrink-0" />
                  </button>
                </div>

                {/* Tablet / Desktop version (hidden on mobile, visible on sm and up) */}
                <div className="hidden sm:block">
                  {(() => {
                    const isDevActive = view === 'developer';
                    return (
                      <button
                        id="unified-role-btn"
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className={`flex items-center justify-between w-[122px] px-2.5 py-1.5 rounded-lg text-[13px] font-bold tracking-wide uppercase transition-all duration-300 shadow-xs border border-white/15 cursor-pointer hover:opacity-90 active:scale-[0.98] select-none text-white ${
                          isDevActive 
                            ? 'bg-[#A34343]' 
                            : 'bg-[#4F6F52]'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {isDevActive ? (
                            <Settings className="w-[21px] h-[21px] shrink-0 text-white" />
                          ) : (
                            <User className="w-[21px] h-[21px] shrink-0 text-white" />
                          )}
                          <span>{isDevActive ? 'AJUSTES' : 'ADMIN'}</span>
                        </div>
                        <span className="text-[8px] text-white/80">▼</span>
                      </button>
                    );
                  })()}
                </div>
              </>
            ) : (
              // Regular Guest / Customer button
              <button
                id="profile-user-btn"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`flex items-center justify-between w-auto px-[5px] py-1.5 rounded-lg border transition-all duration-200 text-[10px] md:text-[13px] font-bold cursor-pointer uppercase tracking-wide select-none ${
                  isProfileDropdownOpen
                    ? 'bg-white border-natural-accent-border text-natural-primary shadow-xs'
                    : 'bg-white/85 border-natural-border/50 text-natural-text hover:bg-white hover:text-natural-primary'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {currentUser?.profilePic ? (
                    currentUser.profilePic.startsWith('data:') || currentUser.profilePic.startsWith('http') ? (
                      <img 
                        src={currentUser.profilePic} 
                        alt="Profile" 
                        className="w-[19px] h-[19px] md:w-[21px] md:h-[21px] rounded-full object-cover shrink-0 border border-natural-accent-border/40"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="w-[19px] h-[19px] md:w-[21px] md:h-[21px] flex items-center justify-center text-xs select-none bg-natural-light-bg rounded-full">
                        {currentUser.profilePic}
                      </span>
                    )
                  ) : (
                    <User className="w-[19px] h-[19px] md:w-[21px] md:h-[21px] text-natural-primary shrink-0" />
                  )}
                  <span className="tracking-tight font-sans">
                    {currentUser?.role === 'customer' 
                      ? (currentUser.name?.split(' ')[0] || 'Lector') 
                      : 'Invitado'}
                  </span>
                </div>
                <span className="px-[5px] text-[10px] text-natural-secondary">▼</span>
              </button>
            )}

            {/* Profile Dropdown Popup/Card */}
            {isProfileDropdownOpen && (
              <div id="unified-user-dropdown" className={`absolute top-full left-0 mt-1 w-[160px] border border-white/15 rounded-xl shadow-lg p-1.5 z-55 text-xs text-white animate-fade-in divide-y divide-white/10 font-sans ${
                view === 'developer' ? 'bg-[#A34343]' : 'bg-[#4F6F52]'
              }`}>
                {currentUser?.role === 'admin' ? (
                   // Admin options
                  <div className="space-y-1 pb-1 flex flex-col items-center justify-center text-center">
                    <div className="px-2 pb-2 pt-0.5 border-b border-white/10 mb-1.5 font-sans w-full">
                      <p className="font-extrabold text-white text-[11px] mt-1 tracking-tight truncate text-center w-full">
                        {currentUser?.name || 'Administrador'}
                      </p>
                      
                      {/* Image uploaded to profile and Editar button */}
                      <div className="mt-2 mb-1 flex items-center justify-center gap-3 pb-1">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center text-lg shadow-inner shrink-0">
                          {currentUser?.profilePic ? (
                            currentUser.profilePic.startsWith('data:') || currentUser.profilePic.startsWith('http') ? (
                              <img 
                                src={currentUser.profilePic} 
                                alt="Foto de perfil" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{currentUser.profilePic}</span>
                            )
                          ) : (
                            <User className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileModalOpen(true);
                            setIsProfileDropdownOpen(false);
                          }}
                          className="px-2.5 py-1.5 bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 font-sans shadow-2xs"
                        >
                          <Pencil className="w-3 h-3 text-white" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setView('admin');
                        setIsProfileDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-center px-2 pt-[8px] pb-[8px] text-center rounded-lg transition-all cursor-pointer whitespace-nowrap uppercase ${
                        view === 'admin'
                          ? 'bg-white/20 text-white font-black'
                          : 'hover:bg-white/10 text-white hover:text-white font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 pb-0.5 justify-center">
                        <User className="w-[17px] h-[17px] shrink-0 text-white" />
                        <span className="font-bold text-[13px] tracking-wide font-sans">ADMIN</span>
                      </div>
                    </button>
 
                    <button
                      type="button"
                      onClick={() => {
                        setView('developer');
                        setIsDevAuthorized(true);
                        setIsProfileDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-center px-2 pt-[8px] pb-[8px] text-center rounded-lg transition-all cursor-pointer whitespace-nowrap uppercase ${
                        view === 'developer'
                          ? 'bg-white/20 text-white font-black'
                          : 'hover:bg-white/10 text-white hover:text-white font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 pb-0.5 justify-center">
                        <Settings className="w-[17px] h-[17px] shrink-0 text-white" />
                        <span className="font-bold text-[13px] tracking-wide font-sans">AJUSTES</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  // Customer details
                  <div className="pb-1.5 space-y-1.5 flex flex-col items-center justify-center text-center">
                    <div className="w-full">
                      <p className="font-extrabold text-white text-xs mt-0.5 truncate border-b border-white/10 pb-1 text-center w-full">
                        {currentUser?.name || 'Invitado'}
                      </p>
                      
                      {/* Image uploaded to profile and Edit button */}
                      <div className="mt-2 mb-1 flex items-center justify-center gap-3 pb-1">
                        <div className="w-14 h-14 rounded-full overflow-hidden border border-white/25 bg-white/10 flex items-center justify-center text-xl shadow-inner shrink-0">
                          {currentUser?.profilePic ? (
                            currentUser.profilePic.startsWith('data:') || currentUser.profilePic.startsWith('http') ? (
                              <img 
                                src={currentUser.profilePic} 
                                alt="Foto de perfil animate-scale-in" 
                                className="w-full h-full object-cover animate-scale-in" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="animate-scale-in">{currentUser.profilePic}</span>
                            )
                          ) : (
                            <User className="w-7 h-7 text-white" />
                          )}
                        </div>
                        {currentUser?.role !== 'guest' && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsProfileModalOpen(true);
                              setIsProfileDropdownOpen(false);
                            }}
                            className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-center rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] sm:text-xs transition-all cursor-pointer font-sans shrink-0 border border-white/15"
                          >
                            <Pencil className="w-3 h-3 text-white" />
                            <span>Editar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
 
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUser(null);
                      setCart({});
                      setView('catalog');
                      setIsProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 pl-[10px] pr-[10px] pt-[8px] pb-[8px] text-center rounded-lg hover:bg-white/10 text-white font-extrabold text-[13px] tracking-wide uppercase transition-colors cursor-pointer font-sans"
                  >
                    <LogOut className="w-[17px] h-[17px] shrink-0 text-white" />
                    <span>SALIR</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right actions: notifications and layout basket tracker */}
          <div className="flex items-center gap-2.5">
            
            {/* Campo de búsqueda de libros (Alineado a la derecha junto a las notificaciones) */}
            {view !== 'developer' && (
              <div className="relative min-[701px]:hidden mt-[6px] mb-[3px]">
                <input
                  type="text"
                  placeholder="Buscar item"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (view !== 'catalog') setView('catalog');
                  }}
                  className="w-[344px] h-[38.5938px] pl-[24px] pr-3 bg-white hover:bg-white focus:bg-white border border-[#aaa29c] focus:border-[#aaa29c] rounded-[23px] text-[10px] md:text-[13px] text-natural-text outline-none transition-all placeholder:text-natural-secondary shadow-2xs ml-0 mr-0"
                />
                <Search className="w-[19px] h-[19px] md:w-[21px] md:h-[21px] text-natural-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            )}

            {/* Real-time Notifications Bell (campana) */}
            <div className="relative">
              <button
                onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                className={`p-2 rounded-lg border relative transition-all duration-200 cursor-pointer ${
                  currentUser?.role === 'admin' && hasUnreadCriticalAlerts
                    ? 'bg-red-600 border-white/30 text-white shadow-md animate-pulse'
                    : isNotifDropdownOpen
                    ? 'bg-[#4F6F52] border-white/30 text-white shadow-xs'
                    : 'bg-[#4F6F52] border-white/15 text-white hover:opacity-90'
                }`}
                title="Alertas de Inventario"
              >
                <Bell className={`w-[19px] h-[19px] md:w-[21px] md:h-[21px] text-white ${currentUser?.role === 'admin' && hasUnreadCriticalAlerts ? 'animate-bounce' : ''}`} />
                {unreadAlertsCount > 0 && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 border border-white rounded-full text-[8.5px] text-white flex items-center justify-center font-black font-mono shadow-sm ${
                    currentUser?.role === 'admin' && hasUnreadCriticalAlerts ? 'bg-red-600' : 'bg-red-500'
                  }`}>
                    {unreadAlertsCount}
                  </span>
                )}
              </button>

              <NotificationsDropdown
                notifications={filteredNotifications}
                isOpen={isNotifDropdownOpen}
                onClose={() => setIsNotifDropdownOpen(false)}
                onMarkAsRead={handleMarkAsRead}
                onClearAll={handleClearAllNotifs}
              />
            </div>

            {/* Shopping Bag Button (bolsa) */}
            <button
              onClick={() => setView('cart')}
              className={`py-2 px-3.5 rounded-lg border font-black text-[10px] md:text-[13px] uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                view === 'cart'
                  ? 'bg-[#4F6F52] border-white/30 text-white shadow-xs'
                  : 'bg-[#4F6F52] border-white/15 text-white hover:opacity-90'
              }`}
            >
              <ShoppingBag className="w-[19px] h-[19px] md:w-[21px] md:h-[21px] shrink-0 text-white" />
              <span className="hidden min-[380px]:inline text-center text-white">PEDIDO</span>
              {cartTotalItemsCount > 0 && (
                <span className={`px-1 rounded text-[10px] font-mono leading-none ${
                  view === 'cart' ? 'bg-white text-[#4F6F52]' : 'bg-white/20 text-white'
                }`}>
                  {cartTotalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

        {/* --- 2. DESKTOP HEADER (min-width: 701px) --- */}
        <div className="hidden min-[701px]:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 w-full items-center justify-between border-b border-natural-light-border bg-white">
          {/* Brand Logo & Title links */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setView('catalog')}>
            <div className="w-10 h-10 bg-natural-primary rounded-xl flex items-center justify-center text-white shadow-md shadow-natural-primary/10 custom-header-logo">
              <BookOpen className="w-5.5 h-5.5 custom-header-icon" />
            </div>
            <div>
              <h1 className="font-serif italic text-natural-primary text-base tracking-tight leading-4 custom-header-title">
                {designConfig.headerTitle}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-natural-secondary tracking-widest uppercase font-bold block">
                  {designConfig.headerSubtitle}
                </span>
                {isFirebaseSyncing ? (
                  <span className="inline-flex items-center text-[8px] font-mono text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse mr-1" />
                    Sincronizando
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[8px] font-mono text-green-700 bg-green-50 px-1 py-0.5 rounded border border-green-200">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
                    Nube Activa
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          {view !== 'developer' && (
            <nav className="flex items-center gap-1.5">
              <button
                onClick={() => setView('catalog')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  view === 'catalog'
                    ? 'bg-natural-primary text-white border-natural-primary shadow-sm'
                    : 'bg-white text-natural-text border-natural-border hover:bg-natural-light-bg/70 hover:text-natural-primary'
                }`}
              >
                Catalogo
              </button>
              {currentUser?.role !== 'guest' && (
                <button
                  onClick={() => setView('orders')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    view === 'orders'
                      ? 'bg-natural-primary text-white border-natural-primary shadow-sm'
                      : 'bg-white text-natural-text border-natural-border hover:bg-natural-light-bg/70 hover:text-natural-primary'
                  }`}
                >
                  Pedidos
                </button>
              )}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setView('admin')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    view === 'admin'
                      ? 'bg-natural-primary text-white border-natural-primary shadow-sm'
                      : 'bg-white text-natural-text border-natural-border hover:bg-natural-light-bg/70 hover:text-natural-primary'
                  }`}
                >
                  Inventario
                </button>
              )}
            </nav>
          )}
        </div>

        {/* --- 3. TABLET HEADER (width: 511px to 700px) --- */}
        {/* "hacer los mismos ajustes para el modo tableta pero no incluyas la barra de busqueda por categorias y el menu desplegable" */}
        <div className="hidden min-[511px]:max-[700px]:flex items-center justify-between w-full bg-white border-b border-natural-border/70 px-4 py-3">
          {/* Logo and name */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => { setView('catalog'); setSearchTerm(''); setSelectedCategory('Todos'); }}>
            <div className="w-9 h-9 bg-natural-primary rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 custom-header-logo">
              <BookOpen className="w-4.5 h-4.5 custom-header-icon" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-serif italic text-natural-primary text-sm font-bold tracking-tight leading-none custom-header-title">
                {designConfig.headerTitle}
              </h1>
              <span className="text-[8px] text-natural-secondary block uppercase tracking-widest font-bold mt-0.5 leading-none">
                {designConfig.headerSubtitle}
              </span>
            </div>
          </div>
        </div>

        {/* --- 4. MOBILE HEADER (width <= 510px) --- */}
        {/* "debajo estara el header con el logo y el nombre del sitio y la barra de busqueda del libro, abajo estara las categorías en un menu desplegable con un boton NAV para mobiles y que diga Busca por categorias." */}
        <div className="min-[511px]:hidden flex flex-col w-full bg-white border-b border-natural-border/70">
          <div className="px-3 py-2.5 flex flex-col gap-2.5">
            {/* Logo and name */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('catalog'); setSearchTerm(''); setSelectedCategory('Todos'); }}>
              <div className="w-8 h-8 bg-natural-primary rounded-xl flex items-center justify-center text-white shadow-xs shrink-0 custom-header-logo">
                <BookOpen className="w-4 h-4 custom-header-icon" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-serif italic text-natural-primary text-[13px] font-bold tracking-tight leading-none custom-header-title">
                  {designConfig.headerTitle}
                </h1>
                <span className="text-[8px] text-natural-secondary block uppercase tracking-widest font-bold mt-0.5 leading-none">
                  {designConfig.headerSubtitle}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Top-up Bar representation for responsiveness */}
      {view !== 'developer' && (
        <div className="min-[701px]:hidden border-b border-natural-border bg-white px-3 py-2 flex justify-around items-center text-center gap-1.5">
          <button
            onClick={() => setView('catalog')}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${
              view === 'catalog'
                ? 'bg-natural-primary text-white border-natural-primary shadow-xs'
                : 'bg-[#FAF8F5] text-[#3D3D33] border-natural-border/60 hover:text-natural-primary'
            }`}
          >
            Catálogo
          </button>
          {currentUser?.role !== 'guest' && (
            <button
              onClick={() => setView('orders')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${
                view === 'orders'
                  ? 'bg-natural-primary text-white border-natural-primary shadow-sm'
                  : 'bg-[#FAF8F5] text-[#3D3D33] border-natural-border/60 hover:text-natural-primary'
              }`}
            >
              Pedidos
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setView('admin')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${
                view === 'admin'
                  ? 'bg-natural-primary text-white border-natural-primary shadow-xs'
                  : 'bg-[#FAF8F5] text-[#3D3D33] border-natural-border/60 hover:text-natural-primary'
              }`}
            >
              Inventario
            </button>
          )}

        </div>
      )}

      {/* Row 3: Categories custom select dropdown - rendered under buttons and only for catalog view */}
      {view === 'catalog' && (
        <div className="min-[511px]:hidden bg-white border-b border-natural-border/70 px-4 py-2 flex flex-col relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMobileCategoryOpen(!isMobileCategoryOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[#FAF8F5] text-natural-text border border-natural-border rounded-xl cursor-pointer outline-none focus:outline-none focus:ring-0 text-left font-normal shadow-xs"
              style={{ fontFamily: 'system-ui', fontSize: '15px' }}
            >
              <span>
                {selectedCategory === 'Todos' 
                  ? `Categorías (${books.filter((b) => b && b.visible !== false).length})` 
                  : `${selectedCategory} (${books.filter((b) => b && b.visible !== false && b.category === selectedCategory).length})`}
              </span>
              <ChevronDown className={`w-4 h-4 text-natural-secondary transition-transform duration-200 ${isMobileCategoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMobileCategoryOpen && (
              <>
                {/* Invisible backdrop to dismiss when clicking outside */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsMobileCategoryOpen(false)} 
                />
                
                {/* Custom Option Dropdown Container */}
                <div className="absolute left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-[#FAF8F5] border border-natural-border rounded-xl shadow-lg z-50 py-1 divide-y divide-natural-border/20">
                  {['Todos', ...(Array.from(new Set(
                    books
                      .filter((b) => b && b.visible !== false && typeof b.category === 'string' && b.category.trim() !== '')
                      .map((b) => b.category as string)
                  )) as string[]).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))].map((cat) => {
                    const isTodos = cat === 'Todos';
                    const count = isTodos 
                      ? books.filter((b) => b && b.visible !== false).length 
                      : books.filter((b) => b && b.visible !== false && b.category === cat).length;
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsMobileCategoryOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-[14.5px] font-medium transition-colors cursor-pointer block ${
                          isSelected
                            ? 'bg-natural-primary text-white font-semibold'
                            : 'text-natural-text hover:bg-natural-light-bg/85'
                        }`}
                        style={{ fontFamily: 'system-ui' }}
                      >
                        {isTodos ? `Categorías (${count})` : `${cat} (${count})`}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}



      {/* --- Main Contents Space --- */}
      <main
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1"
        style={{
          height: '18117px',
          paddingTop: '7px',
          paddingBottom: '20px'
        }}
      >
        


        {/* Inner Content Body switch based on view */}
        {view === 'catalog' && (
          <Catalog
            books={books}
            cart={cart}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveItem}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            isAdmin={currentUser?.role === 'admin'}
            isDeveloperMode={false}
            lowStockThreshold={designConfig.lowStockThreshold}
            columnsDesktop={designConfig.columnsDesktop}
            columnsTablet={designConfig.columnsTablet}
            columnsMobile={designConfig.columnsMobile}
            itemSpacing={designConfig.itemSpacing}
          />
        )}

        {view === 'cart' && (
          <Cart
            cart={cart}
            books={books}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onSubmitOrder={handleSubmitOrder}
            setView={setView}
            currentUser={currentUser}
            onUpdateCurrentUser={setCurrentUser}
            designConfig={designConfig}
          />
        )}

        {view === 'admin' && (
          currentUser?.role === 'admin' ? (
            <AdminPanel
              books={books}
              orders={orders}
              onRestock={handleRestock}
              onUpdateFullStock={handleUpdateFullStock}
              onResetDatabase={handleResetDatabase}
              onUpdateBook={handleUpdateBook}
              onAddBook={handleAddBook}
              setView={setView}
              onDeleteBook={handleDeleteBook}
              onForceSyncToCloud={handleForceSyncToCloud}
              designConfig={designConfig}
              onUpdateSheetsConfig={handleUpdateSheetsConfig}
              onUpdateBooks={setBooks}
              hideTitleBar={false}
              forceSubTab="inventory"
            />
          ) : (
            <div className="bg-white border border-natural-border rounded-3xl p-10 text-center max-w-md mx-auto space-y-4">
              <h3 className="font-serif italic text-red-700 text-lg">Acceso Denegado</h3>
              <p className="text-xs text-natural-secondary">Solo el administrador tiene autorización para gestionar el inventario y stock.</p>
              <button onClick={() => setView('catalog')} className="px-5 py-2.5 bg-natural-primary text-white text-xs font-bold rounded-xl cursor-pointer">
                Volver al Catálogo
              </button>
            </div>
          )
        )}

        {view === 'sheets' && (
          currentUser?.role === 'admin' ? (
            <SheetsManagement
              books={books}
              onUpdateBooks={setBooks}
              designConfig={designConfig}
              onUpdateSheetsConfig={handleUpdateSheetsConfig}
              onForceSyncToCloud={handleForceSyncToCloud}
              orders={orders}
              onUpdateOrders={setOrders}
              onSaveAsDeveloper={handleSaveDesign}
            />
          ) : (
            <div className="bg-white border border-natural-border rounded-3xl p-10 text-center max-w-md mx-auto space-y-4">
              <h3 className="font-serif italic text-red-750 text-lg">Acceso Denegado</h3>
              <p className="text-xs text-natural-secondary">Solo el administrador tiene autorización para gestionar Google Sheets.</p>
              <button onClick={() => setView('catalog')} className="px-5 py-2.5 bg-natural-primary text-white text-xs font-bold rounded-xl cursor-pointer">
                Volver al Catálogo
              </button>
            </div>
          )
        )}

        {view === 'developer' && currentUser?.role === 'admin' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white rounded-3xl p-6 border border-natural-border shadow-sm gap-4 animate-fade-in mb-[11.4px]">
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-natural-secondary">
                  <span className="font-sans font-medium text-natural-primary">
                    <strong>{books.length}</strong> Libros | <strong>{books.reduce((acc, b) => acc + b.stock, 0)}</strong> Unidades | <strong className="text-natural-terracotta">{books.filter((b) => b.stock === 0).length}</strong> Sin Stock
                  </span>
                </div>
              </div>
              <button
                onClick={handleReturnWithCheck}
                className="px-6 py-3 bg-[#4F6F52] hover:bg-[#3E5340] text-white font-bold rounded-2xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md shadow-emerald-900/10 cursor-pointer flex items-center gap-2 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Modo Administrador</span>
              </button>
            </div>

            <DesignStudio
              config={designConfig}
              onChangeConfig={setDesignConfig}
              onSaveAsDeveloper={handleSaveDesign}
              onReset={handleResetDesign}
              books={books}
              onUpdateBooks={setBooks}
              orders={orders}
              onUpdateOrders={setOrders}
              onUpdateSheetsConfig={handleUpdateSheetsConfig}
              onForceSyncToCloud={handleForceSyncToCloud}
            />
          </div>
        )}

        {view === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white rounded-3xl p-6 border border-natural-border shadow-sm gap-4">
              <div>
                <h2 className="text-lg font-serif italic text-natural-primary">
                  {currentUser?.role === 'admin' ? 'Historial Completo de Pedidos' : 'Mis Solicitudes y Pedidos'}
                </h2>
                <p className="text-xs text-natural-secondary mt-0.5">
                  {currentUser?.role === 'admin' 
                    ? 'Listado general de todas las transacciones de ventas y pedidos.' 
                    : `Historial de solicitudes vinculadas a tu cuenta: ${currentUser?.email}`}
                </p>
              </div>
              <button
                onClick={() => setView('catalog')}
                className="px-5 py-2.5 bg-natural-primary hover:opacity-90 text-white rounded-2xl text-xs font-semibold cursor-pointer shadow-sm transition-all"
              >
                Hacer nuevo pedido
              </button>
            </div>

            {currentUser?.role === 'admin' ? (
              <AdminPanel
                books={books}
                orders={orders}
                onRestock={handleRestock}
                onUpdateFullStock={handleUpdateFullStock}
                onResetDatabase={handleResetDatabase}
                onUpdateBook={handleUpdateBook}
                onAddBook={handleAddBook}
                setView={setView}
                onDeleteBook={handleDeleteBook}
                onForceSyncToCloud={handleForceSyncToCloud}
                designConfig={designConfig}
                onUpdateSheetsConfig={handleUpdateSheetsConfig}
                onUpdateBooks={setBooks}
                hideTitleBar={true}
                forceSubTab="orders"
              />
            ) : (
              /* Beautiful Client Self-Serve History Logs */
              (() => {
                const customerOrders = orders.filter((o) => o.userEmail === currentUser?.email);
                if (customerOrders.length === 0) {
                  return (
                    <div className="bg-white border border-natural-border rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
                      <div className="w-12 h-12 bg-natural-light-bg text-natural-secondary rounded-full flex items-center justify-center mx-auto border border-natural-border">
                        <ShoppingBasket className="w-5.5 h-5.5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-serif italic text-natural-primary text-base">Sin pedidos registrados</h3>
                        <p className="text-xs text-natural-secondary max-w-sm mx-auto leading-relaxed">
                          Aún no has registrado solicitudes de compras con tu cuenta registrada. Explora nuestra sección de títulos para agregar libros a tu pedido.
                        </p>
                      </div>
                      <button
                        onClick={() => setView('catalog')}
                        className="px-5 py-2 bg-natural-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:opacity-95 transition-all inline-flex items-center gap-1.5"
                      >
                        Ir al catálogo de compras
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="bg-white border border-natural-border rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start border-b border-natural-light-border pb-2">
                            <div>
                              <span className="text-[10px] font-mono text-natural-secondary font-bold tracking-wider uppercase block">Código de Reserva</span>
                              <span className="text-xs font-bold text-natural-primary font-mono">{order.id}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-mono text-natural-secondary font-bold tracking-wider uppercase block">Fecha de Pedido</span>
                              <span className="text-xs font-semibold text-natural-text">
                                {new Date(order.orderDate).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-natural-secondary tracking-wider block">Lista de libros pedidos:</span>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-natural-light-border/40">
                                  <span className="text-natural-text font-medium line-clamp-1 flex-1 pr-4">{item.title}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold font-mono text-natural-primary bg-natural-light-bg px-2 py-0.5 rounded-sm">x{item.quantity}</span>
                                    <span className="font-mono text-natural-text font-bold text-xs">${((item.price || 0) * item.quantity).toFixed(2)} USD</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-natural-light-border">
                          <div className="flex justify-between items-center pb-3">
                            <span className="text-[10px] uppercase font-bold text-natural-primary tracking-wider font-semibold">Total Cancelado / A Pagar:</span>
                            <span className="font-serif italic text-base text-natural-terracotta font-bold">${order.totalPayable.toFixed(2)} USD</span>
                          </div>
                          <button
                            onClick={() => handleDownloadInvoiceForOrder(order)}
                            className="w-full py-2 bg-natural-light-bg hover:bg-natural-accent-border/30 text-natural-primary border border-natural-border/70 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
                          >
                            <FileDown className="w-4 h-4" />
                            Descargar lista de pedido ($ USD .txt)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </main>

      {/* --- Footer Accent --- */}
      <footer className="bg-[#5f6f52] border-t border-[#4d5c41] py-10 text-center text-xs text-stone-200/90 mt-16 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 space-y-2.5">
          <p className="font-serif italic text-sm text-white font-medium">
            {designConfig.footerText || "Servicio de Literatura Ecuador - Solicitudes de Compra y Pedidos"}
          </p>
          <p>
            &copy; {new Date().getFullYear()} &mdash; Soporte: <a href="mailto:soporte@literaturaecuador.org" className="hover:underline text-white font-medium">soporte@literaturaecuador.org</a>
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <span className="font-mono text-[10px] text-stone-200 font-bold bg-[#4d5c41] px-2.5 py-0.5 rounded-full">V1.2.0 Estable</span>
            <span className="font-mono text-[10px] text-[#e2ba8c] font-bold bg-[#4d5c41] px-2.5 py-0.5 rounded-full">Local Storage Activado</span>
          </div>
        </div>
      </footer>

      {/* --- Automatic Live Notification Toast Manager --- */}
      <LiveToastAlerts 
        notifications={notifications} 
        onDismiss={handleMarkAsRead} 
      />

      {/* --- Prompt Overlay for Unsaved Config Changes --- */}
      {showUnsavedPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fade-in" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl border border-natural-border p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-serif italic text-lg text-natural-primary font-bold">Cambios sin guardar</h3>
              <p className="text-xs text-natural-secondary leading-relaxed">
                Has realizado modificaciones en la estructura o diseño estético de la aplicación que no se han guardado. ¿Deseas guardarlas antes de volver al modo administrador?
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={async () => {
                  try {
                    await handleSaveDesign();
                    setShowUnsavedPrompt(false);
                    setView('admin');
                  } catch (e) {
                    console.error("Error saving design dynamically:", e);
                  }
                }}
                className="w-full py-3 px-4 bg-[#4F6F52] hover:bg-[#3E5340] text-white text-xs font-bold rounded-xl shadow-sm transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Guardar Cambios y Volver
              </button>

              <button
                onClick={() => {
                  setDesignConfig(lastSavedConfig);
                  setShowUnsavedPrompt(false);
                  setView('admin');
                }}
                className="w-full py-2.5 px-4 bg-[#FAF9F5] hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-bold rounded-xl border border-natural-border transition-all text-center cursor-pointer"
              >
                Descartar Cambios y Salir
              </button>

              <button
                onClick={() => setShowUnsavedPrompt(false)}
                className="w-full py-2 px-4 bg-white text-natural-secondary hover:text-natural-hover text-xs font-semibold rounded-xl text-center border border-transparent hover:border-natural-border/45 transition-all cursor-pointer"
              >
                Seguir Editando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile / Registration Data Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onUpdateProfile={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
        />
      )}

    </div>
  );
}
