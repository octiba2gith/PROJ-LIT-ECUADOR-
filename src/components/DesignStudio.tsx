import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
  Palette, 
  Type, 
  Settings, 
  RotateCcw, 
  Save, 
  Check, 
  Sparkles, 
  CornerDownRight, 
  BookOpen, 
  Sliders,
  Type as FontIcon,
  AlignLeft,
  Download,
  Upload,
  Database,
  RefreshCw,
  FileSpreadsheet,
  Info,
  Cloud,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
  Mail,
  Pencil,
  Shield,
  Users,
  Key
} from 'lucide-react';
import { LayoutDesignConfig, defaultDesignConfig, Book, Order } from '../types';
import { fetchBooksFromSheet } from '../googleSheets';

interface DesignStudioProps {
  config: LayoutDesignConfig;
  onChangeConfig: (newConfig: LayoutDesignConfig) => void;
  onSaveAsDeveloper: () => void;
  onReset: () => void;
  books: Book[];
  onUpdateBooks: (newBooks: Book[]) => void;
  orders: Order[];
  onUpdateOrders?: (newOrders: Order[]) => void;
  onUpdateSheetsConfig?: (url: string, autoSync: boolean) => Promise<void>;
  onForceSyncToCloud?: () => Promise<void>;
}

const PRESET_THEMES = [
  {
    name: 'Clásico Natural',
    desc: 'Paleta por defecto de bosque, terracota y lino ecológico.',
    config: defaultDesignConfig
  },
  {
    name: 'Brisa Natural',
    desc: 'Paleta refrescante con azul abisal, arena suave y acentos marinos.',
    config: {
      ...defaultDesignConfig,
      colorPrimary: '#2A4B7C',
      colorSecondary: '#6A7B8C',
      colorBg: '#F4F7F9',
      colorText: '#2C3539',
      colorLightBg: '#EAF0F4',
      colorBorder: '#D2DFE5',
      colorLightBorder: '#E2EFF4',
      colorAccentBorder: '#B5CAD3',
      colorTerracotta: '#318F91',
      colorCardBg: '#FFFFFF',
    }
  },
  {
    name: 'Café Natural',
    desc: 'Paleta acogedora inspirada en granos de cacao, canela y páginas antiguas.',
    config: {
      ...defaultDesignConfig,
      colorPrimary: '#704214',
      colorSecondary: '#8F7355',
      colorBg: '#FAF5EF',
      colorText: '#402F1D',
      colorLightBg: '#EFE6DC',
      colorBorder: '#E0D1C0',
      colorLightBorder: '#ECDDCF',
      colorAccentBorder: '#C8B49E',
      colorTerracotta: '#C05C33',
      colorCardBg: '#FFFFFF',
    }
  },
  {
    name: 'Noche Natural',
    desc: 'Paleta nocturna relajante con fondo carbón, gris oliva y relieves tierra.',
    config: {
      ...defaultDesignConfig,
      colorPrimary: '#A3B19B',
      colorSecondary: '#9D9A8D',
      colorBg: '#1E1F1A',
      colorText: '#E7E6E0',
      colorLightBg: '#2B2D26',
      colorBorder: '#3B3E35',
      colorLightBorder: '#4B4E44',
      colorAccentBorder: '#55594C',
      colorTerracotta: '#D9A273',
      colorCardBg: '#252720',
    }
  }
];

const SANS_FONTS = ['Inter', 'Space Grotesk', 'Outfit', 'Montserrat', 'Roboto', 'system-ui'];
const SERIF_FONTS = ['Libre Baskerville', 'Playfair Display', 'Lora', 'Georgia', 'Merriweather'];

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <span className="relative inline-block ml-1.5 z-30">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 inline-flex items-center text-natural-secondary hover:text-natural-primary transition-colors focus:outline-none cursor-pointer"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {isOpen && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-zinc-900 text-white text-[10px] leading-relaxed rounded-xl shadow-xl z-50 pointer-events-none transition-all block text-center font-normal font-sans normal-case">
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
          {text}
        </span>
      )}
    </span>
  );
};

interface EditableConfigFieldProps {
  label: string;
  fieldKey: keyof LayoutDesignConfig;
  isTextArea?: boolean;
  placeholder?: string;
  rows?: number;
  config: LayoutDesignConfig;
  onFieldSave: (key: keyof LayoutDesignConfig, value: any) => void;
  defaultVal: string;
  extraHelp?: string | React.ReactNode;
  maxLength?: number;
}

