import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Trash2, ShieldAlert } from 'lucide-react';
import { StockNotification } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationsProps {
  notifications: StockNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationsDropdown: React.FC<{
  notifications: StockNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}> = ({ notifications, isOpen, onClose, onMarkAsRead, onClearAll }) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Overlay to close */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 mt-2 top-[60px] sm:top-auto w-auto sm:w-96 bg-white rounded-2xl shadow-xl border border-natural-border py-2 z-50 max-h-[480px] overflow-y-auto flex flex-col animate-fade-in">
        <div className="px-4 py-2 border-b border-natural-light-border flex justify-between items-center bg-natural-light-bg/40">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-natural-terracotta" />
            <span className="font-serif italic text-sm text-natural-primary">Notificaciones</span>
            {unreadCount > 0 && (
              <span className="bg-natural-terracotta text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount} nuevas
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-natural-terracotta hover:opacity-80 font-semibold transition-colors cursor-pointer"
            >
              Limpiar todo
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-natural-light-border/60">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-natural-secondary">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-natural-primary" />
              <p className="text-sm font-medium">¡Inventario completo!</p>
              <p className="text-xs mt-1">No hay alertas activas de stock en cero.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={`p-4 transition-colors cursor-pointer flex gap-3 ${
                  notif.read ? 'bg-white hover:bg-[#FDFCF8]' : 'bg-[#FFF9F2] hover:bg-[#FFF4E6]'
                }`}
              >
                <div className="mt-0.5">
                  {notif.type === 'depleted' ? (
                    <div className="p-1 px-1.5 bg-[#FFF2F2] text-natural-terracotta rounded-lg border border-red-100">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                  ) : notif.type === 'low_stock' ? (
                    <div className="p-1 px-1.5 bg-red-50 text-red-600 rounded-lg border border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                    </div>
                  ) : (
                    <div className="p-1 px-1.5 bg-natural-light-bg text-natural-primary rounded-lg border border-natural-accent-border/30">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-1">
                    <p className={`text-xs ${notif.read ? 'text-natural-secondary' : 'text-natural-text font-medium'}`}>
                      {notif.type === 'depleted' ? (
                        <span>
                          El libro <strong className="text-natural-terracotta font-bold">«{notif.bookTitle}»</strong> se ha quedado sin stock disponible.
                        </span>
                      ) : notif.type === 'low_stock' ? (
                        <span>
                          ¡Inventario Crítico! El libro <strong className="text-red-600 font-bold">«{notif.bookTitle}»</strong> tiene solo {notif.stockLeft !== undefined ? notif.stockLeft : 10} unidades restantes en stock.
                        </span>
                      ) : (
                        <span>
                          Reabastecimiento: <strong className="text-natural-primary font-bold">«{notif.bookTitle}»</strong> ya tiene unidades listas.
                        </span>
                      )}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-natural-terracotta shrink-0 mt-1" />
                    )}
                  </div>
                  <span className="text-[10px] text-natural-secondary block mt-1">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                    - {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export const LiveToastAlerts: React.FC<{
  notifications: StockNotification[];
  onDismiss: (id: string) => void;
}> = ({ notifications, onDismiss }) => {
  // Only show notifications from the last 20 seconds as a temporary floating toast
  const activeToasts = notifications.filter(
    (n) => !n.read && new Date().getTime() - new Date(n.timestamp).getTime() < 10000
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {activeToasts.map((notif) => (
          <motion.div
            key={`toast-${notif.id}`}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-natural-primary text-white rounded-2xl shadow-2xl p-4 border border-natural-border flex gap-3 relative overflow-hidden"
          >
            {/* Top warning accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-natural-terracotta" />
            
            <AlertTriangle className="w-5 h-5 text-natural-terracotta shrink-0 mt-0.5" />
            <div className="flex-1 pr-4">
              <h4 className="font-serif italic text-xs text-natural-light-bg uppercase tracking-wider">¡Alerta de Inventario cero!</h4>
              <p className="text-sm text-white mt-1 font-medium">
                «{notif.bookTitle}» se ha agotado por completo.
              </p>
              <p className="text-xs text-natural-light-bg/85 mt-1 font-sans">
                No se pueden procesar más pedidos de este título.
              </p>
            </div>
            <button
              onClick={() => onDismiss(notif.id)}
              className="text-natural-light-bg hover:text-white transition-colors text-xs self-start cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
