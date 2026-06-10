import React, { useState } from 'react';
import { Book, Order, LayoutDesignConfig } from '../types';
import { 
  ClipboardList, 
  PlusCircle, 
  Settings, 
  LayoutGrid, 
  Check, 
  RotateCcw, 
  Edit3, 
  Sliders,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Percent,
  Info,
  Cloud,
  FileSpreadsheet,
  Download,
  RefreshCw
} from 'lucide-react';
import { fetchBooksFromSheet } from '../googleSheets';

interface AdminPanelProps {
  books: Book[];
  orders: Order[];
  onRestock: (bookId: string, quantity: number) => void;
  onUpdateFullStock: (bookId: string, newStock: number) => void;
  onResetDatabase: () => void;
  onUpdateBook?: (bookId: string, updatedFields: Partial<Book>) => void;
  onAddBook?: (newBook: Omit<Book, 'id'>) => void;
  setView?: (view: 'catalog' | 'cart' | 'admin' | 'orders' | 'developer') => void;
  onDeleteBook?: (bookId: string) => void;
  onForceSyncToCloud?: () => Promise<void>;
  
  // Google Sheets integration props
  designConfig?: LayoutDesignConfig;
  onUpdateSheetsConfig?: (url: string, autoSync: boolean) => Promise<void>;
  onUpdateBooks?: (books: Book[]) => void;

  hideTitleBar?: boolean;
  forceSubTab?: 'inventory' | 'orders';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  books,
  orders,
  onRestock,
  onUpdateFullStock,
  onResetDatabase,
  onUpdateBook,
  onAddBook,
  setView,
  onDeleteBook,
  onForceSyncToCloud,
  
  designConfig,
  onUpdateSheetsConfig,
  onUpdateBooks,

  hideTitleBar = false,
  forceSubTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'orders'>('orders');
  const currentSubTab = forceSubTab || activeSubTab;
  
