import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Info, 
  RefreshCw, 
  Cloud, 
  Database, 
  Download, 
  Upload, 
  Settings,
  Flame,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { Book, Order, LayoutDesignConfig } from '../types';
import { fetchBooksFromSheet } from '../googleSheets';

interface SheetsManagementProps {
  books: Book[];
  onUpdateBooks: (books: Book[]) => void;
  designConfig: LayoutDesignConfig;
  onUpdateSheetsConfig: (url: string, autoSync: boolean) => Promise<void>;
  onForceSyncToCloud?: (booksOverride?: Book[]) => Promise<void>;
  orders: Order[];
  onUpdateOrders: (orders: Order[]) => void;
  onSaveAsDeveloper?: () => Promise<void>;
}

export const SheetsManagement: React.FC<SheetsManagementProps> = ({
  books,
  onUpdateBooks,
  designConfig,
  onUpdateSheetsConfig,
  onForceSyncToCloud,
  orders,
  onUpdateOrders,
  onSaveAsDeveloper
}) => {
  // Local state for URLs & configurations
  const [sheetUrl, setSheetUrl] = useState(designConfig?.googleSheetsUrl || '');
  const [autoSync, setAutoSync] = useState(designConfig?.googleSheetsAutoSync || false);
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const [sheetsSyncResult, setSheetsSyncResult] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  // URL Protection lock states
  const [isUrlLocked, setIsUrlLocked] = useState(true);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleUnlock = () => {
    if (passwordInput === 'admin') {
      setIsUrlLocked(false);
      setIsUnlockModalOpen(false);
      setPasswordError('');
      setPasswordInput('');
      setShowPassword(false);
    } else {
      setPasswordError('Clave de administrador incorrecta.');
    }
  };
  
  // Cloud Firestore Sync states 
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncResult, setCloudSyncResult] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Server default sync files states 
  const [isServerSyncing, setIsServerSyncing] = useState(false);
  const [serverSyncResult, setServerSyncResult] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Informative tooltips (secondary text toggles)
  const [showSheetsInfo, setShowSheetsInfo] = useState(false);
  const [showCloudSyncInfo, setShowCloudSyncInfo] = useState(false);
  const [showServerSyncInfo, setShowServerSyncInfo] = useState(false);
  const [showJsonBackupInfo, setShowJsonBackupInfo] = useState(false);
  const [showSheetsGuide, setShowSheetsGuide] = useState(false);

  // Action: Save raw URL only
  const handleSaveSheetsConfig = async () => {
    try {
      await onUpdateSheetsConfig(sheetUrl, autoSync);
      setSheetsSyncResult({
        msg: "Configuración de enlace de Google Sheets guardada exitosamente.",
        type: 'success'
      });
      setTimeout(() => setSheetsSyncResult(null), 5000);
    } catch (err) {
      setSheetsSyncResult({
        msg: "Error al guardar la configuración en la base de datos.",
        type: 'error'
      });
      setTimeout(() => setSheetsSyncResult(null), 5000);
    }
  };

  // Action: Save Sheets config + Fetch and parse active rows
  const handleSheetsLiveSync = async () => {
    if (!sheetUrl) {
      setSheetsSyncResult({
        msg: "Por favor, ingresa un enlace de Google Sheets válido primero.",
        type: 'error'
      });
      return;
    }
    
    setIsSheetsSyncing(true);
    setSheetsSyncResult(null);
    try {
      // First, update URL config in parent
      await onUpdateSheetsConfig(sheetUrl, autoSync);
      
      // Pull books from sheet url
      const parsedBooks = await fetchBooksFromSheet(sheetUrl);
      if (parsedBooks && parsedBooks.length > 0) {
        onUpdateBooks(parsedBooks);
        localStorage.setItem('lib_books', JSON.stringify(parsedBooks));
        
        // Push additions back to firestore to keep things synchronized
        if (onForceSyncToCloud) {
          await onForceSyncToCloud(parsedBooks);
        }
        
        setSheetsSyncResult({
          msg: `¡Sincronización de Sheets con éxito! Se cargaron ${parsedBooks.length} títulos del catálogo directamente. Las novedades ya están publicadas.`,
          type: 'success'
        });
        setTimeout(() => setSheetsSyncResult(null), 8000);
      } else {
        setSheetsSyncResult({
          msg: "La sincronización finalizó sin errores, pero no se leyó ninguna fila elegible de libros. Revisa los nombres de las columnas.",
          type: 'error'
        });
        setTimeout(() => setSheetsSyncResult(null), 8000);
      }
    } catch (err: any) {
      console.error(err);
      setSheetsSyncResult({
        msg: err.message || "No se pudo leer la hoja. Asegúrate de que el documento de Google Sheets está compartido como 'Lector' con cualquier persona con el enlace.",
        type: 'error'
      });
      setTimeout(() => setSheetsSyncResult(null), 10000);
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  // Action: Firestore Live Sync button callback
  const handleTriggerCloudSync = async () => {
    if (!onForceSyncToCloud) return;
    setIsCloudSyncing(true);
    setCloudSyncResult(null);
    try {
      await onForceSyncToCloud();
      setCloudSyncResult({
        msg: "¡Sincronización en la Nube exitosa! Todos tus libros, configuraciones de diseño y pedidos locales se han consolidado en Google Firestore centralizado.",
        type: 'success'
      });
      setTimeout(() => setCloudSyncResult(null), 6000);
    } catch (err: any) {
      setCloudSyncResult({
        msg: "Error al sincronizar con la nube de Firestore: " + (err.message || err),
        type: 'error'
      });
      setTimeout(() => setCloudSyncResult(null), 6000);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Action: Save current dynamic configurations to files
  const handleSyncToServer = async () => {
    setIsServerSyncing(true);
    setServerSyncResult(null);
    try {
      const response = await fetch('/api/save-catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          books,
          designConfig,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setServerSyncResult({
          type: 'success',
          msg: '¡Operación exitosa! Los libros, categorías, descripciones y diseño se escribieron directamente en los archivos de la app (/src/data.ts y /src/types.ts).',
        });
        setTimeout(() => setServerSyncResult(null), 7000);
      } else {
        setServerSyncResult({
          type: 'error',
          msg: 'Error del servidor: ' + (data.error || 'No se pudo guardar.'),
        });
        setTimeout(() => setServerSyncResult(null), 7000);
      }
    } catch (err: any) {
      setServerSyncResult({
        type: 'error',
        msg: 'No se pudo contactar al servidor. Reintenta recargar la pestaña del navegador.',
      });
      setTimeout(() => setServerSyncResult(null), 7000);
    } finally {
      setIsServerSyncing(false);
    }
  };

  // Action: Export JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      books,
      designConfig,
      orders,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', 'servicio_literatura_respaldo_completo.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Action: Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.books && Array.isArray(parsed.books)) {
          onUpdateBooks(parsed.books);
        }
        if (parsed.orders && Array.isArray(parsed.orders)) {
          onUpdateOrders(parsed.orders);
        }
        alert('Copia de seguridad local importada con éxito. Catálogo de libros y pedidos actualizados.');
      } catch (err) {
        alert('Error al leer el archivo. Asegúrate de que es un archivo JSON válido.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-0 animate-fade-in text-natural-text pb-12">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-white rounded-3xl p-6 border border-natural-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#EBF7F5] text-[#137A63] border border-[#D1F0EA] rounded-2xl">
              <FileSpreadsheet className="w-5.5 h-5.5" />
            </div>
            <div>
              <h2 className="text-xl font-serif italic text-natural-primary font-bold">Gestión de Google Sheets e Integraciones</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-natural-secondary font-mono">PANEL DE SINCRONIZACIÓN Y RESPALDOS</span>
                <span className="w-1.5 h-1.5 bg-[#137A63] rounded-full animate-pulse"></span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs text-natural-secondary">
          Carga masiva, respaldos en la nube y sincronización permanente en un solo lugar.
        </div>
      </div>

      {/* BLOQUE DE GOOGLE SHEETS */}
      <div className="bg-white rounded-3xl border border-natural-border shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-natural-light-border pb-4 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EBF7F5] text-[#137A63] rounded-xl flex items-center justify-center border border-[#D1F0EA]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif italic text-natural-primary font-bold text-sm">Sincronización con Hojas de Cálculo</h3>
                <button
                  type="button"
                  onClick={() => setShowSheetsInfo(!showSheetsInfo)}
                  className="p-1 text-natural-secondary hover:text-natural-primary transition-colors cursor-pointer rounded-full hover:bg-natural-light-bg"
                  title="Descripción técnica"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              {showSheetsInfo && (
                <p className="text-[11px] text-natural-secondary mt-1 max-w-2xl bg-natural-light-bg/50 px-3 py-1.5 rounded-lg border border-natural-light-border animate-fade-in leading-relaxed">
                  Permite sincronizar de forma masiva el catálogo de libros, stock, precios, imágenes, descripciones y tipos de descuento desde cualquier hoja de cálculo compartida públicamente.
                </p>
              )}
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setShowSheetsGuide(!showSheetsGuide)}
            className="text-xs font-semibold text-natural-terracotta hover:text-natural-primary flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Info className="w-4 h-4" />
            {showSheetsGuide ? 'Ocultar Guía' : 'Guía de Columnas'}
          </button>
        </div>

        {/* GUÍA DE COLUMNAS DE GOOGLE SHEETS */}
        {showSheetsGuide && (
          <div className="bg-[#FAF9F5] border border-dashed border-natural-accent-border/60 rounded-2xl p-4 text-xs text-natural-secondary space-y-3 animate-fade-in">
            <div className="font-bold text-natural-text flex items-center gap-1">
              <span className="text-[#137A63]">⚡</span> Instrucciones para Configurar tu Hoja de Cálculo:
            </div>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
              <li>Crea una nueva hoja en <span className="font-bold text-natural-text font-mono">Google Sheets</span>.</li>
              <li>
                Define las siguientes cabeceras textuales en la <span className="font-bold text-[#137A63]">primera fila</span> de tu hoja:
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 bg-white p-3 rounded-xl border border-natural-light-border font-mono text-[10px]">
                  <div>• <span className="font-bold text-natural-primary font-mono">Título</span></div>
                  <div>• <span className="font-bold text-natural-primary font-mono">Autor</span></div>
                  <div>• <span className="font-bold text-natural-primary font-mono">Categoría</span></div>
                  <div>• <span className="font-bold text-natural-primary font-mono">Precio</span></div>
                  <div>• <span className="font-bold text-natural-primary font-mono">Stock</span></div>
                  <div>• <span className="font-bold text-natural-primary font-mono">Descripción</span></div>
                  <div>• <span className="font-bold text-natural-primary font-mono">Imagen Portada</span></div>
                  <div>• <span className="font-bold text-natural-primary font-mono">Descuento Tipo</span></div>
                  <div>• <span className="font-bold text-natural-primary font-mono">Descuento Valor</span></div>
                </div>
              </li>
              <li>Haz clic en <span className="font-bold border px-1 py-0.2 bg-white rounded">Compartir</span> en Sheets, asigna <span className="font-bold text-blue-600">"Cualquier persona con el enlace puede ver"</span> y copia la URL completa de tu navegador.</li>
            </ol>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-8 space-y-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-natural-primary flex items-center gap-1.5">
              <span>Enlace o URL de Google Sheets</span>
              {isUrlLocked ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold select-none">
                  <Lock className="w-3 h-3 text-amber-600" /> 🔒 Protegido
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold select-none">
                  <Unlock className="w-3 h-3 text-emerald-600" /> 🔓 Desbloqueado
                </span>
              )}
            </span>
            <div className="relative">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => {
                  if (isUrlLocked) return;
                  setSheetUrl(e.target.value);
                }}
                onClick={() => {
                  if (isUrlLocked) {
                    setIsUnlockModalOpen(true);
                  }
                }}
                readOnly={isUrlLocked}
                className={`w-full pl-10 pr-28 py-3 bg-[#FAF8F5] text-natural-text border rounded-xl outline-none text-xs font-mono transition-all duration-200 ${
                  isUrlLocked 
                    ? 'border-natural-border text-natural-secondary cursor-pointer bg-natural-light-bg/50 select-none' 
                    : 'border-natural-border focus:border-natural-accent-border'
                }`}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBAnupADgONqVy.../edit"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                {isUrlLocked ? (
                  <Lock className="w-4 h-4 text-amber-600" />
                ) : (
                  <Unlock className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {sheetUrl && !isUrlLocked && (
                  <button
                    type="button"
                    onClick={() => setSheetUrl('')}
                    className="text-natural-secondary hover:text-natural-primary cursor-pointer font-bold text-xs p-1"
                    title="Borrar enlace"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (isUrlLocked) {
                      setIsUnlockModalOpen(true);
                    } else {
                      setIsUrlLocked(true);
                    }
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-all ${
                    isUrlLocked 
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60' 
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60'
                  }`}
                >
                  {isUrlLocked ? 'Activar' : 'Bloquear'}
                </button>
              </div>
            </div>
            {isUrlLocked && (
              <p className="text-[10px] text-amber-800 font-medium flex items-center gap-1 mt-1 pl-1">
                <span>🔒</span> Este enlace está protegido. Para borrarlo o editarlo, presiona "Activar" o haz clic en el input e ingresa la contraseña.
              </p>
            )}
          </div>

          <div className="lg:col-span-4 flex flex-col justify-center h-[52px] pl-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 rounded border-natural-border text-natural-primary focus:ring-natural-secondary cursor-pointer"
              />
              <div className="text-left">
                <span className="text-xs font-semibold text-natural-text block">Sincronización Automática</span>
                <span className="text-[9px] text-natural-secondary block">Actualiza el catálogo en segundo plano al cargar el sitio web.</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-natural-light-border/40">
          <button
            type="button"
            onClick={handleSheetsLiveSync}
            disabled={isSheetsSyncing || !sheetUrl}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isSheetsSyncing 
                ? 'bg-amber-100/80 text-amber-700 border-amber-200 cursor-not-allowed'
                : !sheetUrl
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-[#EBF7F5] text-[#137A63] border-[#D1F0EA] hover:bg-[#D1F0EA] hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSheetsSyncing ? 'animate-spin' : ''}`} />
            {isSheetsSyncing ? 'Sincronizando de Sheets...' : 'Guardar y Sincronizar'}
          </button>

          <button
            type="button"
            onClick={handleSaveSheetsConfig}
            disabled={isSheetsSyncing}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border bg-white text-natural-secondary hover:bg-natural-light-bg border-natural-border"
          >
            Solo Guardar URL
          </button>
        </div>

        {sheetsSyncResult && (
          <div className={`p-4 rounded-2xl border text-xs font-medium animate-fade-in ${
            sheetsSyncResult.type === 'success' 
              ? 'bg-[#EBF7F5] border-[#D1F0EA] text-[#137A63]' 
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {sheetsSyncResult.msg}
          </div>
        )}
      </div>

      {/* SECCIÓN RESPALDO Y SINCRONIZACIÓN DE BASE DE DATOS (DEBAJO DE NUEVAS HOJAS) */}
      <div className="space-y-4">
        <h4 className="font-serif italic text-natural-primary text-base font-bold pl-1 pt-2">Respaldos y Consolidación de Base de Datos</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tarjeta 1: Sincronizar con Google Firestore (Nube) */}
          <div className="bg-white border border-natural-border rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-700 border border-amber-200">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <h5 className="font-serif italic font-bold text-natural-primary text-xs">Sincronizar Nube</h5>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCloudSyncInfo(!showCloudSyncInfo)}
                  className="p-1 text-natural-secondary hover:text-natural-primary rounded-full hover:bg-natural-light-bg cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {showCloudSyncInfo && (
                <p className="text-[10px] text-natural-secondary leading-relaxed bg-[#FAF9F5] p-2.5 rounded-xl border border-natural-light-border animate-fade-in">
                  Escribe en vivo en la base de datos distribuida de Google Firestore en la Nube. Sincroniza stock, pedidos y títulos entre múltiples terminales de AI Studio.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleTriggerCloudSync}
                disabled={isCloudSyncing}
                className="w-full py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 disabled:opacity-50 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Cloud className={`w-4 h-4 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
                {isCloudSyncing ? 'Sincronizando...' : 'Publicar a Firestore'}
              </button>

              {cloudSyncResult && (
                <div className={`p-3 rounded-xl border text-[10px] font-medium ${
                  cloudSyncResult.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-850'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {cloudSyncResult.msg}
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta 2: Fijar como Predeterminados del Servidor */}
          <div className="bg-white border border-natural-border rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-800 border border-emerald-200">
                    <Database className="w-4 h-4" />
                  </div>
                  <h5 className="font-serif italic font-bold text-natural-primary text-xs">Fijar Predeterminados</h5>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServerSyncInfo(!showServerSyncInfo)}
                  className="p-1 text-natural-secondary hover:text-natural-primary rounded-full hover:bg-natural-light-bg cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {showServerSyncInfo && (
                <p className="text-[10px] text-natural-secondary leading-relaxed bg-[#FAF9F5] p-2.5 rounded-xl border border-natural-light-border animate-fade-in">
                  Escribe el catálogo y diseño actual directamente en el código de tu servidor de AI Studio (/src/data.ts y /src/types.ts) para persistirlo de fábrica al desplegar.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSyncToServer}
                disabled={isServerSyncing}
                className="w-full py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 disabled:opacity-50 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Database className={`w-4 h-4 ${isServerSyncing ? 'animate-spin' : ''}`} />
                {isServerSyncing ? 'Guardando en Servidor...' : 'Fijar en Código'}
              </button>

              {serverSyncResult && (
                <div className={`p-3 rounded-xl border text-[10px] font-medium ${
                  serverSyncResult.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-850'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {serverSyncResult.msg}
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta 3: Copia de Seguridad Física (.JSON) */}
          <div className="bg-white border border-natural-border rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#FAF8F5] rounded-xl text-natural-text border border-natural-border">
                    <Download className="w-4 h-4" />
                  </div>
                  <h5 className="font-serif italic font-bold text-natural-primary text-xs">Copia JSON</h5>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJsonBackupInfo(!showJsonBackupInfo)}
                  className="p-1 text-natural-secondary hover:text-natural-primary rounded-full hover:bg-natural-light-bg cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {showJsonBackupInfo && (
                <p className="text-[10px] text-natural-secondary leading-relaxed bg-[#FAF9F5] p-2.5 rounded-xl border border-natural-light-border animate-fade-in">
                  Exporta una copia local física de libros, pedidos y diseño en formato JSON, o importa backups previos al navegador.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2 px-4 bg-natural-primary hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                Exportar JSON
              </button>

              <div className="relative">
                <label className="w-full py-2 px-4 bg-white border border-[#A67B5B] text-[#A67B5B] hover:bg-[#A67B5B]/5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                  <Upload className="w-4 h-4" />
                  Importar JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL DE DESBLOQUEO */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative bg-white border border-natural-border rounded-3xl p-6 text-center max-w-sm w-full space-y-5 shadow-xl animate-scale-up">
            <button
              type="button"
              onClick={() => {
                setIsUnlockModalOpen(false);
                setPasswordInput('');
                setPasswordError('');
                setShowPassword(false);
              }}
              className="absolute top-4 right-4 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 bg-amber-700 text-white rounded-full flex items-center justify-center mx-auto shadow-xs border-0">
              <Lock className="w-5 h-5" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-serif italic text-natural-primary text-base font-bold">Modificar enlace Sheets</h3>
              <p className="text-xs text-natural-secondary leading-relaxed mx-auto max-w-[280px]">
                Ingresa la clave de administrador para desbloquear o borrar el enlace de Sheets.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="clave"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUnlock();
                    }
                  }}
                  className="w-full pl-10 pr-10 py-2 bg-[#FAF8F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none text-xs text-center font-mono font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-natural-secondary hover:text-natural-primary transition-colors cursor-pointer"
                  title={showPassword ? "Ocultar clave" : "Mostrar clave"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {passwordError && (
                <p className="text-red-500 text-[10px] font-semibold animate-pulse">{passwordError}</p>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="w-full px-4 py-2.5 bg-natural-primary hover:opacity-90 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  Desbloquear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