const EditableConfigField: React.FC<EditableConfigFieldProps> = ({
  label,
  fieldKey,
  isTextArea = false,
  placeholder,
  rows = 3,
  config,
  onFieldSave,
  defaultVal,
  extraHelp,
  maxLength
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(() => (config[fieldKey] as string) || defaultVal);

  // Sync temp value if config changes externally (e.g. on reset or preset change)
  React.useEffect(() => {
    setTempValue((config[fieldKey] as string) || defaultVal);
  }, [config, fieldKey, defaultVal]);

  const handleSave = () => {
    onFieldSave(fieldKey, tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue((config[fieldKey] as string) || defaultVal);
    setIsEditing(false);
  };

  const currentActiveValue = (config[fieldKey] as string) || defaultVal;

  return (
    <div className="space-y-1.5 p-4 rounded-2xl bg-[#FCFAF5] border border-natural-border/70 hover:border-natural-accent-border/60 transition-all shadow-2xs">
      <div className="flex justify-between items-center pb-1 border-b border-natural-light-border/40">
        <label className="text-[10px] font-bold uppercase tracking-wider text-natural-primary block">
          {label}
        </label>
        
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="p-1.5 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border border-green-200/50 rounded-lg transition-all cursor-pointer"
              title="Guardar Cambios"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="p-1.5 bg-red-50/50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200/40 rounded-lg transition-all cursor-pointer"
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-1.5 bg-green-50/50 hover:bg-green-100 text-green-600 hover:text-green-700 border border-green-200/40 rounded-lg transition-all cursor-pointer"
            title="Editar campo"
          >
            <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      <div className="relative">
        {isEditing ? (
          <>
            {isTextArea ? (
              <textarea
                rows={rows}
                value={tempValue}
                maxLength={maxLength}
                onChange={(e) => setTempValue(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white text-natural-text border-2 border-natural-accent-border rounded-xl outline-none shadow-sm focus:ring-1 focus:ring-natural-accent-border/40 transition-all font-medium"
                placeholder={placeholder || `Escribe el texto de ${label.toLowerCase()}`}
              />
            ) : (
              <input
                type="text"
                value={tempValue}
                maxLength={maxLength}
                onChange={(e) => setTempValue(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white text-natural-text border-2 border-natural-accent-border rounded-xl outline-none shadow-sm focus:ring-1 focus:ring-natural-accent-border/40 transition-all font-medium"
                placeholder={placeholder || `Escribe el texto de ${label.toLowerCase()}`}
              />
            )}
            {maxLength && (
              <div className="flex justify-end items-center mt-1 px-1">
                <span className={`text-[10px] font-bold transition-colors ${maxLength - tempValue.length <= 1 ? 'text-red-500 font-extrabold' : 'text-[#7A7768]'}`}>
                  {tempValue.length} / {maxLength} ({maxLength - tempValue.length})
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="p-3 bg-white text-zinc-500 border border-natural-border/40 rounded-xl text-xs font-semibold leading-relaxed select-all">
            {currentActiveValue ? (
              <span className="whitespace-pre-wrap">{currentActiveValue}</span>
            ) : (
              <span className="text-zinc-400 italic font-normal">No configurado (campo vacío)</span>
            )}
            {maxLength && (
              <div className="mt-2 flex justify-end items-center px-0.5 border-t border-dotted border-zinc-100/60 pt-1 text-[10px] font-bold">
                <span className={`transition-colors ${maxLength - currentActiveValue.length <= 1 ? 'text-red-500 font-extrabold' : 'text-zinc-400'}`}>
                  {currentActiveValue.length} / {maxLength} ({maxLength - currentActiveValue.length})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {extraHelp && (
        <div className="text-[10px] text-natural-secondary leading-normal italic">
          {extraHelp}
        </div>
      )}
    </div>
  );
};

export function DesignStudio({ 
  config, 
  onChangeConfig, 
  onSaveAsDeveloper, 
  onReset,
  books,
  onUpdateBooks,
  orders,
  onUpdateOrders,
  onUpdateSheetsConfig,
  onForceSyncToCloud
}: DesignStudioProps) {
  const [activeTab, setActiveTab ] = useState<'presets' | 'sheets' | 'windows' | 'admin_panel' | 'gmail_smtp' | 'icons_library'>('presets');
  const [subTab, setSubTab] = useState<'tema' | 'color' | 'fuente' | 'textos'>('tema');
  
  // States for Icon Pack Explorer
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [selectedIconCategory, setSelectedIconCategory] = useState<'all' | 'general' | 'literature' | 'commerce' | 'ui' | 'actions'>('all');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [customIconColor, setCustomIconColor] = useState(config.colorPrimary || '#424e3a');
  const [customIconSize, setCustomIconSize] = useState(48);
  const [customIconStroke, setCustomIconStroke] = useState(2);
  const [iconCopySuccess, setIconCopySuccess] = useState(false);
  const [sheetsSubTab, setSheetsSubTab] = useState<'datos' | 'sheets' | 'smtp'>('datos');
  const [windowsSubTab, setWindowsSubTab] = useState<'informativos' | 'alertas' | 'verificaciones' | 'plantillas_firebase'>('informativos');
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // States for database server synchronization
  const [isSyncing, setIsSyncing] = useState(false);

  // Get 3 actual titles from catalog to display in live preview instead of static literature ecuatoriana
  const fallbackPreviewItems = [
    { title: 'La Emancipada', author: 'Miguel Riofrío', category: 'Clásico', price: 12.50, stock: 15, coverColor: 'from-[#A34343] to-[#C08261]' },
    { title: 'Cumandá', author: 'Juan León Mera', category: 'Novela', price: 18.00, stock: 3, coverColor: 'from-[#4F6F52] to-[#86A789]' },
    { title: 'Huasipungo', author: 'Jorge Icaza', category: 'Realismo', price: 15.20, stock: 0, coverColor: 'from-[#1E3A8A] to-[#3B82F6]' }
  ];

  const previewItemsMapped = books && books.length > 0
    ? books.slice(0, 3).map((b, idx) => ({
        title: b.title,
        author: b.author,
        category: b.category,
        price: b.price ?? 12.50,
        stock: b.stock ?? 10,
        coverColor: b.coverColor || (idx === 0 ? 'from-[#A34343] to-[#C08261]' : idx === 1 ? 'from-[#4F6F52] to-[#86A789]' : 'from-[#1E3A8A] to-[#3B82F6]')
      }))
    : fallbackPreviewItems;

  const activePreviewItems = [...previewItemsMapped];
  while (activePreviewItems.length < 3) {
    const fallbackItem = fallbackPreviewItems[activePreviewItems.length];
    activePreviewItems.push(fallbackItem);
  }
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'err'; text: string } | null>(null);

  // States for Google Sheets in Developer mode
  const [devSheetUrl, setDevSheetUrl] = useState(config.googleSheetsUrl || '');
  const [devAutoSync, setDevAutoSync] = useState(config.googleSheetsAutoSync || false);
  const [devIsSyncingSheets, setDevIsSyncingSheets] = useState(false);
  const [devSheetsSyncResult, setDevSheetsSyncResult] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [devShowSheetsGuide, setDevShowSheetsGuide] = useState(false);

  // URL Protection lock states (for developer view)
  const [isUrlLocked, setIsUrlLocked] = useState(true);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [devShowPassword, setDevShowPassword] = useState(false);

  const handleUnlock = () => {
    if (passwordInput === 'admin') {
      setIsUrlLocked(false);
      setIsUnlockModalOpen(false);
      setPasswordError('');
      setPasswordInput('');
      setDevShowPassword(false);
    } else {
      setPasswordError('Clave de administrador incorrecta.');
    }
  };

  const handleDevSaveSheetsConfig = async () => {
    if (!onUpdateSheetsConfig) return;
    try {
      await onUpdateSheetsConfig(devSheetUrl, devAutoSync);
      setDevSheetsSyncResult({
        msg: "Configuración de Google Sheets guardada exitosamente.",
        type: 'success'
      });
      setTimeout(() => setDevSheetsSyncResult(null), 5000);
    } catch (err) {
      setDevSheetsSyncResult({
        msg: "Error al guardar la configuración.",
        type: 'error'
      });
      setTimeout(() => setDevSheetsSyncResult(null), 5000);
    }
  };

  const handleDevSheetsLiveSync = async () => {
    if (!devSheetUrl) {
      setDevSheetsSyncResult({
        msg: "Por favor, ingresa un enlace de Google Sheets primero.",
        type: 'error'
      });
      return;
    }
    
    setDevIsSyncingSheets(true);
    setDevSheetsSyncResult(null);
    try {
      if (onUpdateSheetsConfig) {
        await onUpdateSheetsConfig(devSheetUrl, devAutoSync);
      }
      
      const parsedBooks = await fetchBooksFromSheet(devSheetUrl);
      if (parsedBooks && parsedBooks.length > 0) {
        onUpdateBooks(parsedBooks);
        localStorage.setItem('lib_books', JSON.stringify(parsedBooks));
        
        if (onForceSyncToCloud) {
          await onForceSyncToCloud();
        }
        
        setDevSheetsSyncResult({
          msg: `¡Sincronización Completa! Se importaron ${parsedBooks.length} títulos exitosamente de Google Sheets y están disponibles en el catálogo en vivo.`,
          type: 'success'
        });
        setTimeout(() => setDevSheetsSyncResult(null), 7000);
      } else {
        setDevSheetsSyncResult({
          msg: "La sincronización se realizó, pero no se recuperó ningún libro. Comprueba las cabeceras de tus columnas.",
          type: 'error'
        });
        setTimeout(() => setDevSheetsSyncResult(null), 7000);
      }
    } catch (err: any) {
      console.error(err);
      setDevSheetsSyncResult({
        msg: err.message || "Error al conectar y procesar los datos de tu hoja.",
        type: 'error'
      });
      setTimeout(() => setDevSheetsSyncResult(null), 10000);
    } finally {
      setDevIsSyncingSheets(false);
    }
  };

  const handleFieldChange = (key: keyof LayoutDesignConfig, value: any) => {
    onChangeConfig({
      ...config,
      [key]: value
    });
  };

  const handleApplyPreset = (preset: typeof PRESET_THEMES[0]) => {
    onChangeConfig(preset.config);
  };

  const executeSave = () => {
    onSaveAsDeveloper();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      books,
      designConfig: config,
      orders,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', 'servicio_literatura_respaldo.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

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
        if (parsed.designConfig) {
          onChangeConfig(parsed.designConfig);
        }
        if (parsed.orders && Array.isArray(parsed.orders) && onUpdateOrders) {
          onUpdateOrders(parsed.orders);
        }
        alert('Copia de seguridad importada con éxito. Todos los cambios visuales y elementos del catálogo se han cargado en el navegador.');
      } catch (err) {
        alert('Error al leer el archivo de copia de seguridad. Asegúrate de que es un archivo JSON válido.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  const handleSyncToServer = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/save-catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          books,
          designConfig: config,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSyncStatus({
          type: 'success',
          text: '¡Operación exitosa! Los libros, categorías, descripciones e imágenes se guardaron directamente en los archivos del sistema (/src/data.ts y /src/types.ts). Al publicar/desplegar tu app, este catálogo y diseño aparecerán por defecto de fábrica.',
        });
      } else {
        setSyncStatus({
          type: 'err',
          text: 'Error del servidor: ' + (data.error || 'No se pudo guardar.'),
        });
      }
    } catch (err: any) {
      setSyncStatus({
        type: 'err',
        text: 'No se pudo contactar al servidor. Asegúrate de estar corriendo en el entorno de Google AI Studio.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div id="designer-studio-panel" className="bg-white rounded-3xl border border-natural-border shadow-md overflow-hidden animate-fade-in flex flex-col min-h-[580px]">
      <style dangerouslySetInnerHTML={{__html: `
        #designer-studio-panel,
        #designer-studio-panel :not(.live-preview-block):not(.live-preview-block *) {
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 13px !important;
        }

        #designer-studio-panel h3,
        #designer-studio-panel h4,
        #designer-studio-panel h5,
        #designer-studio-panel h6,
        #designer-studio-panel p,
        #designer-studio-panel span,
        #designer-studio-panel label,
        #designer-studio-panel button,
        #designer-studio-panel input,
        #designer-studio-panel select,
        #designer-studio-panel textarea,
        #designer-studio-panel div:not(.live-preview-block *) {
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 13px !important;
        }

        /* Hacer las cajas y contenedores de ajustes lo más compactos/ajustados posible */
        #designer-studio-panel .p-8,
        #designer-studio-panel .lg\:p-8,
        #designer-studio-panel .p-6,
        #designer-studio-panel .p-5,
        #designer-studio-panel .p-4 {
          padding: 10px !important;
        }

        #designer-studio-panel .px-4,
        #designer-studio-panel .px-3\.5 {
          padding-left: 8px !important;
          padding-right: 8px !important;
        }

        #designer-studio-panel .py-2\.5,
        #designer-studio-panel .py-2 {
          padding-top: 5px !important;
          padding-bottom: 5px !important;
        }

        #designer-studio-panel .p-3,
        #designer-studio-panel .p-3\.5 {
          padding: 8px !important;
        }

        /* Espaciados verticales y grillas más ajustados */
        #designer-studio-panel .space-y-4 > :not([hidden]) ~ :not([hidden]),
        #designer-studio-panel .space-y-5 > :not([hidden]) ~ :not([hidden]),
        #designer-studio-panel .space-y-6 > :not([hidden]) ~ :not([hidden]) {
          margin-top: 8px !important;
          margin-bottom: 0px !important;
        }

        #designer-studio-panel .gap-4,
        #designer-studio-panel .gap-5,
        #designer-studio-panel .gap-6 {
          gap: 8px !important;
        }

        #designer-studio-panel .gap-2,
        #designer-studio-panel .gap-2\.5 {
          gap: 4px !important;
        }

        #designer-studio-panel input,
        #designer-studio-panel select,
        #designer-studio-panel textarea,
        #designer-studio-panel button {
          padding-top: 4px !important;
          padding-bottom: 4px !important;
          padding-left: 8px !important;
          padding-right: 8px !important;
          height: auto !important;
          min-height: unset !important;
        }

        /* Excluir el contenedor del catálogo en vivo simulado para que mantenga sus fuentes y tamaños configurados */
        .live-preview-block * {
          font-family: inherit !important;
          font-size: inherit !important;
        }
        .live-preview-block .custom-item-title {
          font-family: inherit !important;
        }
        .live-preview-block .custom-item-author,
        .live-preview-block .custom-item-price,
        .live-preview-block .custom-item-stock {
          font-family: inherit !important;
        }

        /* Ajuste de espacio para móviles verticales (menos de 640px) */
        @media (max-width: 640px) {
          main {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            padding-left: 4px !important;
            padding-right: 4px !important;
          }
          #designer-studio-panel {
            margin-top: 0px !important;
            margin-bottom: 0px !important;
            border-radius: 12px !important;
            min-height: unset !important;
          }
          /* Espacio entre el panel de control superior y el estudio */
          .space-y-6 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 6px !important;
          }
          /* El contenedor del botón volver */
          div.animate-fade-in.mb-\[11\.4px\],
          div.animate-fade-in {
            padding: 8px 12px !important;
            margin-bottom: 4px !important;
            border-radius: 12px !important;
          }
          /* Reducción general de padding y espaciado de grids en el estudio */
          #designer-studio-panel .p-6,
          #designer-studio-panel .p-8 {
            padding: 8px !important;
          }
          #designer-studio-panel .space-y-5 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 6px !important;
          }
        }
      `}} />
      
      {/* Dynamic Selector Header Controls */}
      <div className="bg-natural-light-bg/40 border-b border-natural-border p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-natural-primary text-white flex items-center justify-center shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif italic font-bold text-natural-primary text-sm">Estudio de Diseño</h3>
              <span className="text-[10px] text-natural-secondary font-bold uppercase tracking-wider block">Estilos Globales</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={onReset}
              type="button"
              className="py-2 px-3 bg-[#FAF9F6] border border-natural-border hover:bg-natural-light-bg/50 text-natural-secondary hover:text-natural-text rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Valores</span>
            </button>

            <button
              onClick={executeSave}
              type="button"
              className="py-2.5 px-4 bg-natural-primary hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>¡Diseño Guardado!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content Workspace */}
      <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Navigation Bar / Integrated Top Tabs */}
        <div className="pb-3 -mt-3 relative">
          <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            {/* Left side: Horizontal active tabs with beautiful folder-style design and dynamic highlight lines */}
            <div className="flex items-end gap-1.5 md:gap-2.5 overflow-x-auto scrollbar-none px-4 pt-3.5 pb-0 bg-[#FAF9F5] border-b-2 border-natural-border rounded-t-2xl shrink-0 w-full">
              {[
                { id: 'presets', label: 'Interfaz', icon: Sparkles },
                { id: 'sheets', label: 'Datos y Sheets', icon: Database },
                { id: 'windows', label: 'Textos de correos', icon: Mail },
                { id: 'admin_panel', label: 'Panel administrador', icon: Shield },
                { id: 'icons_library', label: 'Biblioteca de Iconos', icon: Palette },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMoreOpen(false);
                    }}
                    className={`group relative pl-[8px] pr-5 pt-[10px] pb-[10px] mt-[5px] mb-[5px] ml-0 text-xs transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-2 rounded-none border ${
                      isActive
                         ? 'bg-white text-natural-text border-natural-border shadow-xs font-semibold'
                         : 'bg-transparent text-natural-secondary/70 hover:text-natural-text hover:bg-white/45 border-transparent font-semibold'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${isActive ? 'text-natural-primary' : 'text-natural-secondary/60 group-hover:text-natural-text'}`} />
                    <span className="relative z-10">{tab.label}</span>
                    
                    {/* Active and hover indicator line beneath the tab text */}
                    <span 
                      className={`absolute bottom-0 left-0 right-0 h-[3.5px] rounded-t-full transition-all duration-300 origin-center ${
                        isActive
                          ? 'bg-natural-primary scale-x-100 opacity-100'
                          : 'bg-natural-primary/50 scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
                      }`}
                    />
                    
                    {/* Optional top accent line indicator for extra noticeability */}
                    <span 
                      className={`absolute top-0 left-0 right-0 h-[3px] rounded-b-md transition-all duration-300 origin-center ${
                        isActive
                          ? 'bg-natural-primary scale-x-100 opacity-100'
                          : 'bg-natural-primary/40 scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Sub-navigation bar under "Interfaz" */}
        {activeTab === 'presets' && (
          <div className="flex gap-2 border-b border-natural-border pb-3 mb-2 overflow-x-auto scrollbar-none animate-fade-in">
            {[
              { id: 'tema', label: 'Tema' },
              { id: 'color', label: 'Color' },
              { id: 'fuente', label: 'Fuente' },
              { id: 'textos', label: 'Textos' }
            ].map((st) => {
              const isActive = subTab === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSubTab(st.id as any)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive 
                      ? 'bg-natural-primary text-white shadow-xs' 
                      : 'bg-white hover:bg-natural-light-bg/40 text-natural-secondary border border-natural-border hover:border-natural-accent-border/40'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        )}
        
        {activeTab === 'presets' && (
          <div className="space-y-6 animate-fade-in">
            {subTab === 'tema' && (
              <>
                <div>
                  <h4 className="font-serif italic text-natural-primary text-base">Inspiración e Identidad de Marca</h4>
                  <p className="text-xs text-natural-secondary mt-0.5">Elige un preset listo para comenzar a ver el cambio estético inmediato.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PRESET_THEMES.map((theme) => {
                    const isSelected = config.colorPrimary === theme.config.colorPrimary && config.colorBg === theme.config.colorBg;
                    return (
                      <button
                        key={theme.name}
                        onClick={() => handleApplyPreset(theme)}
                        className={`p-4 text-left rounded-3xl border transition-all relative flex flex-col gap-3 group overflow-hidden cursor-pointer ${
                          isSelected 
                            ? 'border-natural-primary bg-natural-light-bg/30 ring-2 ring-natural-primary/20 shadow-xs' 
                            : 'border-natural-border hover:border-natural-accent-border bg-white hover:shadow-md'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-serif italic font-bold text-xs text-natural-primary">{theme.name}</span>
                          {isSelected ? (
                            <span className="bg-natural-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Activo</span>
                          ) : (
                            <span className="text-[9px] bg-natural-light-bg text-natural-secondary group-hover:text-natural-primary transition-all font-bold px-2 py-0.5 rounded-full">Aplicar</span>
                          )}
                        </div>
                        
                        <p className="text-[11px] text-natural-secondary leading-relaxed">{theme.desc}</p>
                        
                        {/* Tiny Color Preview dots */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: theme.config.colorPrimary }} title="Primario" />
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: theme.config.colorBg }} title="Fondo" />
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: theme.config.colorCardBg }} title="Paneles" />
                          <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: theme.config.colorTerracotta }} title="Terracota/Acento" />
                          <span className="text-[9px] text-natural-secondary font-mono ml-auto">
                            {theme.config.fontSans} + {theme.config.fontSerif}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {subTab === 'color' && (
              <>
                {/* Divider or Section Title */}
                <div className="pt-4 border-t border-natural-border/60">
                  <h4 className="font-serif italic text-natural-primary text-base">Ajuste Milimétrico de Colores</h4>
                  <p className="text-xs text-natural-secondary mt-0.5">Elige los códigos hexadecimales para construir un lienzo único para el Servicio de Literatura.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Principal</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorPrimary}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorPrimary }}>
                      <input
                        type="color"
                        value={config.colorPrimary}
                        onChange={(e) => handleFieldChange('colorPrimary', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Secundario</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorSecondary}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorSecondary }}>
                      <input
                        type="color"
                        value={config.colorSecondary}
                        onChange={(e) => handleFieldChange('colorSecondary', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-[#FAF9F5]/40 flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Fondo Principal</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorBg}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorBg }}>
                      <input
                        type="color"
                        value={config.colorBg}
                        onChange={(e) => handleFieldChange('colorBg', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Texto Base</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorText}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorText }}>
                      <input
                        type="color"
                        value={config.colorText}
                        onChange={(e) => handleFieldChange('colorText', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Fondo Suave</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorLightBg}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorLightBg }}>
                      <input
                        type="color"
                        value={config.colorLightBg}
                        onChange={(e) => handleFieldChange('colorLightBg', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Terracota / Acento</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorTerracotta}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorTerracotta }}>
                      <input
                        type="color"
                        value={config.colorTerracotta}
                        onChange={(e) => handleFieldChange('colorTerracotta', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Borde Fuerte</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorBorder}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorBorder }}>
                      <input
                        type="color"
                        value={config.colorBorder}
                        onChange={(e) => handleFieldChange('colorBorder', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Borde Suave</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorLightBorder}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorLightBorder }}>
                      <input
                        type="color"
                        value={config.colorLightBorder}
                        onChange={(e) => handleFieldChange('colorLightBorder', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-natural-border/60 bg-white flex items-center justify-between gap-3">
                    <div className="space-y-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Fondo de Tarjeta</span>
                      <span className="font-mono text-[10px] text-zinc-400 block truncate">{config.colorCardBg}</span>
                    </div>
                    <div className="relative w-10 h-10 rounded-xl shrink-0 border border-natural-border/50 shadow-2xs overflow-hidden" style={{ backgroundColor: config.colorCardBg }}>
                      <input
                        type="color"
                        value={config.colorCardBg}
                        onChange={(e) => handleFieldChange('colorCardBg', e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {subTab === 'fuente' && (
              <>
                {/* Selector de Familias de Fuente */}
                <div className="pt-4 border-t border-natural-border/60 space-y-1">
                  <h4 className="font-serif italic text-natural-primary text-base">Familias de Fuentes Auténticas</h4>
                  <p className="text-xs text-natural-secondary mt-0.5">Define las tipografías para el catálogo principal, los artículos literarios y las vitrinas de compra.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-natural-border/60 bg-white space-y-2">
                    <label className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Fuente Principal (Sans-Serif)</label>
                    <div className="text-[10px] text-natural-secondary leading-relaxed mb-1.5">Usada para botones de llamado, listados de precios y campos legibles de inventario.</div>
                    <div className="flex flex-wrap gap-2">
                      {SANS_FONTS.map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => handleFieldChange('fontSans', font)}
                          className={`px-3 py-1.5 text-xs rounded-xl border font-sans select-none cursor-pointer transition-all ${
                            config.fontSans === font
                              ? 'bg-natural-primary text-white border-natural-primary font-bold shadow-2xs'
                              : 'bg-white hover:bg-natural-light-bg/40 text-natural-secondary border-natural-border hover:border-natural-accent-border/40'
                          }`}
                          style={{ fontFamily: font }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-natural-border/60 bg-white space-y-2">
                    <label className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Fuente Distintiva (Serif)</label>
                    <div className="text-[10px] text-natural-secondary leading-relaxed mb-1.5">Utilizada en encabezados líricos, títulos de catálogo y reflexiones de cada literatura.</div>
                    <div className="flex flex-wrap gap-2">
                      {SERIF_FONTS.map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => handleFieldChange('fontSerif', font)}
                          className={`px-3 py-1.5 text-xs rounded-xl border font-serif select-none cursor-pointer transition-all ${
                            config.fontSerif === font
                              ? 'bg-natural-primary text-white border-natural-primary font-bold shadow-2xs'
                              : 'bg-white hover:bg-natural-light-bg/40 text-natural-secondary border-natural-border hover:border-natural-accent-border/40'
                          }`}
                          style={{ fontFamily: font }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grid de Escalamiento H1-H5 y Elementos */}
                <div className="p-5 rounded-2xl border border-natural-border bg-white space-y-5 shadow-2xs">
                  <h5 className="font-serif italic text-sm text-natural-primary font-bold flex items-center gap-1.5 border-b border-natural-border/60 pb-2">
                    <Sliders className="w-4 h-4 text-natural-primary" />
                    Ajustes de Tamaño de Encabezados (H1 - H5) y Párrafos
                  </h5>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* H1 */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-[#FCFAF5]/30 flex flex-col justify-between">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block select-none">H1 Principal</label>
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH1', Math.max(20, (config.fontSizeH1 ?? 32) - 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronDown className="w-3.5 h-3.5" /></button>
                        <div className="flex-1 text-center font-mono text-[10px] font-bold text-natural-primary">{config.fontSizeH1 ?? 32}px</div>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH1', Math.min(64, (config.fontSizeH1 ?? 32) + 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronUp className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {/* H2 */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-[#FCFAF5]/30 flex flex-col justify-between">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block select-none">H2 Subtítulos</label>
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH2', Math.max(16, (config.fontSizeH2 ?? 24) - 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronDown className="w-3.5 h-3.5" /></button>
                        <div className="flex-1 text-center font-mono text-[10px] font-bold text-natural-primary">{config.fontSizeH2 ?? 24}px</div>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH2', Math.min(54, (config.fontSizeH2 ?? 24) + 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronUp className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {/* H3 */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-[#FCFAF5]/30 flex flex-col justify-between">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block select-none">H3 Secciones</label>
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH3', Math.max(14, (config.fontSizeH3 ?? 18) - 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronDown className="w-3.5 h-3.5" /></button>
                        <div className="flex-1 text-center font-mono text-[10px] font-bold text-natural-primary">{config.fontSizeH3 ?? 18}px</div>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH3', Math.min(44, (config.fontSizeH3 ?? 18) + 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronUp className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {/* H4 */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-[#FCFAF5]/30 flex flex-col justify-between">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block select-none">H4 Tarjetas</label>
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH4', Math.max(12, (config.fontSizeH4 ?? 16) - 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronDown className="w-3.5 h-3.5" /></button>
                        <div className="flex-1 text-center font-mono text-[10px] font-bold text-natural-primary">{config.fontSizeH4 ?? 16}px</div>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH4', Math.min(36, (config.fontSizeH4 ?? 16) + 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronUp className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {/* H5 */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-[#FCFAF5]/30 flex flex-col justify-between">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block select-none">H5 Etiquetas</label>
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH5', Math.max(10, (config.fontSizeH5 ?? 14) - 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronDown className="w-3.5 h-3.5" /></button>
                        <div className="flex-1 text-center font-mono text-[10px] font-bold text-natural-primary">{config.fontSizeH5 ?? 14}px</div>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeH5', Math.min(30, (config.fontSizeH5 ?? 14) + 1))}
                          className="w-7 h-7 rounded border border-natural-border hover:bg-natural-light-bg flex items-center justify-center text-natural-secondary hover:text-natural-primary cursor-pointer transition-all shadow-2xs"
                        ><ChevronUp className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {/* Párrafos */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-terracotta bg-[#FCFAF5]/30 flex flex-col justify-between">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-terracotta block select-none">Párrafos (p)</label>
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeParagraph', Math.max(10, (config.fontSizeParagraph ?? 13) - 1))}
                          className="w-7 h-7 rounded border border-natural-terracotta/40 hover:bg-[#FDF5E6]/60 flex items-center justify-center text-natural-terracotta hover:text-natural-terracotta/80 cursor-pointer transition-all shadow-2xs"
                        ><ChevronDown className="w-3.5 h-3.5" /></button>
                        <div className="flex-1 text-center font-mono text-[10px] font-bold text-natural-terracotta">{config.fontSizeParagraph ?? 13}px</div>
                        <button
                          type="button"
                          onClick={() => handleFieldChange('fontSizeParagraph', Math.min(24, (config.fontSizeParagraph ?? 13) + 1))}
                          className="w-7 h-7 rounded border border-natural-terracotta/40 hover:bg-[#FDF5E6]/60 flex items-center justify-center text-natural-terracotta hover:text-natural-terracotta/80 cursor-pointer transition-all shadow-2xs"
                        ><ChevronUp className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>

                  <h5 className="font-serif italic text-sm text-natural-primary font-bold flex items-center gap-1.5 border-b border-natural-border/60 pb-2 pt-3">
                    <Sliders className="w-4 h-4 text-natural-primary" />
                    Diseño de Elementos de Libros
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Título de libro */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-white shadow-2xs">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block">Título del Libro</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="range"
                          min="10"
                          max="30"
                          value={config.itemTitleSize ?? 13}
                          onChange={(e) => handleFieldChange('itemTitleSize', parseInt(e.target.value, 10))}
                          className="w-full accent-natural-primary cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-natural-primary min-w-[28px] text-right">{config.itemTitleSize ?? 13}px</span>
                      </div>
                    </div>
                    {/* Autor */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-white shadow-2xs">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block">Autor del Libro</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="range"
                          min="8"
                          max="24"
                          value={config.itemAuthorSize ?? 11}
                          onChange={(e) => handleFieldChange('itemAuthorSize', parseInt(e.target.value, 10))}
                          className="w-full accent-natural-primary cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-natural-primary min-w-[28px] text-right">{config.itemAuthorSize ?? 11}px</span>
                      </div>
                    </div>
                    {/* Precio */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-white shadow-2xs">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block">Precio de Venta</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="range"
                          min="10"
                          max="30"
                          value={config.itemPriceSize ?? 15}
                          onChange={(e) => handleFieldChange('itemPriceSize', parseInt(e.target.value, 10))}
                          className="w-full accent-natural-primary cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-natural-primary min-w-[28px] text-right">{config.itemPriceSize ?? 15}px</span>
                      </div>
                    </div>
                    {/* Stock */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-white shadow-2xs">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block">Stock de Inventario</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="range"
                          min="8"
                          max="22"
                          value={config.itemStockSize ?? 10}
                          onChange={(e) => handleFieldChange('itemStockSize', parseInt(e.target.value, 10))}
                          className="w-full accent-natural-primary cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-natural-primary min-w-[28px] text-right">{config.itemStockSize ?? 10}px</span>
                      </div>
                    </div>
                  </div>

                  <h5 className="font-serif italic text-sm text-natural-primary font-bold flex items-center gap-1.5 border-b border-natural-border/60 pb-2 pt-3">
                    <Sliders className="w-4 h-4 text-natural-primary" />
                    Bordes, Redondez del Lienzo y Separación de Grilla
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Redondeado */}
                    <div className="p-4 rounded-xl border border-natural-border bg-white space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-natural-primary block">Redondez de Bordes (Base)</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {(['square', 'soft', 'medium', 'large', 'organic'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleFieldChange('borderRadiusBase', r)}
                            className={`py-2 text-[9px] font-bold uppercase tracking-tight rounded-xl border transition-all cursor-pointer ${
                              config.borderRadiusBase === r
                                ? 'bg-natural-primary text-white border-natural-primary shadow-2xs'
                                : 'bg-white text-natural-secondary border-natural-border hover:bg-natural-light-bg/40'
                            }`}
                          >
                            {r === 'square' && 'Cuadrado'}
                            {r === 'soft' && 'Suave'}
                            {r === 'medium' && 'Medio'}
                            {r === 'large' && 'Grande'}
                            {r === 'organic' && 'Orgánico'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Espaciado */}
                    <div className="p-4 rounded-xl border border-natural-border bg-white space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-natural-primary block">Espaciado del Catálogo (Gaps)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['narrow', 'medium', 'large'] as const).map((space) => (
                          <button
                            key={space}
                            type="button"
                            onClick={() => handleFieldChange('itemSpacing', space)}
                            className={`py-2 text-[9px] font-bold uppercase tracking-tight rounded-xl border transition-all cursor-pointer ${
                              (config.itemSpacing ?? 'medium') === space
                                ? 'bg-natural-primary text-white border-natural-primary shadow-2xs'
                                : 'bg-white text-natural-secondary border-natural-border hover:bg-natural-light-bg/40'
                            }`}
                          >
                            {space === 'narrow' ? 'Estrecho (8px)' : space === 'large' ? 'Grande (25px)' : 'Medio (15px)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h5 className="font-serif italic text-sm text-natural-primary font-bold flex items-center gap-1.5 border-b border-natural-border/60 pb-2 pt-3">
                    <Sliders className="w-4 h-4 text-natural-primary" />
                    Tamaño del Logotipo y Menús en Barra de Encabezado
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Logotipo */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-white shadow-2xs">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block">Tamaño Logotipo</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="range"
                          min="24"
                          max="72"
                          value={config.headerLogoSize ?? 36}
                          onChange={(e) => handleFieldChange('headerLogoSize', parseInt(e.target.value, 10))}
                          className="w-full accent-natural-primary cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-natural-primary min-w-[28px] text-right">{config.headerLogoSize ?? 36}px</span>
                      </div>
                    </div>
                    {/* Texto encabezado */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-white shadow-2xs">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block">Título del Header</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="range"
                          min="10"
                          max="32"
                          value={config.headerTitleSize ?? 14}
                          onChange={(e) => handleFieldChange('headerTitleSize', parseInt(e.target.value, 10))}
                          className="w-full accent-natural-primary cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-natural-primary min-w-[28px] text-right">{config.headerTitleSize ?? 14}px</span>
                      </div>
                    </div>
                    {/* Iconos */}
                    <div className="space-y-1.5 p-3 rounded-xl border border-natural-border bg-white shadow-2xs">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-natural-primary block">Tamaño de Iconos</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="range"
                          min="10"
                          max="28"
                          value={config.headerIconSize ?? 14}
                          onChange={(e) => handleFieldChange('headerIconSize', parseInt(e.target.value, 10))}
                          className="w-full accent-natural-primary cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-natural-primary min-w-[28px] text-right">{config.headerIconSize ?? 14}px</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {subTab === 'textos' && (
              <>
                <div className="pt-4 border-t border-natural-border/60">
                  <h4 className="font-serif italic text-natural-primary text-base">Mensajes de Identidad, Encabezados y Firmas</h4>
                  <p className="text-xs text-natural-secondary mt-0.5">Controla la literatura exhibida en la portada central, barra de contacto y plantillas interactivas del sistema.</p>
                </div>

                <div className="p-5 rounded-2xl border border-natural-border bg-white space-y-6">
                  <h5 className="font-serif italic text-sm text-[#A67B5B] font-bold flex items-center gap-1.5 border-b border-natural-border/60 pb-2">
                    <AlignLeft className="w-4 h-4 text-[#A67B5B]" />
                    Textos de Cabecera, Portada Hero y Pie de Página Sello
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableConfigField
                      label="Título del Encabezado (Header)"
                      fieldKey="headerTitle"
                      config={config}
                      onFieldSave={handleFieldChange}
                      defaultVal="Servicio de Literatura Ecuador"
                      maxLength={60}
                    />

                    <EditableConfigField
                      label="Subtítulo del Encabezado"
                      fieldKey="headerSubtitle"
                      config={config}
                      onFieldSave={handleFieldChange}
                      defaultVal="Solicitud de Compras"
                      maxLength={50}
                    />

                    <EditableConfigField
                      label="Título Hero Principal (Bienvenida)"
                      fieldKey="heroTitle"
                      config={config}
                      onFieldSave={handleFieldChange}
                      defaultVal="Servicio de Literatura Ecuador"
                      maxLength={80}
                    />

                    <EditableConfigField
                      label="Subtítulo Hero Principal"
                      fieldKey="heroSubtitle"
                      config={config}
                      onFieldSave={handleFieldChange}
                      defaultVal=""
                      maxLength={200}
                    />
                  </div>

                  <div className="pt-2">
                    <EditableConfigField
                      label="Creador / Texto del Footer"
                      fieldKey="footerText"
                      config={config}
                      onFieldSave={handleFieldChange}
                      defaultVal="Servicio de Literatura Ecuador - Solicitudes de Compra y Pedidos"
                      extraHelp="Este mensaje de firma de derecho de autor y de contacto se integra automáticamente con el tamaño de párrafo configurado en la base de la aplicación."
                      maxLength={200}
                    />
                  </div>

                  <div className="pt-4 border-t border-natural-border/40 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('windows');
                        setWindowsSubTab('plantillas_firebase');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A67B5B]/10 hover:bg-[#A67B5B]/20 text-[#A67B5B] text-xs font-semibold rounded-xl border border-[#A67B5B]/30 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                    >
                      <Mail className="w-4 h-4 text-[#A67B5B]" />
                      Configurar Plantillas de Mensajes, Inicio de Sesión y Verificación de Firebase
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Quick Demo Preview Box in Editor */}
            {(subTab === 'tema' || subTab === 'color' || subTab === 'fuente') && (
              <div className="p-5 rounded-3xl border border-natural-border bg-[#FAF9F5]/40 mt-4">
                <h5 className="font-serif italic text-xs text-natural-primary font-bold mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-natural-terracotta" />
                  Muestra viva en este estudio
                </h5>
                <div className="p-4 rounded-2xl border border-natural-border bg-white space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h6 className="font-serif italic text-xs text-natural-primary">Ejemplo de Libro de Colección</h6>
                    <span className="font-mono text-[10px] text-natural-terracotta font-bold">$12.50 USD</span>
                  </div>
                  <p className="text-[11px] text-natural-secondary leading-relaxed">
                    Las ventanas fijas o flotantes adoptarán de inmediato los colores de panel seleccionados y la familia de fuentes configurada.
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button className="px-3 py-1 bg-natural-light-bg hover:bg-natural-accent-border/30 text-natural-secondary text-[10px] font-bold rounded-xl transition-all">
                      Cancelar
                    </button>
                    <button className="px-3.5 py-1 bg-natural-primary text-white text-[10px] font-bold rounded-xl shadow-xs">
                      Confirmar Acción
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unbalanced bracket cleanup portion 1 */}
        {false && (
          <>
            <div className={`bg-white border border-natural-border p-3 flex flex-col justify-between overflow-hidden shadow-xs transition-all duration-300 ${
                  config.borderRadiusBase === 'square' ? 'rounded-none' :
                  config.borderRadiusBase === 'soft' ? 'rounded-lg' :
                  config.borderRadiusBase === 'medium' ? 'rounded-xl' :
                  config.borderRadiusBase === 'large' ? 'rounded-2xl' :
                  'rounded-3xl'
                }`}>
                  <div>
                    {/* Cover */}
                    <div className="flex justify-center mb-3 select-none">
                      <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${activePreviewItems[0].coverColor.includes('from-') ? activePreviewItems[0].coverColor : `from-[#A34343] to-[#C08261]`} text-white flex flex-col justify-between p-3.5 relative overflow-hidden shadow-2xs`}>
                        <div className="absolute top-0 right-0 w-6 h-full bg-white/5 backdrop-blur-[1px] shadow-inner z-20" />
                        <div className="absolute top-0 inset-y-0 left-1.5 w-0.5 bg-black/10 z-20" />
                        <div className="absolute top-0 inset-y-0 left-2.5 w-px bg-white/20 z-20" />
                        <BookOpen className="w-5 h-5 opacity-40" />
                        <span className="font-serif italic font-extrabold text-[15px] select-none text-white/95 truncate">{activePreviewItems[0].title}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase font-bold tracking-widest bg-natural-light-bg text-natural-primary px-1.5 py-0.5 rounded-full inline-block border border-natural-accent-border/30">
                          {activePreviewItems[0].category || 'General'}
                        </span>
                      </div>
                      <h4 
                        className="font-serif italic leading-snug text-natural-primary overflow-hidden line-clamp-2 h-10 custom-item-title"
                        style={{ fontSize: `${config.itemTitleSize ?? 13}px` }}
                      >
                        {activePreviewItems[0].title}
                      </h4>
                      <p 
                        className="text-natural-secondary font-sans font-medium custom-item-author"
                        style={{ fontSize: `${config.itemAuthorSize ?? 11}px` }}
                      >
                        por {activePreviewItems[0].author}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-natural-light-border/75 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-natural-secondary font-medium">Precio:</span>
                      <span 
                        className="font-mono font-extrabold text-natural-primary custom-item-price"
                        style={{ fontSize: `${config.itemPriceSize ?? 15}px` }}
                      >
                        ${Number(activePreviewItems[0].price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center custom-item-stock">
                      <span className="text-[10px] text-natural-secondary font-medium">Existencias:</span>
                      <span 
                        className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          activePreviewItems[0].stock <= (config.lowStockThreshold ?? 5)
                            ? 'text-natural-terracotta bg-[#FDF5E6] border-[#F5E6CC]'
                            : 'text-natural-primary bg-natural-light-bg border-natural-accent-border'
                        }`}
                        style={{ fontSize: `${config.itemStockSize ?? 10}px` }}
                      >
                        {activePreviewItems[0].stock} u.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Libro 2 */}
                <div className={`bg-white border border-natural-border p-3 flex flex-col justify-between overflow-hidden shadow-xs transition-all duration-300 ${
                  config.borderRadiusBase === 'square' ? 'rounded-none' :
                  config.borderRadiusBase === 'soft' ? 'rounded-lg' :
                  config.borderRadiusBase === 'medium' ? 'rounded-xl' :
                  config.borderRadiusBase === 'large' ? 'rounded-2xl' :
                  'rounded-3xl'
                }`}>
                  <div>
                    {/* Cover */}
                    <div className="flex justify-center mb-3 select-none">
                      <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${activePreviewItems[1].coverColor.includes('from-') ? activePreviewItems[1].coverColor : `from-[#4F6F52] to-[#86A789]`} text-white flex flex-col justify-between p-3.5 relative overflow-hidden shadow-2xs`}>
                        <div className="absolute top-0 right-0 w-6 h-full bg-white/5 backdrop-blur-[1px] shadow-inner z-20" />
                        <div className="absolute top-0 inset-y-0 left-1.5 w-0.5 bg-black/10 z-20" />
                        <div className="absolute top-0 inset-y-0 left-2.5 w-px bg-white/20 z-20" />
                        <BookOpen className="w-5 h-5 opacity-40" />
                        <span className="font-serif italic font-extrabold text-[15px] select-none text-white/95 truncate">{activePreviewItems[1].title}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase font-bold tracking-widest bg-natural-light-bg text-natural-primary px-1.5 py-0.5 rounded-full inline-block border border-natural-accent-border/30">
                          {activePreviewItems[1].category || 'General'}
                        </span>
                      </div>
                      <h4 
                        className="font-serif italic leading-snug text-natural-primary overflow-hidden line-clamp-2 h-10 custom-item-title"
                        style={{ fontSize: `${config.itemTitleSize ?? 13}px` }}
                      >
                        {activePreviewItems[1].title}
                      </h4>
                      <p 
                        className="text-natural-secondary font-sans font-medium custom-item-author"
                        style={{ fontSize: `${config.itemAuthorSize ?? 11}px` }}
                      >
                        por {activePreviewItems[1].author}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-natural-light-border/75 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-natural-secondary font-medium">Precio:</span>
                      <span 
                        className="font-mono font-extrabold text-natural-primary custom-item-price"
                        style={{ fontSize: `${config.itemPriceSize ?? 15}px` }}
                      >
                        ${Number(activePreviewItems[1].price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center custom-item-stock">
                      <span className="text-[10px] text-natural-secondary font-medium">Existencias:</span>
                      <span 
                        className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          activePreviewItems[1].stock <= (config.lowStockThreshold ?? 5)
                            ? 'text-natural-terracotta bg-[#FDF5E6] border-[#F5E6CC] animate-pulse'
                            : 'text-natural-primary bg-natural-light-bg border-natural-accent-border'
                        }`}
                        style={{ fontSize: `${config.itemStockSize ?? 10}px` }}
                      >
                        {activePreviewItems[1].stock <= (config.lowStockThreshold ?? 5) ? `¡Últimas ${activePreviewItems[1].stock}!` : `${activePreviewItems[1].stock} u.`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Libro 3 */}
                <div className={`bg-white border border-natural-border p-3 flex flex-col justify-between overflow-hidden shadow-xs transition-all duration-300 ${
                  config.borderRadiusBase === 'square' ? 'rounded-none' :
                  config.borderRadiusBase === 'soft' ? 'rounded-lg' :
                  config.borderRadiusBase === 'medium' ? 'rounded-xl' :
                  config.borderRadiusBase === 'large' ? 'rounded-2xl' :
                  'rounded-3xl'
                }`}>
                  <div>
                    {/* Cover */}
                    <div className="flex justify-center mb-3 select-none">
                      <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${activePreviewItems[2].coverColor.includes('from-') ? activePreviewItems[2].coverColor : `from-[#78350F] to-[#D97706]`} text-white flex flex-col justify-between p-3.5 relative overflow-hidden shadow-2xs`}>
                        <div className="absolute top-0 right-0 w-6 h-full bg-white/5 backdrop-blur-[1px] shadow-inner z-20" />
                        <div className="absolute top-0 inset-y-0 left-1.5 w-0.5 bg-black/10 z-20" />
                        <div className="absolute top-0 inset-y-0 left-2.5 w-px bg-white/20 z-20" />
                        <BookOpen className="w-5 h-5 opacity-40" />
                        <span className="font-serif italic font-extrabold text-[15px] select-none text-white/95 truncate">{activePreviewItems[2].title}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase font-bold tracking-widest bg-natural-light-bg text-natural-primary px-1.5 py-0.5 rounded-full inline-block border border-natural-accent-border/30">
                          {activePreviewItems[2].category || 'General'}
                        </span>
                      </div>
                      <h4 
                        className="font-serif italic leading-snug text-natural-primary overflow-hidden line-clamp-2 h-10 custom-item-title"
                        style={{ fontSize: `${config.itemTitleSize ?? 13}px` }}
                      >
                        {activePreviewItems[2].title}
                      </h4>
                      <p 
                        className="text-natural-secondary font-sans font-medium custom-item-author"
                        style={{ fontSize: `${config.itemAuthorSize ?? 11}px` }}
                      >
                        por {activePreviewItems[2].author}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-natural-light-border/75 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-natural-secondary font-medium">Precio:</span>
                      <span 
                        className="font-mono font-extrabold text-natural-primary custom-item-price"
                        style={{ fontSize: `${config.itemPriceSize ?? 15}px` }}
                      >
                        ${Number(activePreviewItems[2].price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center custom-item-stock">
                      <span className="text-[10px] text-natural-secondary font-medium">Existencias:</span>
                      <span 
                        className={`inline-flex items-center font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                          activePreviewItems[2].stock <= (config.lowStockThreshold ?? 5)
                            ? 'text-natural-terracotta bg-[#FDF5E6] border-[#F5E6CC]'
                            : 'text-natural-primary bg-natural-light-bg border-natural-accent-border'
                        }`}
                        style={{ fontSize: `${config.itemStockSize ?? 10}px` }}
                      >
                        {activePreviewItems[2].stock} u.
                      </span>
                    </div>
                  </div>
                </div>
            </>
          )}

        {activeTab === 'sheets' && (
          <div className="space-y-6 animate-fade-in text-natural-text">
            {/* Sub-bar de navegación de Datos, Sheets, y SMTP */}
            <div className="flex gap-2 border-b border-natural-border pb-3 mb-2 overflow-x-auto scrollbar-none animate-fade-in">
              {[
                { id: 'datos', label: 'Datos', icon: Database },
                { id: 'sheets', label: 'Hoja de Sheets', icon: FileSpreadsheet },
                { id: 'smtp', label: 'Servidor (SMTP)', icon: Mail }
              ].map((st) => {
                const isActive = sheetsSubTab === st.id;
                const Icon = st.icon;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSheetsSubTab(st.id as any)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-natural-primary text-white shadow-xs font-bold' 
                        : 'bg-white hover:bg-natural-light-bg/40 text-natural-secondary border border-natural-border hover:border-natural-accent-border/40'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-natural-secondary/80'}`} />
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Pestaña 1: Datos */}
            {sheetsSubTab === 'datos' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h4 className="font-serif italic text-natural-primary text-base font-bold">Copia de Seguridad y Sincronización de Base de Datos</h4>
                  <p className="text-xs text-natural-secondary mt-0.5">Salva, respalda o publica los datos de tus libros, stock, imágenes y preferencias visuales de forma permanente.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Box 1: Sincronización en Caliente / Servidor (para el Desarrollador) */}
                  <div className="p-5 bg-white border border-natural-border rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-natural-primary" />
                        <h5 className="font-serif italic font-bold text-natural-primary text-xs">Alineación Permanente con Servidor</h5>
                      </div>
                      <p className="text-[11px] text-natural-secondary leading-relaxed">
                        Si agregaste libros, subiste imágenes o cambiaste descripciones en este navegador de AI Studio y deseas que estén disponibles <strong>para todos tus visitantes</strong> en la versión publicada, presiona este botón para escribir los datos en tus archivos físicos del proyecto.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={handleSyncToServer}
                        disabled={isSyncing}
                        className="w-full py-2 px-4 bg-natural-primary hover:bg-natural-primary/95 text-white disabled:opacity-55 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSyncing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Guardando en el Sistema...</span>
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4" />
                            <span>Fijar como Predeterminados del Servidor</span>
                          </>
                        )}
                      </button>

                      {syncStatus && !syncStatus.text.includes('Firestore') && (
                        <div className={`p-3 rounded-xl border text-[11px] font-medium leading-relaxed ${
                          syncStatus.type === 'success' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                          {syncStatus.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Box 2: Copia de Seguridad Física (.json) */}
                  <div className="p-5 bg-white border border-natural-border rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="w-4 h-4 text-[#A67B5B]" />
                        <h5 className="font-serif italic font-bold text-natural-primary text-xs">Copia de Seguridad Portátil (JSON)</h5>
                      </div>
                      <p className="text-[11px] text-natural-secondary leading-relaxed">
                        Descarga toda la base de datos de libros, diseño de colores y pedidos a un solo archivo JSON local, o carga una copia previa en cualquier navegador para restaurar tu catálogo de forma instantánea.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={handleExportBackup}
                        className="w-full py-2 px-4 bg-[#A67B5B] hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        Exportar Copia (.JSON)
                      </button>

                      <div className="relative">
                        <label className="w-full py-2 px-4 bg-white border border-[#A67B5B] text-[#A67B5B] hover:bg-[#A67B5B]/5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                          <Upload className="w-4 h-4" />
                          Importar Copia (.JSON)
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

                  {/* Box 3: Sincronización en la Nube (Google Firestore) */}
                  {onForceSyncToCloud && (
                    <div className="p-5 bg-white border border-natural-border rounded-2xl flex flex-col justify-between space-y-4 shadow-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Cloud className="w-4 h-4 text-emerald-600" />
                          <h5 className="font-serif italic font-bold text-natural-primary text-xs">Sincronización en la Nube (Google Firestore)</h5>
                        </div>
                        <p className="text-[11px] text-natural-secondary leading-relaxed font-sans">
                          Sincroniza en tiempo real de forma distribuida todos tus libros, estados de inventario y pedidos con Google Firestore en la Nube de Google Cloud para uso multidispositivo.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={async () => {
                            setIsSyncing(true);
                            setSyncStatus(null);
                            try {
                              await onForceSyncToCloud();
                              setSyncStatus({
                                type: 'success',
                                text: '¡Operación exitosa! Todos tus libros, configuraciones de diseño y pedidos locales se han consolidado de manera fluida en Google Firestore.',
                              });
                            } catch (err: any) {
                              setSyncStatus({
                                type: 'err',
                                text: 'Error al sincronizar con Firestore: ' + (err.message || err),
                              });
                            } finally {
                              setIsSyncing(false);
                            }
                          }}
                          disabled={isSyncing}
                          className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-55 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                          <span>{isSyncing ? 'Sincronizando Nube...' : 'Sincronizar Nube'}</span>
                        </button>

                        {syncStatus && syncStatus.text.includes('Firestore') && (
                          <div className={`p-3 rounded-xl border text-[11px] font-medium leading-relaxed ${
                            syncStatus.type === 'success' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 animate-fade-in' 
                              : 'bg-red-50 border-red-200 text-red-800 animate-fade-in'
                          }`}>
                            {syncStatus.text}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* General instructions regarding how this binds with the deployment */}
                <div className="p-4 rounded-2xl border border-natural-border/60 bg-[#FAF9F5]/50 mt-4">
                  <h6 className="text-[10px] font-bold uppercase tracking-wider text-natural-primary">Guía rápida de sincronización</h6>
                  <p className="text-[11px] text-natural-secondary leading-relaxed mt-1">
                    La aplicación utiliza <strong>localStorage</strong> del explorador para la persistencia local. Al hacer clic en <strong>Fijar como Predeterminados</strong>, escribimos el estado actual del catálogo sobre los archivos de código fuente <code>src/data.ts</code> y <code>src/types.ts</code> en tu espacio de trabajo. Tu próximo redespliegue de producción heredará automáticamente estos cambios como los nuevos valores iniciales.
                  </p>
                </div>
              </div>
            )}

            {/* Pestaña 2: Hoja de Sheets */}
            {sheetsSubTab === 'sheets' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h4 className="font-serif italic text-natural-primary text-base font-bold">Importación Masiva de Hojas de cálculo (Google Sheets)</h4>
                  <p className="text-xs text-natural-secondary mt-0.5">Sintoniza y reestructura el catálogo de libros, stock, imágenes y descuentos directamente desde una hoja en la nube pública.</p>
                </div>

                <div className="p-5 bg-white border border-natural-border rounded-2xl space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-natural-light-border pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-natural-primary">Configurar Enlace de Google Sheets</span>
                    <button
                      type="button"
                      onClick={() => setDevShowSheetsGuide(!devShowSheetsGuide)}
                      className="text-xs font-semibold text-natural-terracotta hover:text-natural-primary flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Info className="w-4 h-4" />
                      {devShowSheetsGuide ? 'Ocultar Guía de Columnas' : 'Ver Guía de Columnas'}
                    </button>
                  </div>

                  {devShowSheetsGuide && (
                    <div className="bg-[#FAF9F5] border border-dashed border-natural-accent-border/60 rounded-xl p-3 text-xs text-natural-secondary space-y-2 animate-fade-in">
                      <p className="font-bold text-natural-text">Requisitos de Columnas (Fila 1):</p>
                      <p>Asegúrate de que tu hoja tenga cabeceras como: <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border">Título, Autor, Categoría, Precio, Stock, Descripción, Imagen Portada, Descuento Tipo, Descuento Valor</span>.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-natural-primary tracking-wider font-semibold flex items-center gap-1.5">
                          <span>Enlace de Google Sheets</span>
                          {isUrlLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold select-none">
                              <Lock className="w-3 h-3 text-amber-600" /> 🔒 Protegido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold select-none">
                              <Unlock className="w-3 h-3 text-emerald-600" /> 🔓 Desbloqueado
                            </span>
                          )}
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="url"
                          value={devSheetUrl}
                          onChange={(e) => {
                            if (isUrlLocked) return;
                            setDevSheetUrl(e.target.value);
                          }}
                          onClick={() => {
                            if (isUrlLocked) {
                              setIsUnlockModalOpen(true);
                            }
                          }}
                          readOnly={isUrlLocked}
                          className={`w-full pl-10 pr-20 py-2 bg-[#FAF8F5] text-natural-text border rounded-xl outline-none text-xs font-mono transition-all duration-200 ${
                            isUrlLocked 
                              ? 'border-natural-border text-natural-secondary cursor-pointer bg-natural-light-bg/50 select-none' 
                              : 'border-natural-border focus:border-natural-accent-border'
                          }`}
                          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                          {isUrlLocked ? (
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                        </div>
                        
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (isUrlLocked) {
                                setIsUnlockModalOpen(true);
                              } else {
                                setIsUrlLocked(true);
                              }
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-all ${
                              isUrlLocked 
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60' 
                                : 'bg-emerald-50 hover:bg-emerald-100 text-[#137A63] border-emerald-200/60'
                            }`}
                          >
                            {isUrlLocked ? 'Activar' : 'Bloquear'}
                          </button>
                        </div>
                      </div>
                      {isUrlLocked && (
                        <p className="text-[10px] text-amber-800 font-medium flex items-center gap-1 mt-1 pl-1">
                          <span>🔒</span> Enlace protegido. Presiona "Activar" para modificarlo o borrarlo con clave de administrador.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center pb-2.5 pl-1 select-none">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={devAutoSync}
                          onChange={(e) => setDevAutoSync(e.target.checked)}
                          className="w-4 h-4 rounded border-natural-border text-natural-primary focus:ring-natural-secondary cursor-pointer"
                        />
                        <div className="text-left">
                          <span className="text-xs font-semibold text-natural-text">Sincronización Automática</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2 border-t border-natural-light-border">
                    <button
                      type="button"
                      onClick={handleDevSheetsLiveSync}
                      disabled={devIsSyncingSheets || !devSheetUrl}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        devIsSyncingSheets 
                          ? 'bg-amber-100/85 text-amber-700 border-amber-200'
                          : !devSheetUrl
                            ? 'bg-gray-50 text-gray-450 border-gray-200 cursor-not-allowed'
                            : 'bg-[#EBF7F5] text-[#137A63] border-[#D1F0EA] hover:bg-[#D1F0EA]'
                      }`}
                    >
                      <RefreshCw className={`w-4 h-4 ${devIsSyncingSheets ? 'animate-spin' : ''}`} />
                      {devIsSyncingSheets ? 'Ejecutando Sincronización...' : 'Guardar y Sincronizar'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDevSaveSheetsConfig}
                      className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border bg-white text-natural-secondary hover:bg-natural-light-bg border-natural-border"
                    >
                      Solo Guardar URL
                    </button>
                  </div>

                  {devSheetsSyncResult && (
                    <div className={`p-3 rounded-xl border text-xs font-medium animate-fade-in ${
                      devSheetsSyncResult.type === 'success' 
                        ? 'bg-[#EBF7F5] border-[#D1F0EA] text-[#137A63]' 
                        : 'bg-red-50 border-red-100 text-red-700'
                    }`}>
                      {devSheetsSyncResult.msg}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pestaña 3: Servidor (SMTP) */}
            {sheetsSubTab === 'smtp' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#A67B5B] shrink-0" />
                    <h4 className="font-serif italic text-natural-primary text-base font-bold">Servidor de Correo de Pedidos (Gmail SMTP)</h4>
                  </div>
                  <p className="text-xs text-natural-secondary mt-0.5">
                    Configura una cuenta de Gmail emisora para enviar alertas y confirmaciones de pedidos de forma 100% gratuita al administrador y al lector.
                  </p>
                </div>

                <div className="p-6 bg-white border border-natural-border rounded-3xl space-y-5 shadow-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* GMAIL USER */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-natural-primary block">
                        Correo Emisor (Gmail)
                      </label>
                      <input
                        type="email"
                        value={config.gmailUser || ''}
                        onChange={(e) => handleFieldChange('gmailUser', e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF9F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none shadow-xs font-medium"
                        placeholder="ejemplo.biblioteca@gmail.com"
                      />
                      <p className="text-[10px] text-natural-secondary leading-normal">
                        La dirección de Gmail que enviará las alertas de pedido. Puede ser una dirección gratuita personal.
                      </p>
                    </div>

                    {/* ADMIN EMAIL */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-natural-primary block">
                        Correo del Administrador (Receptor)
                      </label>
                      <input
                        type="email"
                        value={config.adminEmail || ''}
                        onChange={(e) => handleFieldChange('adminEmail', e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-[#FAF9F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none shadow-xs font-medium"
                        placeholder="admin@literatura.ec"
                      />
                      <p className="text-[10px] text-natural-secondary leading-normal">
                        La dirección de correo donde el administrador central recibirá los detalles de toda compra/pedido registrado.
                      </p>
                    </div>
                  </div>

                  {/* GMAIL APP PASSWORD */}
                  <div className="space-y-1 max-w-xl">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-natural-primary block">
                      Contraseña de Aplicación de Gmail (App Password)
                    </label>
                    <div className="relative">
                      <input
                        type={devShowPassword ? "text" : "password"}
                        value={config.gmailAppPass || ''}
                        onChange={(e) => handleFieldChange('gmailAppPass', e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2 text-xs bg-[#FAF9F5] text-natural-text border border-natural-border focus:border-natural-accent-border rounded-xl outline-none shadow-xs font-mono font-bold"
                        placeholder="xxxx xxxx xxxx xxxx"
                      />
                      <button
                        type="button"
                        onClick={() => setDevShowPassword(!devShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-natural-secondary hover:text-natural-primary transition-colors cursor-pointer"
                        title={devShowPassword ? "Ocultar Contraseña" : "Mostrar Contraseña"}
                      >
                        {devShowPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-natural-secondary leading-normal">
                      Por seguridad, Google requiere usar una <strong>Contraseña de Aplicación de 16 letras</strong> generada en la configuración de seguridad de tu cuenta Google, en lugar de tu contraseña común.
                    </p>
                  </div>

                  {/* INSTRUCTIONAL ACCENT PANEL */}
                  <div className="p-5 bg-amber-50/40 border border-amber-200/60 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Info className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold">¿Cómo generar tu Contraseña de Aplicación Gratis?</span>
                    </div>
                    <ol className="list-decimal list-inside text-[11px] text-[#5c5035]/90 space-y-1 leading-relaxed">
                      <li>Inicia sesión con tu correo (nuevo o existente) en <a href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-950">myaccount.google.com</a>.</li>
                      <li>Dirígete a la pestaña de <strong>Seguridad</strong> en el menú lateral.</li>
                      <li>Activa la <strong>Verificación en 2 pasos</strong> de Google (es obligatoria para poder generar contraseñas de app).</li>
                      <li>Busca en el buscador de la cuenta o dentro de "Inicio de sesión en Google" la opción de <strong>Contraseñas de aplicación</strong>.</li>
                      <li>Escribe un nombre identificador (ej. <em className="font-medium font-serif italic text-amber-950">"Libros Ecuador"</em>) y presiona <strong>Crear</strong>.</li>
                      <li>Copia el <strong>código amarillo de 16 caracteres</strong> que te proveerá Google y pégalo sin espacios en el formulario superior.</li>
                      <li>¡Es completamente gratis y protege tu cuenta real, ya que no expones tu clave de inicio de sesión!</li>
                    </ol>
                  </div>

                  {/* ACTIONS */}
                  <div className="pt-4 border-t border-natural-light-border flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-left space-y-0.5">
                      <p className="text-xs font-bold text-[#4D623F]">Costo de Implementación: ¡Totalmente Gratis!</p>
                      <p className="text-[10px] text-natural-secondary">
                        Nodemailer con servidores SMTP de Gmail no genera cobros ni tarifas mensuales fijas de correo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={executeSave}
                      className="px-6 py-2.5 bg-amber-700 hover:bg-amber-850 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Save className="w-4 h-4" />
                      <span>Aplicar y Guardar Servidor SMTP</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'windows' && (
          <div className="space-y-6 animate-fade-in text-natural-text">
            <div>
              <h4 className="font-serif italic text-natural-primary text-base">Textos de correos y ventanas</h4>
              <p className="text-xs text-natural-secondary mt-0.5">
                Personaliza todos los textos, descripciones, botones y mensajes de las ventanas de registro, inicio de sesión y validación de correos.
              </p>
            </div>

            {/* Sub-navigation bar under "Textos de correos" */}
            <div className="flex gap-2 border-b border-natural-border pb-3 mb-2 overflow-x-auto scrollbar-none animate-fade-in">
              {[
                { id: 'informativos', label: 'Mensajes informativos' },
                { id: 'alertas', label: 'Alertas' },
                { id: 'verificaciones', label: 'Verificaciones' },
                { id: 'plantillas_firebase', label: 'Plantillas de Firebase' }
              ].map((st) => {
                const isActive = windowsSubTab === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setWindowsSubTab(st.id as any)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      isActive 
                        ? 'bg-natural-primary text-white shadow-xs' 
                        : 'bg-white hover:bg-natural-light-bg/40 text-natural-secondary border border-natural-border hover:border-natural-accent-border/40'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* SECTION 1: Subtextos de Bienvenida */}
            {windowsSubTab === 'informativos' && (
              <div className="p-5 bg-white border border-natural-border rounded-2xl space-y-4 shadow-xs">
              <h5 className="text-xs font-bold uppercase tracking-wider text-natural-primary border-b border-natural-light-border pb-2">
                1. Textos Informativos de Entrada (Subtítulos de Bienvenida)
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <EditableConfigField
                  label="Subtexto - Pantalla de Ingreso/Login"
                  fieldKey="textWelcomeSubtextLogin"
                  isTextArea
                  rows={3}
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textWelcomeSubtextLogin || ''}
                  maxLength={180}
                />
                <EditableConfigField
                  label="Subtexto - Pantalla de Registro"
                  fieldKey="textWelcomeSubtextRegister"
                  isTextArea
                  rows={3}
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textWelcomeSubtextRegister || ''}
                  maxLength={180}
                />
                <EditableConfigField
                  label="Subtexto - Recuperar Contraseña"
                  fieldKey="textWelcomeSubtextForgot"
                  isTextArea
                  rows={3}
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textWelcomeSubtextForgot || ''}
                  maxLength={180}
                />
              </div>
            </div>
            )}

            {/* SECTION 2: Alertas de Registro Exitoso */}
            {windowsSubTab === 'alertas' && (
              <div className="p-5 bg-white border border-natural-border rounded-2xl space-y-4 shadow-xs animate-fade-in">
              <h5 className="text-xs font-bold uppercase tracking-wider text-natural-primary border-b border-natural-light-border pb-2">
                2. Alertas de Registro Completado
              </h5>
              <div className="space-y-4">
                <EditableConfigField
                  label="Registro con Envío de Correo (Firebase Auth)"
                  fieldKey="textRegisterSuccessEmail"
                  isTextArea
                  rows={2}
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textRegisterSuccessEmail || ''}
                  extraHelp={
                    <span>
                      Usa <strong className="font-mono text-[9px] bg-zinc-100 px-1 py-0.5 rounded text-black">{`{email}`}</strong> para insertar dinámicamente el correo electrónico del lector.
                    </span>
                  }
                  maxLength={180}
                />

                <EditableConfigField
                  label="Registro Directo en Base de Datos (Sin correo de validación)"
                  fieldKey="textRegisterSuccessNoAuth"
                  isTextArea
                  rows={2}
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textRegisterSuccessNoAuth || ''}
                  maxLength={180}
                />
              </div>
            </div>
            )}

            {/* SECTION 3: Ventana de Validación de Correo */}
            {windowsSubTab === 'verificaciones' && (
              <div className="p-5 bg-white border border-natural-border rounded-2xl space-y-4 shadow-xs animate-fade-in">
              <h5 className="text-xs font-bold uppercase tracking-wider text-natural-primary border-b border-natural-light-border pb-2">
                3. Pantalla de Verificación de Correo Requerida
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <EditableConfigField
                  label="Título de la Ventana"
                  fieldKey="textVerificationRequiredTitle"
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textVerificationRequiredTitle || ''}
                />
                <EditableConfigField
                  label="Línea de Saludo Inicial"
                  fieldKey="textVerificationRequiredSalutation"
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textVerificationRequiredSalutation || ''}
                  extraHelp={
                    <span>
                      Usa <strong className="font-mono text-[9px] bg-zinc-100 px-1 py-0.5 rounded text-black">{`{name}`}</strong> para insertar el nombre del usuario dinámicamente.
                    </span>
                  }
                />
              </div>

              <EditableConfigField
                label="Párrafo de Instrucciones (Detalle del proceso)"
                fieldKey="textVerificationRequiredInstructions"
                isTextArea
                rows={2}
                config={config}
                onFieldSave={handleFieldChange}
                defaultVal={defaultDesignConfig.textVerificationRequiredInstructions || ''}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <EditableConfigField
                  label="Texto Botón: Comprobar Estado"
                  fieldKey="textVerificationRequiredCheckBtn"
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textVerificationRequiredCheckBtn || ''}
                />
                <EditableConfigField
                  label="Texto Botón: Reenviar Enlace"
                  fieldKey="textVerificationRequiredResendBtn"
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textVerificationRequiredResendBtn || ''}
                />
                <EditableConfigField
                  label="Texto Botón: Cancelar"
                  fieldKey="textVerificationRequiredCancelBtn"
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textVerificationRequiredCancelBtn || ''}
                />
              </div>
            </div>
            )}

            {windowsSubTab === 'plantillas_firebase' && (
              <div className="p-5 bg-white border border-natural-border rounded-2xl space-y-6 shadow-xs animate-fade-in text-natural-text">
                <div>
                  <h5 className="font-serif italic text-sm text-[#A67B5B] font-bold flex items-center gap-1.5 border-b border-natural-border/60 pb-2">
                    <Mail className="w-4 h-4 text-[#A67B5B]" />
                    Plantillas de Mensajes, Inicio de Sesión y Verificación de Firebase
                  </h5>
                  <p className="text-xs text-natural-secondary mt-1">
                    Ajusta de manera integrada todos los textos y flujos relacionados con el registro, inicio de sesión y validación de correos electrónicos.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-natural-text">
                  <EditableConfigField
                    label="Ayuda del Registro (Formulario)"
                    fieldKey="textWelcomeSubtextRegister"
                    isTextArea
                    rows={2}
                    config={config}
                    onFieldSave={handleFieldChange}
                    defaultVal={defaultDesignConfig.textWelcomeSubtextRegister || "Regístrate gratis para acceder a todos los items de Living Stream Ministry"}
                  />

                  <EditableConfigField
                    label="Ayuda de Login (Formulario)"
                    fieldKey="textWelcomeSubtextLogin"
                    isTextArea
                    rows={2}
                    config={config}
                    onFieldSave={handleFieldChange}
                    defaultVal={defaultDesignConfig.textWelcomeSubtextLogin || "Ingresa tu correo y contraseña para navegar el catálogo y pedir libros"}
                  />

                  <EditableConfigField
                    label="Ayuda de Olvidé Clave (Formulario)"
                    fieldKey="textWelcomeSubtextForgot"
                    isTextArea
                    rows={2}
                    config={config}
                    onFieldSave={handleFieldChange}
                    defaultVal={defaultDesignConfig.textWelcomeSubtextForgot || "Ingresa tu correo para validar y actualizar tus datos"}
                  />

                  <EditableConfigField
                    label="Éxito de Registro con Enlace de Firebase"
                    fieldKey="textRegisterSuccessEmail"
                    isTextArea
                    rows={3}
                    config={config}
                    onFieldSave={handleFieldChange}
                    defaultVal={defaultDesignConfig.textRegisterSuccessEmail || "¡Registro exitoso! Un enlace de verificación de Firebase fue enviado a tu correo: {email}. Abre el correo y activa tu cuenta para ingresar."}
                  />

                  <EditableConfigField
                    label="Éxito de Registro No-Auth (Fallback)"
                    fieldKey="textRegisterSuccessNoAuth"
                    isTextArea
                    rows={3}
                    config={config}
                    onFieldSave={handleFieldChange}
                    defaultVal={defaultDesignConfig.textRegisterSuccessNoAuth || "¡Registro exitoso en la base de datos! (Nota: Proveedor de Auth no configurado, acceso directo habilitado)."}
                  />

                  <div className="space-y-4">
                    <EditableConfigField
                      label="Verificación de Correo - Título Ventana"
                      fieldKey="textVerificationRequiredTitle"
                      config={config}
                      onFieldSave={handleFieldChange}
                      defaultVal={defaultDesignConfig.textVerificationRequiredTitle || "Verificación de Correo Requerida"}
                    />

                    <EditableConfigField
                      label="Verificación de Correo - Saludo"
                      fieldKey="textVerificationRequiredSalutation"
                      config={config}
                      onFieldSave={handleFieldChange}
                      defaultVal={defaultDesignConfig.textVerificationRequiredSalutation || "Hola {name}, hemos enviado un enlace de confirmación a:"}
                    />
                  </div>
                </div>

                <EditableConfigField
                  label="Verificación de Correo - Instrucciones del Diálogo"
                  fieldKey="textVerificationRequiredInstructions"
                  isTextArea
                  rows={3}
                  config={config}
                  onFieldSave={handleFieldChange}
                  defaultVal={defaultDesignConfig.textVerificationRequiredInstructions || "Por favor, abre tu bandeja de entrada (revisa también Spam) y haz clic en el botón o enlace enviado para confirmar tu correo."}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <EditableConfigField
                    label="Botón Comprobar Correo"
                    fieldKey="textVerificationRequiredCheckBtn"
                    config={config}
                    onFieldSave={handleFieldChange}
                    defaultVal={defaultDesignConfig.textVerificationRequiredCheckBtn || "Ya verifiqué mi correo (Comprobar)"}
                  />

                  <EditableConfigField
                    label="Botón Reenviar Correo"
                    fieldKey="textVerificationRequiredResendBtn"
                    config={config}
                    onFieldSave={handleFieldChange}
                    defaultVal={defaultDesignConfig.textVerificationRequiredResendBtn || "Reenviar Enlace"}
                  />

                  <EditableConfigField
                    label="Botón Cancelar Verificación"
                    fieldKey="textVerificationRequiredCancelBtn"
                    config={config}
                    onFieldSave={handleFieldChange}
                    defaultVal={defaultDesignConfig.textVerificationRequiredCancelBtn || "Cancelar"}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin_panel' && (
          <div className="space-y-6 animate-fade-in text-natural-text">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5.5 h-5.5 text-[#1E3A8A]" />
                <h4 className="font-serif italic text-natural-primary text-base font-bold">Panel Administrador y Accesos de Control</h4>
              </div>
              <p className="text-xs text-natural-secondary mt-0.5">
                Gestiona las credenciales de control central de la aplicación. Configura de forma segura un máximo de 3 usuarios: 2 con rol de Administrador y 1 con rol de Desarrollador, quienes compartirán el mismo formulario de ingreso de administrador.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {(() => {
                const currentAdmins = config.adminUsers || [
                  { email: 'admin1@literatura.ec', username: 'admin', password: 'adminpassword', role: 'administrador' },
                  { email: 'admin2@literatura.ec', username: 'admin2', password: 'adminpassword2', role: 'administrador' },
                  { email: 'dev@literatura.ec', username: 'developer', password: 'devpassword', role: 'desarrollador' }
                ];

                // Render 3 slots exactly
                return [0, 1, 2].map((idx) => {
                  const user = currentAdmins[idx] || {
                    email: '',
                    username: '',
                    password: '',
                    role: idx === 2 ? 'desarrollador' : 'administrador'
                  };

                  const isDeveloper = idx === 2;
                  const labelTitle = isDeveloper 
                    ? "Usuario 3: Desarrollador Autorizado" 
                    : idx === 1 
                      ? "Usuario 2: Administrador Secundario" 
                      : "Usuario 1: Administrador Primario";

                  const roleBadgeColor = isDeveloper 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : "bg-blue-50 text-blue-700 border-blue-200";

                  const handleUpdateSlot = (field: 'email' | 'username' | 'password', val: string) => {
                    const nextAdmins = [...currentAdmins];
                    while (nextAdmins.length <= idx) {
                      nextAdmins.push({
                        email: '',
                        username: '',
                        password: '',
                        role: nextAdmins.length === 2 ? 'desarrollador' : 'administrador'
                      });
                    }
                    nextAdmins[idx] = {
                      ...nextAdmins[idx],
                      [field]: val
                    };
                    handleFieldChange('adminUsers', nextAdmins);
                  };

                  return (
                    <div key={idx} className="p-5 bg-white border border-natural-border rounded-2xl space-y-4 shadow-xs relative overflow-hidden">
                      <div className="flex items-center justify-between border-b border-natural-light-border pb-3.5">
                        <div>
                          <h5 className="text-xs font-bold text-natural-primary tracking-tight">
                            {labelTitle}
                          </h5>
                          <span className={`inline-block mt-1 px-2 py-0.5 border text-[9px] font-bold rounded-md uppercase tracking-wider ${roleBadgeColor}`}>
                            {user.role}
                          </span>
                        </div>
                        <Users className="w-5 h-5 text-natural-secondary/50 font-medium" />
                      </div>

                      <div className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-extrabold text-[#7E7A69] uppercase tracking-wide flex items-center justify-between">
                            <span>Correo Electrónico</span>
                            <span className="text-[9px] text-[#A67B5B] font-semibold lowercase">({user.role})</span>
                          </label>
                          <input
                            type="email"
                            required
                            placeholder={isDeveloper ? "dev@literatura.ec" : `admin${idx + 1}@literatura.ec`}
                            value={user.email}
                            onChange={(e) => handleUpdateSlot('email', e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-natural-primary focus:ring-1 focus:ring-natural-primary text-xs rounded-xl outline-none text-neutral-800 transition-all font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-extrabold text-[#7E7A69] uppercase tracking-wide">
                            Nombre de Usuario
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={isDeveloper ? "developer" : `admin${idx + 1}`}
                            value={user.username}
                            onChange={(e) => handleUpdateSlot('username', e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-natural-primary focus:ring-1 focus:ring-natural-primary text-xs rounded-xl outline-none text-neutral-800 transition-all font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-extrabold text-[#7E7A69] uppercase tracking-wide">
                            Contraseña
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ingrese contraseña de ingreso"
                            value={user.password || ''}
                            onChange={(e) => handleUpdateSlot('password', e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-[#E1DEC9] hover:border-[#CDCABC] focus:border-natural-primary focus:ring-1 focus:ring-natural-primary text-xs rounded-xl outline-none text-neutral-800 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="p-5 bg-[#F9F8F3] border border-natural-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 w-full max-w-2xl">
                <h5 className="text-xs font-bold text-natural-primary flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span>Sincronización en la Nube Requerida</span>
                </h5>
                <p className="text-[11px] text-natural-secondary leading-relaxed">
                  Todos los usuarios creados aquí podrán ingresar inmediatamente. Asegúrate de presionar el botón <strong>Guardar Cambios globales</strong> para almacenar estos accesos de control de forma persistente en tu base de datos de Firestore o local.
                </p>
              </div>
              <button
                type="button"
                onClick={executeSave}
                className="px-6 py-2.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>Aplicar y Guardar Accesos</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'icons_library' && (
          <div className="space-y-6 animate-fade-in text-natural-text">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="w-5.5 h-5.5 text-natural-primary" />
                <h4 className="font-serif italic text-natural-primary text-base font-bold">Biblioteca de Iconos Libres y Elegantes</h4>
              </div>
              <p className="text-xs text-natural-secondary mt-0.5">
                Explora, busca y previsualiza en tiempo real el set de iconos Premium y 100% de uso gratuito (MIT License) de Lucide React. Diseñados con geometría equilibrada, ideales para el Servicio de Literatura.
              </p>
            </div>

            {/* Main grid containing: Left panel: Search & Filters + Catalog Grid, Right panel: Selected Icon Sandbox */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[500px]">
              
              {/* Left Column - Browser: 7 cols on XL */}
              <div className="xl:col-span-7 flex flex-col gap-4 bg-[#FAF9F5]/40 p-4 rounded-3xl border border-natural-border/70">
                {/* Search and Category filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nombre (ej. Book, Shopping, Heart)..."
                      value={iconSearchQuery}
                      onChange={(e) => setIconSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white text-natural-text border border-natural-border focus:border-natural-primary focus:ring-1 focus:ring-natural-primary rounded-xl outline-none text-xs font-semibold"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-natural-secondary/60">
                      <LucideIcons.Search className="w-4 h-4" />
                    </div>
                    {iconSearchQuery && (
                      <button 
                        onClick={() => setIconSearchQuery('')}
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-natural-secondary/50 hover:text-red-500 rounded-full transition-transform active:scale-90"
                      >
                        <LucideIcons.X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Horizontal Category Pill buttons */}
                  <div className="flex flex-wrap gap-1.5 pb-1 max-h-[85px] overflow-y-auto scrollbar-none">
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'general', label: 'General' },
                      { id: 'literature', label: 'Libros y Letras' },
                      { id: 'commerce', label: 'Tienda y Pagos' },
                      { id: 'ui', label: 'Vistas e Interfaz' },
                      { id: 'actions', label: 'Acciones' }
                    ].map((categ) => (
                      <button
                        key={categ.id}
                        type="button"
                        onClick={() => setSelectedIconCategory(categ.id as any)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          selectedIconCategory === categ.id
                            ? 'bg-natural-primary text-white shadow-2xs font-extrabold'
                            : 'bg-white text-natural-secondary hover:text-natural-primary border border-natural-border/60 hover:bg-natural-light-bg/30'
                        }`}
                      >
                        {categ.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icons Grid scroll container */}
                <div className="flex-1 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-natural-border border border-natural-border/30 rounded-2xl bg-white p-3.5">
                  {(() => {
                    // Curated list of free and elegant Lucide Icons
                    const curatedIcons = [
                      // General
                      { name: 'Search', label: 'Lupa / Buscar', category: 'general' },
                      { name: 'Home', label: 'Inicio', category: 'general' },
                      { name: 'Menu', label: 'Menú hamburguesa', category: 'general' },
                      { name: 'Settings', label: 'Ajustes', category: 'general' },
                      { name: 'User', label: 'Usuario', category: 'general' },
                      { name: 'Shield', label: 'Escudo / Protección', category: 'general' },
                      { name: 'Lock', label: 'Candado cerrado', category: 'general' },
                      { name: 'Unlock', label: 'Candado abierto', category: 'general' },
                      { name: 'Bell', label: 'Campana / Notificaciones', category: 'general' },
                      { name: 'Mail', label: 'Correo / Email', category: 'general' },
                      { name: 'Info', label: 'Información', category: 'general' },
                      { name: 'Heart', label: 'Favorito / Corazón', category: 'general' },
                      { name: 'Star', label: 'Destacado / Estrella', category: 'general' },
                      { name: 'CheckCircle', label: 'Correcto / Confirmación', category: 'general' },
                      { name: 'AlertCircle', label: 'Alerta / Advertencia', category: 'general' },
                      { name: 'Calendar', label: 'Calendario', category: 'general' },
                      { name: 'Clock', label: 'Reloj / Tiempo', category: 'general' },

                      // Literature & books
                      { name: 'BookOpen', label: 'Libro abierto', category: 'literature' },
                      { name: 'BookMarked', label: 'Libro marcado', category: 'literature' },
                      { name: 'Library', label: 'Biblioteca', category: 'literature' },
                      { name: 'Feather', label: 'Pluma correctora', category: 'literature' },
                      { name: 'Pencil', label: 'Lápiz / Editar', category: 'literature' },
                      { name: 'FileText', label: 'Archivo / Documento', category: 'literature' },
                      { name: 'Bookmark', label: 'Marcapáginas', category: 'literature' },
                      { name: 'Compass', label: 'Brújula / Descubrir', category: 'literature' },
                      { name: 'Quote', label: 'Cita / Testimonio', category: 'literature' },
                      { name: 'Hash', label: 'Numeral / Orden', category: 'literature' },
                      { name: 'Globe', label: 'Globo / Idioma', category: 'literature' },
                      { name: 'Award', label: 'Premio / Logro', category: 'literature' },

                      // Commerce
                      { name: 'ShoppingCart', label: 'Carrito de compras', category: 'commerce' },
                      { name: 'ShoppingBag', label: 'Bolsa de pedido', category: 'commerce' },
                      { name: 'Tag', label: 'Etiqueta / Descuento', category: 'commerce' },
                      { name: 'CreditCard', label: 'Tarjeta de pago', category: 'commerce' },
                      { name: 'Sparkles', label: 'Brillo / Mágico', category: 'commerce' },
                      { name: 'Gift', label: 'Regalo / Sorpresa', category: 'commerce' },
                      { name: 'Plus', label: 'Agregar / Más', category: 'commerce' },
                      { name: 'Minus', label: 'Disminuir / Menos', category: 'commerce' },
                      { name: 'Trash2', label: 'Eliminar / Papelera', category: 'commerce' },
                      { name: 'PiggyBank', label: 'Ahorro / Depósito', category: 'commerce' },
                      { name: 'Percent', label: 'Porcentaje', category: 'commerce' },
                      { name: 'Truck', label: 'Envío / Transporte', category: 'commerce' },

                      // UI
                      { name: 'Grid', label: 'Cuadrícula', category: 'ui' },
                      { name: 'List', label: 'Lista / Detalle', category: 'ui' },
                      { name: 'Rows', label: 'Filas', category: 'ui' },
                      { name: 'Sliders', label: 'Deslizadores / Filtro', category: 'ui' },
                      { name: 'LayoutGrid', label: 'Diseño cuadrícula', category: 'ui' },
                      { name: 'Maximize2', label: 'Pantalla completa', category: 'ui' },
                      { name: 'Minimize2', label: 'Reducir tamaño', category: 'ui' },
                      { name: 'Filter', label: 'Filtro avanzado', category: 'ui' },

                      // Actions
                      { name: 'Send', label: 'Enviar datos', category: 'actions' },
                      { name: 'Share2', label: 'Compartir enlace', category: 'actions' },
                      { name: 'Download', label: 'Descargar datos', category: 'actions' },
                      { name: 'Upload', label: 'Subir archivo', category: 'actions' },
                      { name: 'RefreshCw', label: 'Sincronizar', category: 'actions' },
                      { name: 'CheckSquare', label: 'Casilla marcada', category: 'actions' },
                      { name: 'Check', label: 'Aceptar', category: 'actions' },
                      { name: 'X', label: 'Cerrar / Rechazar', category: 'actions' },
                      { name: 'ArrowLeft', label: 'Atrás', category: 'actions' },
                      { name: 'ArrowRight', label: 'Adelante', category: 'actions' },
                      { name: 'ChevronDown', label: 'Colapsar', category: 'actions' },
                      { name: 'ChevronUp', label: 'Desplegar', category: 'actions' },
                    ];

                    const filtered = curatedIcons.filter((ic) => {
                      const matchesCategory = selectedIconCategory === 'all' || ic.category === selectedIconCategory;
                      const matchesSearch = ic.name.toLowerCase().includes(iconSearchQuery.toLowerCase()) || 
                                            ic.label.toLowerCase().includes(iconSearchQuery.toLowerCase());
                      return matchesCategory && matchesSearch;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-12 text-center text-natural-secondary italic text-xs">
                          No se encontraron iconos que coincidan con la búsqueda.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {filtered.map((item) => {
                          const IconComp = (LucideIcons as any)[item.name];
                          const isCurrentlySelected = selectedIcon === item.name;
                          
                          if (!IconComp) return null;

                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setSelectedIcon(item.name)}
                              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer ${
                                isCurrentlySelected
                                  ? 'border-natural-primary bg-natural-light-bg/40 shadow-xs'
                                  : 'border-natural-border/50 hover:border-natural-accent-border/50 bg-[#FCFAF7] hover:bg-white'
                              }`}
                            >
                              <div className={`p-2.5 rounded-xl transition-all ${
                                isCurrentlySelected 
                                  ? 'bg-natural-primary text-white' 
                                  : 'bg-white text-natural-secondary group-hover:text-natural-primary shadow-3xs'
                              }`}>
                                <IconComp className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] font-bold text-natural-primary truncate max-w-full block">{item.name}</span>
                              <span className="text-[8px] text-natural-secondary font-medium truncate max-w-full block leading-none">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right Column - Sandbox Preview: 5 cols on XL */}
              <div className="xl:col-span-5 flex flex-col gap-4">
                <div className="bg-[#FAF9F5] border border-natural-border p-5 rounded-3xl space-y-4 shadow-sm flex-1 flex flex-col">
                  {selectedIcon ? (
                    (() => {
                      const ActiveIconComponent = (LucideIcons as any)[selectedIcon];
                      
                      const reactImportPlaceholder = `import { ${selectedIcon} } from 'lucide-react';`;
                      const reactUsagePlaceholder = `<${selectedIcon} \n  className="text-[${customIconColor}]" \n  size={${customIconSize}} \n  strokeWidth={${customIconStroke}} \n/>`;

                      const handleCopySnippet = (text: string) => {
                        try {
                          navigator.clipboard.writeText(text);
                          setIconCopySuccess(true);
                          setTimeout(() => setIconCopySuccess(false), 2000);
                        } catch (err) {
                          console.error('No se pudo copiar de forma automatica:', err);
                        }
                      };

                      return (
                        <div className="space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-4">
                            {/* Live Preview Area */}
                            <div className="border border-natural-border/50 bg-white rounded-2xl p-6 flex flex-col items-center justify-center relative min-h-[160px] shadow-inner overflow-hidden">
                              <span className="absolute top-2.5 left-3 text-[8px] font-bold text-[#A67B5B] uppercase tracking-wider">Previsualización Interactiva</span>
                              
                              <div className="p-4" style={{ color: customIconColor }}>
                                {ActiveIconComponent && (
                                  <ActiveIconComponent 
                                    size={customIconSize} 
                                    strokeWidth={customIconStroke} 
                                    className="transition-all duration-150 animate-scale-in"
                                  />
                                )}
                              </div>

                              <span className="text-[10px] bg-natural-light-bg border border-natural-accent-border/30 text-natural-primary font-bold px-3 py-1 rounded-full uppercase mt-1">
                                {selectedIcon}
                              </span>
                            </div>

                            {/* Control Panels */}
                            <div className="space-y-3.5">
                              {/* Color Slider */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Color Personalizado</label>
                                  <span className="font-mono text-[10px] font-bold text-natural-secondary">{customIconColor}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={customIconColor}
                                      onChange={(e) => setCustomIconColor(e.target.value)}
                                      className="w-full px-3 py-1 bg-white border border-[#E1DEC9] text-[11px] font-mono rounded-xl outline-none"
                                    />
                                  </div>
                                  <div className="relative w-8 h-8 rounded-lg shrink-0 border border-natural-border shadow-3xs overflow-hidden" style={{ backgroundColor: customIconColor }}>
                                    <input
                                      type="color"
                                      value={customIconColor.startsWith('#') ? customIconColor : '#424e3a'}
                                      onChange={(e) => setCustomIconColor(e.target.value)}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                  </div>
                                </div>
                                {/* Visual Preset Colors */}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  {[config.colorPrimary, config.colorTerracotta, '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#111827'].map((hex) => (
                                    hex && (
                                      <button
                                        key={hex}
                                        type="button"
                                        onClick={() => setCustomIconColor(hex)}
                                        className="w-4.5 h-4.5 rounded-full border border-black/10 transition-transform active:scale-90 cursor-pointer"
                                        style={{ backgroundColor: hex }}
                                        title={hex}
                                      />
                                    )
                                  ))}
                                </div>
                              </div>

                              {/* Size and Stroke Grid */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-natural-primary uppercase tracking-wider">
                                    <span>Tamaño</span>
                                    <span>{customIconSize}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="16"
                                    max="80"
                                    step="2"
                                    value={customIconSize}
                                    onChange={(e) => setCustomIconSize(Number(e.target.value))}
                                    className="w-full h-2 bg-natural-light-bg rounded-lg appearance-none cursor-pointer accent-natural-primary"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-natural-primary uppercase tracking-wider">
                                    <span>Grosor</span>
                                    <span>{customIconStroke}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="0.5"
                                    value={customIconStroke}
                                    onChange={(e) => setCustomIconStroke(Number(e.target.value))}
                                    className="w-full h-2 bg-natural-light-bg rounded-lg appearance-none cursor-pointer accent-natural-primary"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Code snippets to use */}
                          <div className="space-y-2 border-t border-natural-border/50 pt-4 mt-auto">
                            <span className="text-[10px] font-bold text-natural-primary uppercase tracking-wider block">Implementación en React</span>
                            
                            <div className="space-y-2">
                              {/* Import Snippet */}
                              <div className="relative">
                                <pre className="p-2.5 bg-[#FCFAF5] border border-natural-border/40 rounded-xl text-[10px] font-mono text-zinc-650 truncate leading-relaxed">
                                  {reactImportPlaceholder}
                                </pre>
                                <button
                                  type="button"
                                  onClick={() => handleCopySnippet(reactImportPlaceholder)}
                                  className="absolute right-2 top-1 px-2 py-0.5 bg-white hover:bg-neutral-50 text-[9px] font-bold text-natural-secondary border rounded-md shadow-3xs hover:text-natural-primary active:scale-95 transition-all outline-none cursor-pointer"
                                >
                                  Copiar
                                </button>
                              </div>

                              {/* Component Snippet */}
                              <div className="relative">
                                <pre className="p-2.5 bg-[#FCFAF5] border border-natural-border/40 rounded-xl text-[10px] font-mono text-zinc-650 block leading-relaxed whitespace-pre font-semibold">
                                  {reactUsagePlaceholder}
                                </pre>
                                <button
                                  type="button"
                                  onClick={() => handleCopySnippet(reactUsagePlaceholder)}
                                  className="absolute right-2 top-1 px-2 py-0.5 bg-white hover:bg-neutral-50 text-[9px] font-bold text-natural-secondary border rounded-md shadow-3xs hover:text-natural-primary active:scale-95 transition-all outline-none cursor-pointer"
                                >
                                  Copiar uso
                                </button>
                              </div>
                            </div>

                            {iconCopySuccess && (
                              <div className="text-emerald-600 text-[10px] font-bold text-center animate-pulse mt-0.5">
                                ¡Copiado con éxito en tu portapapeles!
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-natural-secondary/60 gap-3">
                      <div className="p-3 bg-white border border-natural-border rounded-2xl shadow-3xs text-natural-secondary/40">
                        <LucideIcons.Sparkles className="w-8 h-8 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-natural-primary">Explorar y Ajustar Iconos</p>
                        <p className="text-[11px] leading-relaxed max-w-[220px] mx-auto mt-1 text-natural-secondary">
                          Haz clic en cualquier icono de la izquierda para ver su previsualización interactiva y obtener el código de integración.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

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
                setDevShowPassword(false);
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
                  type={devShowPassword ? "text" : "password"}
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
                  className="w-full pl-10 pr-10 py-2 bg-[#FAF8F5] text-natural-text border border-natural-border focus:border-[#A34343] rounded-xl outline-none text-xs text-center font-mono font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setDevShowPassword(!devShowPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-natural-secondary hover:text-natural-primary transition-colors cursor-pointer"
                  title={devShowPassword ? "Ocultar clave" : "Mostrar clave"}
                >
                  {devShowPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {passwordError && (
                <p className="text-[#A34343] text-[10px] font-semibold animate-pulse">{passwordError}</p>
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
    </div>
  );
}