  // Custom manual cloud sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerSync = async () => {
    if (!onForceSyncToCloud) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      await onForceSyncToCloud();
      setSyncResult({
        msg: "Y listo: ¡Todos los cambios han sido sincronizados y subidos exitosamente a la base de datos de la Nube!",
        type: 'success'
      });
      setTimeout(() => setSyncResult(null), 7000);
    } catch (err) {
      setSyncResult({
        msg: "No se pudieron sincronizar los datos locales con Firestore. Revisa tu conexión a internet.",
        type: 'error'
      });
      setTimeout(() => setSyncResult(null), 7000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle info texts
  const [showMainInfo, setShowMainInfo] = useState(false);
  const [showInventoryInfo, setShowInventoryInfo] = useState(false);
  
  // Custom categories created directly in the panel
  const [createdCategories, setCreatedCategories] = useState<string[]>([]);
  const [showCategoryCreatorModal, setShowCategoryCreatorModal] = useState(false);
  const [newGlobalCategoryVal, setNewGlobalCategoryVal] = useState('');

  // Google Sheets state configurations
  const [sheetUrl, setSheetUrl] = useState(designConfig?.googleSheetsUrl || '');
  const [autoSync, setAutoSync] = useState(designConfig?.googleSheetsAutoSync || false);
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const [sheetsSyncResult, setSheetsSyncResult] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showSheetsGuide, setShowSheetsGuide] = useState(false);

  const handleSaveSheetsConfig = async () => {
    if (!onUpdateSheetsConfig) return;
    try {
      await onUpdateSheetsConfig(sheetUrl, autoSync);
      setSheetsSyncResult({
        msg: "Configuración de Google Sheets guardada exitosamente.",
        type: 'success'
      });
      setTimeout(() => setSheetsSyncResult(null), 5000);
    } catch (err) {
      setSheetsSyncResult({
        msg: "Error al guardar la configuración.",
        type: 'error'
      });
      setTimeout(() => setSheetsSyncResult(null), 5000);
    }
  };

  const handleSheetsLiveSync = async () => {
    if (!sheetUrl) {
      setSheetsSyncResult({
        msg: "Por favor, ingresa un enlace de Google Sheets primero.",
        type: 'error'
      });
      return;
    }
    
    setIsSheetsSyncing(true);
    setSheetsSyncResult(null);
    try {
      // Save configuration first to keep things integrated
      if (onUpdateSheetsConfig) {
        await onUpdateSheetsConfig(sheetUrl, autoSync);
      }
      
      // Live pull and parse
      const parsedBooks = await fetchBooksFromSheet(sheetUrl);
      if (parsedBooks && parsedBooks.length > 0) {
        if (onUpdateBooks) {
          onUpdateBooks(parsedBooks);
          localStorage.setItem('lib_books', JSON.stringify(parsedBooks));
          
          // Re-trigger global cloud backup
          if (onForceSyncToCloud) {
            await onForceSyncToCloud();
          }
        }
        
        setSheetsSyncResult({
          msg: `¡Sincronización Completa! Se importaron ${parsedBooks.length} títulos exitosamente de Google Sheets y están disponibles en el catálogo en vivo.`,
          type: 'success'
        });
        setTimeout(() => setSheetsSyncResult(null), 7000);
      } else {
        setSheetsSyncResult({
          msg: "La sincronización se realizó, pero no se recuperó ningún libro. Comprueba las cabeceras de tus columnas.",
          type: 'error'
        });
        setTimeout(() => setSheetsSyncResult(null), 7000);
      }
    } catch (err: any) {
      console.error(err);
      setSheetsSyncResult({
        msg: err.message || "Error al conectar y procesar los datos de tu hoja.",
        type: 'error'
      });
      setTimeout(() => setSheetsSyncResult(null), 10000);
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  // Extract unique categories & authors dynamically
  const existingCategories = Array.from(new Set([...books.map((b) => b.category), ...createdCategories].filter(Boolean)));
  const existingAuthors = Array.from(new Set(books.map((b) => b.author).filter(Boolean)));

  // States for full book editing or creation
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [editTitle, setEditTitle] = useState('');
  const [selectCategoryVal, setSelectCategoryVal] = useState('');
  const [newCategoryVal, setNewCategoryVal] = useState('');
  const [selectAuthorVal, setSelectAuthorVal] = useState('');
  const [newAuthorVal, setNewAuthorVal] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editDesc, setEditDesc] = useState('');
  const [editVisible, setEditVisible] = useState<boolean>(true);
  const [editCoverImage, setEditCoverImage] = useState<string>('');
  
  // Discount states
  const [editDiscountType, setEditDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none');
  const [editDiscountValue, setEditDiscountValue] = useState<number>(0);
  
  const [formErrorMsg, setFormErrorMsg] = useState('');

  return (
    <div className="space-y-6">
      {/* Top Controls & Statistics Recap */}
      {!hideTitleBar && currentSubTab !== 'orders' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-natural-border shadow-sm animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-serif italic text-natural-primary">Panel de Administración e Inventario</h2>
              <button
                onClick={() => setShowMainInfo(!showMainInfo)}
                className="p-1 hover:bg-natural-light-bg text-natural-secondary hover:text-natural-primary rounded-full transition-colors cursor-pointer"
                title="Mostrar información de ayuda"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            {showMainInfo && (
              <p className="text-xs text-natural-secondary mt-1 animate-fade-in bg-natural-light-bg/50 px-3 py-2 rounded-xl border border-natural-light-border/70 max-w-xl">
                Supervisa solicitudes recibidas, actualiza ejemplares disponibles y recarga el inventario de libros.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sub menu tabs */}
            <button
              onClick={() => setActiveSubTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentSubTab === 'orders'
                  ? 'bg-natural-primary text-white shadow-xs'
                  : 'text-natural-secondary hover:bg-natural-light-bg hover:text-natural-text'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Pedidos ({orders.length})
            </button>
            
            <button
              onClick={() => setActiveSubTab('inventory')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentSubTab === 'inventory'
                  ? 'bg-natural-primary text-white shadow-xs'
                  : 'text-natural-secondary hover:bg-natural-light-bg hover:text-natural-text'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurar ({books.length})
            </button>
          </div>
        </div>
      )}

      {syncResult && (
        <div className={`p-4 rounded-2xl border text-xs font-medium animate-fade-in ${
          syncResult.type === 'success' 
            ? 'bg-[#EBF7F5] border-[#D1F0EA] text-[#137A63]' 
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {syncResult.msg}
        </div>
      )}

      {currentSubTab === 'orders' ? (
        /* ORDERS LIST COMPONENT */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-natural-border shadow-sm overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-natural-light-border flex justify-between items-center bg-natural-light-bg/30">
              <h3 className="font-serif italic text-natural-primary text-sm">Registro Cronológico de Pedidos</h3>
              <span className="text-[11px] font-medium text-natural-secondary">Total: {orders.length} órdenes recibidas</span>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center text-natural-secondary">
                <ClipboardList className="w-12 h-12 text-natural-secondary/40 mx-auto mb-3" />
                <p className="text-sm font-semibold">No se han registrado pedidos todavía</p>
                <p className="text-xs mt-1">Realiza solicitudes desde el catálogo de libros para ver el historial aquí.</p>
              </div>
            ) : (
              <div className="divide-y divide-natural-light-border/60">
                {[...orders].reverse().map((order) => (
                  <div key={order.id} className="p-6 transition-colors hover:bg-natural-light-bg/15 flex flex-col md:flex-row gap-6 md:items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-natural-text text-sm">
                          {order.firstName} {order.lastName}
                        </span>
                        <span className="text-[10px] text-natural-secondary">•</span>
                        <span className="text-[11px] text-natural-secondary font-medium">
                          F. Pedido: {new Date(order.orderDate).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-natural-secondary">•</span>
                        <span className="text-[10px] bg-natural-light-bg border border-natural-light-border text-natural-primary font-bold px-2 py-0.5 rounded-full">
                          {order.totalTitles} {order.totalTitles === 1 ? 'Título' : 'Títulos'}
                        </span>
                        <span className="text-[10px] bg-[#FDF5E6] border border-natural-accent-border/40 text-natural-terracotta font-bold px-2 py-0.5 rounded-full">
                          {order.totalQuantity} Copias
                        </span>
                      </div>

                      {/* Display Requested Books */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2 border-l-2 border-natural-terracotta">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-xs text-natural-text flex items-center gap-1.5 flex-wrap">
                            <span className="bg-natural-light-bg text-natural-primary font-bold px-1.5 py-0.5 rounded text-[10px] border border-natural-light-border">
                              {item.quantity}x
                            </span>
                            <span className="font-medium line-clamp-1">«{item.title}»</span>
                            <span className="text-[10px] text-natural-secondary font-mono">(${item.price ? item.price.toFixed(2) : '0.00'} USD c/u)</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-bold text-natural-terracotta font-serif italic block">
                        Total: ${order.totalPayable ? order.totalPayable.toFixed(2) : '0.00'} USD
                      </span>
                      <span className="text-[9px] font-mono text-natural-secondary uppercase tracking-widest bg-natural-light-bg/75 border border-natural-light-border px-2 py-1 rounded">
                        RESERVA: {order.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* INVENTORY CONTROL GRID CONTAINER */
        <div className="space-y-6 animate-fade-in">
          {/* TABLE OF ACTIVE STOCK */}
          <div className="bg-white rounded-3xl border border-natural-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-natural-light-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-natural-light-bg/30">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif italic text-natural-primary text-sm">Existencias y Volumen Disponible</h3>
                <button
                  onClick={() => setShowInventoryInfo(!showInventoryInfo)}
                  className="p-1 hover:bg-natural-light-bg text-natural-secondary hover:text-natural-primary rounded-full transition-colors cursor-pointer"
                  title="Mostrar información de existencias"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              {showInventoryInfo && (
                <span className="text-xs text-natural-secondary font-medium animate-fade-in block mt-1">
                  Gestiona desde el panel o edita/añade individualmente cada libro
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingBook(null);
                  setIsCreating(true);
                  setEditTitle('');
                  setSelectCategoryVal(existingCategories[0] || '');
                  setNewCategoryVal('');
                  setSelectAuthorVal(existingAuthors[0] || '');
                  setNewAuthorVal('');
                  setEditPrice(9.99);
                  setEditStock(5);
                  setEditDesc('');
                  setEditVisible(true);
                  setEditCoverImage('');
                  setEditDiscountType('none');
                  setEditDiscountValue(0);
                  setFormErrorMsg('');
                }}
                className="bg-natural-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 hover:opacity-95 shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 ml-0.5" />
                Crear item
              </button>

              <button
                onClick={() => {
                  setNewGlobalCategoryVal('');
                  setShowCategoryCreatorModal(true);
                }}
                className="bg-white text-natural-primary border border-natural-accent-border hover:bg-natural-light-bg/60 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                Crear categoría
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-natural-light-bg/20 text-natural-secondary font-bold text-[10px] uppercase tracking-wider border-b border-natural-light-border">
                  <th className="p-4 pl-6">Libro / Título</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4 text-center">Precio</th>
                  <th className="p-4 text-center">Descuento</th>
                  <th className="p-4 text-center">Stock</th>
                  <th className="p-4 text-center">Disponible</th>
                  <th className="p-4 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-natural-light-border/60 text-xs text-natural-secondary">
                {books.map((book) => {
                  const isDepleted = book.stock === 0;
                  const isLow = book.stock > 0 && book.stock <= 2;

                  return (
                    <tr key={book.id} className="hover:bg-natural-light-bg/10 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-11 bg-gradient-to-br ${book.coverColor} rounded shadow-xs shrink-0 flex items-center justify-center text-white p-0.5 text-center`}>
                            <span className="text-[4px] font-bold line-clamp-2 uppercase leading-none">{book.title}</span>
                          </div>
                          <div>
                            <span className="font-serif italic text-natural-primary block text-xs">{book.title}</span>
                            <span className="text-[10px] text-natural-secondary block">{book.author}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-natural-secondary">{book.category}</td>
                      <td className="p-4 text-center font-mono font-bold text-natural-text">${book.price?.toFixed(2)} USD</td>
                      <td className="p-4 text-center">
                        {book.discountType === 'percentage' && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold text-[10px]">
                            -{book.discountValue}%
                          </span>
                        )}
                        {book.discountType === 'fixed' && (
                          <span className="bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-bold text-[10px]">
                            -${book.discountValue?.toFixed(2)}
                          </span>
                        )}
                        {(!book.discountType || book.discountType === 'none') && (
                          <span className="text-gray-400 font-medium text-[11px]">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {isDepleted ? (
                          <span className="bg-natural-alert-bg text-natural-alert-text px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border border-natural-alert-text/10">
                            Agotado (0)
                          </span>
                        ) : isLow ? (
                          <span className="bg-[#FCF8E3] text-[#B1842E] px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border border-[#F3EBB9]">
                            Crítico
                          </span>
                        ) : (
                          <span className="bg-natural-light-bg text-natural-primary px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border border-natural-accent-border">
                            Disponible
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold text-sm ${isDepleted ? 'text-natural-alert-text' : 'text-natural-text'}`}>
                          {book.stock} u.
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex flex-col gap-1.5 items-end justify-center">
                          {/* Row 1: editar, eliminar, duplicar with icons only */}
                          <div className="flex items-center gap-1.5">
                            {/* Editar */}
                            <button
                              onClick={() => {
                                setEditingBook(book);
                                setIsCreating(false);
                                setEditTitle(book.title);
                                setSelectCategoryVal(book.category);
                                setNewCategoryVal('');
                                setSelectAuthorVal(book.author || '');
                                setNewAuthorVal('');
                                setEditPrice(book.price || 0);
                                setEditStock(book.stock);
                                setEditDesc(book.description || '');
                                setEditVisible(book.visible !== false);
                                setEditCoverImage(book.coverImage || '');
                                setEditDiscountType(book.discountType || 'none');
                                setEditDiscountValue(book.discountValue || 0);
                                setFormErrorMsg('');
                              }}
                              className="p-1.5 bg-white border border-natural-border text-natural-secondary hover:text-natural-primary hover:border-natural-accent-border hover:bg-natural-light-bg/40 rounded-lg transition-all cursor-pointer"
                              title="Editar Libro"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => {
                                if (onDeleteBook) {
                                  onDeleteBook(book.id);
                                }
                              }}
                              className="p-1.5 bg-white border border-natural-border text-red-500 hover:text-red-700 hover:border-red-250 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Eliminar Libro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicar */}
                            <button
                              onClick={() => {
                                if (onAddBook) {
                                  onAddBook({
                                    title: `${book.title} - Copia`,
                                    category: book.category,
                                    author: book.author,
                                    price: book.price,
                                    stock: book.stock,
                                    initialStock: book.stock,
                                    description: book.description || '',
                                    visible: book.visible !== false,
                                    coverColor: book.coverColor,
                                    coverImage: book.coverImage,
                                    discountType: book.discountType || 'none',
                                    discountValue: book.discountValue || 0,
                                  });
                                }
                              }}
                              className="p-1.5 bg-white border border-natural-border text-amber-600 hover:text-amber-800 hover:border-amber-250 hover:bg-amber-50 rounded-lg transition-all cursor-pointer"
                              title="Duplicar Libro"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Row 2: 2 funciones debajo, also with icons only */}
                          <div className="flex items-center gap-1.5">
                            {/* Toggle Visibilidad */}
                            <button
                              onClick={() => {
                                if (onUpdateBook) {
                                  onUpdateBook(book.id, { visible: book.visible === false });
                                }
                              }}
                              className={`p-1.5 border rounded-lg transition-all cursor-pointer ${
                                book.visible !== false
                                  ? 'bg-[#EBF7F5] border-[#D1F0EA] text-[#137A63] hover:bg-[#DDF4F0]'
                                  : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-205'
                              }`}
                              title={book.visible !== false ? 'Ocultar de catálogo (Visible)' : 'Mostrar en catálogo (Oculto)'}
                            >
                              {book.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Toggle Descuento rápido 20% */}
                            <button
                              onClick={() => {
                                if (onUpdateBook) {
                                  const hasDiscount = book.discountType === 'percentage' && book.discountValue === 20;
                                  onUpdateBook(book.id, {
                                    discountType: hasDiscount ? 'none' : 'percentage',
                                    discountValue: hasDiscount ? 0 : 20,
                                  });
                                }
                              }}
                              className={`p-1.5 border rounded-lg transition-all cursor-pointer ${
                                book.discountType === 'percentage' && book.discountValue === 20
                                  ? 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200'
                                  : 'bg-white border-natural-border text-natural-secondary hover:text-natural-primary hover:border-natural-accent-border hover:bg-natural-light-bg/40'
                              }`}
                              title="Alternar Oferta Rápida (Establece 20% descuento)"
                            >
                              <Percent className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {/* Modern virtual backend edit modal overlay */}
      {(editingBook || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => { setEditingBook(null); setIsCreating(false); }} />
          
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-natural-border shadow-2xl relative z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-natural-light-border">
              <h3 className="font-serif italic text-natural-primary text-base">
                {isCreating ? 'Añadir Nuevo Libro (Virtual Backend)' : 'Modificar Libro (Virtual Backend)'}
              </h3>
              <button onClick={() => { setEditingBook(null); setIsCreating(false); }} className="text-natural-secondary hover:text-natural-text font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3.5 text-xs text-natural-secondary">
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[10px]">Título del Libro</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none"
                  placeholder="Ej. Harry Potter y la piedra filosofal"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Category selector / creator */}
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-[10px] block">Categoría</label>
                  <select
                    value={selectCategoryVal}
                    onChange={(e) => {
                      setSelectCategoryVal(e.target.value);
                      if (e.target.value !== '__new__') {
                        setNewCategoryVal('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#FAF8F2] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none cursor-pointer"
                  >
                    <option value="" disabled>Selecciona una categoría...</option>
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__new__" className="text-natural-terracotta font-semibold">+ Crear nueva categoría...</option>
                  </select>
                  
                  {selectCategoryVal === '__new__' && (
                    <input
                      type="text"
                      placeholder="Escribe la nueva categoría..."
                      value={newCategoryVal}
                      onChange={(e) => setNewCategoryVal(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 bg-natural-light-bg/30 text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl fill-none outline-none text-xs animate-fade-in placeholder:text-natural-secondary"
                      required
                    />
                  )}
                </div>

                {/* Author selector / creator */}
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-[10px] block">Autor</label>
                  <select
                    value={selectAuthorVal}
                    onChange={(e) => {
                      setSelectAuthorVal(e.target.value);
                      if (e.target.value !== '__new__') {
                        setNewAuthorVal('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#FAF8F2] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none cursor-pointer"
                  >
                    <option value="" disabled>Selecciona un autor...</option>
                    {existingAuthors.map((auth) => (
                      <option key={auth} value={auth}>{auth}</option>
                    ))}
                    <option value="__new__" className="text-natural-terracotta font-semibold">+ Añadir nuevo autor...</option>
                  </select>
                  
                  {selectAuthorVal === '__new__' && (
                    <input
                      type="text"
                      placeholder="Escribe nombre de autor..."
                      value={newAuthorVal}
                      onChange={(e) => setNewAuthorVal(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 bg-natural-light-bg/30 text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-xs animate-fade-in placeholder:text-natural-secondary"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-[10px]">Precio ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono font-bold bg-[#FAF8F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-[10px]">Disponible (Stock)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono font-bold bg-[#FAF8F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none"
                    required
                  />
                </div>
              </div>

              {/* Discount inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-natural-light-bg/15 p-3 rounded-2xl border border-natural-border/60">
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-[10px] block">Tipo de Descuento</label>
                  <select
                    value={editDiscountType}
                    onChange={(e) => {
                      const val = e.target.value as 'percentage' | 'fixed' | 'none';
                      setEditDiscountType(val);
                      if (val === 'none') {
                        setEditDiscountValue(0);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl cursor-pointer outline-none"
                  >
                    <option value="none">Sin Descuento</option>
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Valor Fijo ($ USD)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-[10px] block">
                    {editDiscountType === 'percentage' ? 'Valor Descuento (%)' : editDiscountType === 'fixed' ? 'Valor Descuento ($)' : 'Valor Descuento'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={editDiscountType === 'percentage' ? 100 : undefined}
                    step="0.01"
                    disabled={editDiscountType === 'none'}
                    value={editDiscountValue}
                    onChange={(e) => setEditDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono font-bold bg-white text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[10px]">Resumen / Descripción</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#FAF8F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none resize-none"
                  placeholder="Sinopsis breve del contenido para captar interés."
                />
              </div>

              {/* Upload image Base64 or URL */}
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[10px]">Miniatura de Portada (Archivo o URL)</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditCoverImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-natural-secondary file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-natural-primary file:text-white hover:file:opacity-90 file:cursor-pointer border border-natural-border p-1 rounded-xl bg-natural-light-bg/10"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="O pega URL de la imagen de portada..."
                      value={editCoverImage.startsWith('data:') ? '' : editCoverImage}
                      onChange={(e) => setEditCoverImage(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-natural-light-bg/30 text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-xs"
                    />
                    {editCoverImage && (
                      <button
                        type="button"
                        onClick={() => setEditCoverImage('')}
                        className="text-[10px] text-natural-terracotta border border-natural-terracotta/25 hover:bg-natural-terracotta/5 px-2.5 rounded-xl font-bold cursor-pointer transition-colors"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
                {editCoverImage && (
                  <div className="mt-1 flex items-center gap-2 border border-natural-border p-1.5 rounded-xl bg-natural-light-bg/10">
                    <img src={editCoverImage} alt="Portadita" className="w-8 h-8 object-cover rounded border border-natural-border" />
                    <span className="text-[10px] text-natural-secondary truncate max-w-[240px]">Imagen cargada con éxito</span>
                  </div>
                )}
              </div>

              {/* Visible / Hidden checkbox toggle */}
              <div className="flex items-center gap-2 bg-natural-light-bg/25 border border-natural-border p-3 rounded-2xl">
                <input
                  type="checkbox"
                  id="editVisible"
                  checked={editVisible}
                  onChange={(e) => setEditVisible(e.target.checked)}
                  className="w-4 h-4 text-natural-primary border-natural-border rounded-lg accent-natural-primary cursor-pointer"
                />
                <label htmlFor="editVisible" className="font-bold uppercase tracking-wider text-[10px] cursor-pointer text-natural-primary select-none flex-1">
                  Mostrar título en el catálogo (Visible)
                </label>
              </div>
            </div>

            {formErrorMsg && (
              <p className="text-red-600 text-xs text-center font-medium my-1 animate-pulse">{formErrorMsg}</p>
            )}

            <div className="flex gap-2.5 pt-2 border-t border-natural-light-border justify-end">
              <button
                onClick={() => {
                  setEditingBook(null);
                  setIsCreating(false);
                }}
                className="px-4 py-2 bg-natural-light-bg hover:bg-natural-accent-border/20 text-natural-secondary border border-natural-border rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                onClick={() => {
                  const finalCategory = selectCategoryVal === '__new__' ? newCategoryVal.trim() : selectCategoryVal.trim();
                  const finalAuthor = selectAuthorVal === '__new__' ? newAuthorVal.trim() : selectAuthorVal.trim();

                  if (!editTitle.trim()) {
                    setFormErrorMsg('El título es requerido.');
                    return;
                  }
                  if (!finalCategory) {
                    setFormErrorMsg('Por favor selecciona o escribe una categoría para el título.');
                    return;
                  }
                  if (!finalAuthor) {
                    setFormErrorMsg('Por favor selecciona o escribe un autor para el título.');
                    return;
                  }

                  if (isCreating) {
                    if (onAddBook) {
                      const gradients = [
                        'from-blue-600 to-indigo-750',
                        'from-amber-600 to-yellow-550',
                        'from-emerald-600 to-teal-750',
                        'from-red-600 to-orange-550',
                        'from-purple-600 to-pink-750',
                        'from-[#4D6040] to-[#8F9E7B]',
                        'from-[#D35400] to-[#E67E22]'
                      ];
                      const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

                      onAddBook({
                        title: editTitle.trim(),
                        category: finalCategory,
                        author: finalAuthor,
                        price: editPrice,
                        stock: editStock,
                        initialStock: editStock,
                        description: editDesc,
                        visible: editVisible,
                        coverColor: randomGradient,
                        coverImage: editCoverImage || undefined,
                        discountType: editDiscountType,
                        discountValue: editDiscountValue,
                      });
                    }
                  } else if (editingBook) {
                    if (onUpdateBook) {
                      onUpdateBook(editingBook.id, {
                        title: editTitle.trim(),
                        category: finalCategory,
                        author: finalAuthor,
                        price: editPrice,
                        stock: editStock,
                        description: editDesc,
                        visible: editVisible,
                        coverImage: editCoverImage || undefined,
                        discountType: editDiscountType,
                        discountValue: editDiscountValue,
                      });
                    } else {
                      onUpdateFullStock(editingBook.id, editStock);
                    }
                  }
                  
                  setEditingBook(null);
                  setIsCreating(false);
                }}
                className="px-5 py-2 bg-natural-primary hover:opacity-95 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                {isCreating ? 'Crear Libro' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Creator Modal Overlay */}
      {showCategoryCreatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowCategoryCreatorModal(false)} />
          
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-natural-border shadow-2xl relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-natural-light-border">
              <h3 className="font-serif italic text-natural-primary text-sm font-bold">Crear Categoría</h3>
              <button onClick={() => setShowCategoryCreatorModal(false)} className="text-natural-secondary hover:text-natural-text font-bold text-sm">✕</button>
            </div>
            
            <div className="space-y-3 text-xs text-natural-secondary">
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[10px] text-natural-primary">Nombre de la Categoría</label>
                <input
                  type="text"
                  value={newGlobalCategoryVal}
                  onChange={(e) => setNewGlobalCategoryVal(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none"
                  placeholder="Ej. Realismo Mágico, Poesía"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-natural-light-border">
              <button
                onClick={() => setShowCategoryCreatorModal(false)}
                className="px-3.5 py-1.5 bg-natural-light-bg hover:bg-natural-accent-border/20 text-natural-secondary border border-natural-border rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const cleaned = newGlobalCategoryVal.trim();
                  if (cleaned) {
                    setCreatedCategories(prev => {
                      if (prev.includes(cleaned)) return prev;
                      return [...prev, cleaned];
                    });
                    // Select it automatically in category form to have it pre-selected
                    setSelectCategoryVal(cleaned);
                    setNewGlobalCategoryVal('');
                    setShowCategoryCreatorModal(false);
                  }
                }}
                className="px-4 py-1.5 bg-natural-primary hover:opacity-95 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
