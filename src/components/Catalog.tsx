import React, { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, AlertCircle, ShoppingBag, Info, LayoutGrid, List, Rows, Columns, ZoomIn, X } from 'lucide-react';
import { Book, getEffectivePrice } from '../types';

interface BookCardProps {
  book: Book;
  currentInCart: number;
  onAddToCart: (bookId: string, qty: number) => void;
  onSelectDetail: (book: Book) => void;
  onZoomImage?: (book: Book) => void;
  viewMode: 'grid' | 'list';
  isAdmin?: boolean;
  lowStockThreshold?: number;
}

const BookCard: React.FC<BookCardProps> = ({
  book,
  currentInCart,
  onAddToCart,
  onSelectDetail,
  onZoomImage,
  viewMode,
  isAdmin,
  lowStockThreshold = 10,
}) => {
  const [localQty, setLocalQty] = useState(1);
  const [typedVal, setTypedVal] = useState('');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hasNoStock = book.stock === 0;
  const isLowStock = book.stock > 0 && book.stock <= 2;
  const remainingAvailable = Math.max(0, book.stock - currentInCart);
  const isCartFull = remainingAvailable === 0;
  const qty = localQty;

  useEffect(() => {
    // If remaining available changes, ensure localQty does not exceed it
    setLocalQty((prev) => {
      if (remainingAvailable <= 0) return 1;
      return Math.max(1, Math.min(prev, remainingAvailable));
    });
  }, [remainingAvailable]);

  const handleQtyChange = (newQty: number) => {
    const val = Math.max(1, Math.min(remainingAvailable > 0 ? remainingAvailable : 1, newQty));
    setLocalQty(val);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value;
    setTypedVal(s);
    const parsed = parseInt(s, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      const clamped = Math.min(remainingAvailable > 0 ? remainingAvailable : 1, parsed);
      setLocalQty(clamped);
    }
  };

  const onBlur = () => {
    setTypedVal('');
  };

  const displayQtyString = typedVal !== '' ? typedVal : String(qty);

  if (viewMode === 'list') {
    return (
      <div
        id={`book-card-${book.id}`}
        className={`bg-white rounded-3xl border transition-all duration-300 flex flex-col overflow-hidden shadow-sm p-4 gap-4 ${
          currentInCart > 0
            ? 'border-natural-primary ring-2 ring-natural-primary/10'
            : 'border-natural-border hover:border-natural-accent-border hover:shadow-md'
        }`}
        style={{
          width: '100%',
          paddingLeft: '10.600000000000001px',
          paddingRight: '10.600000000000001px',
          ...(book.id === '12-014-002'
            ? {
                paddingTop: '10.6px',
                paddingBottom: '10.6px',
                marginTop: '7px',
                marginBottom: '7px',
                marginLeft: '0px',
                marginRight: '0px',
              }
            : {
                paddingBottom: '12px',
                paddingTop: '12px',
                margin: '0 auto',
              }),
        }}
      >
        {/* Top visual row: Cover + Book metadata */}
        <div className="flex flex-row items-center sm:items-start gap-4 w-full">
          {/* Aspect Square Book Cover with dynamic fluid sizing */}
          <div className="flex justify-start self-center select-none shrink-0 w-28 h-28 sm:w-36 sm:h-36">
            <div className="w-full h-full rounded-2xl bg-gradient-to-br text-white flex flex-col justify-between p-3 relative overflow-hidden shadow-sm shrink-0 transition-transform duration-300 hover:scale-[1.02] group" style={{ contentVisibility: 'auto' }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${book.coverColor} z-0`} />
              {book.coverImage && (
                <>
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="absolute inset-0 w-full h-full object-cover z-10 animate-fade-in"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onZoomImage?.(book);
                    }}
                    className="absolute inset-0 z-20 flex items-center justify-center border-0 outline-none focus:outline-none cursor-pointer"
                    title="Ampliar imagen"
                  >
                    <div className="bg-black/45 backdrop-blur-[2px] text-white p-2.5 rounded-full opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 border border-white/15 shadow-md">
                      <ZoomIn className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-white scale-100 sm:scale-75 sm:group-hover:scale-100 transition-transform duration-300 drop-shadow-sm" />
                    </div>
                  </button>
                </>
              )}
              <div className="absolute top-0 right-0 w-5 h-full bg-white/5 backdrop-blur-[1px] shadow-inner z-20" />
              <div className="absolute top-0 inset-y-0 left-1 w-0.5 bg-black/10 z-20" />
              
              {book.discountType && book.discountType !== 'none' && book.discountValue && (
                <div className="absolute top-1.5 right-1.5 z-20">
                  <span className="text-[8px] sm:text-[9.5px] font-sans uppercase font-extrabold tracking-wide bg-rose-600 px-1.5 py-0.5 rounded-md text-white border border-white/25">
                    -{book.discountType === 'percentage' ? `${book.discountValue}%` : `$${book.discountValue}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info Column */}
          <div
            className="flex-1 flex flex-col justify-center min-w-0"
            style={{ marginTop: '0px', paddingTop: '1.2px' }}
          >
            <div className="space-y-2">
              <div className="flex flex-col items-start gap-1">
                {/* Category aligned to top of the image */}
                <span className="text-[9px] uppercase font-bold tracking-widest bg-[#A34343] text-white px-2 py-0.5 rounded-full inline-block border border-[#A34343]/30">
                  {book.category}
                </span>
              </div>

              <div className="flex flex-col gap-1 pt-0.5">
                {/* Book Title */}
                <h4
                  className="font-serif italic text-sm sm:text-base leading-snug text-natural-primary custom-item-title flex-1 min-w-0 pr-2"
                  title={book.title}
                  style={{
                    width: '179.812px',
                    height: '29.875px',
                    paddingLeft: '0px',
                    paddingRight: '4px',
                  }}
                >
                  {book.title}
                </h4>

                {/* Author under Title */}
                <p className="text-[11px] sm:text-xs text-natural-secondary font-sans font-bold custom-item-author">
                  por {book.author}
                </p>

                {/* Price directly under Author */}
                <div className="flex items-center gap-2 flex-wrap">
                  {book.discountType && book.discountType !== 'none' && book.discountValue ? (
                    <>
                      <span className="font-mono font-extrabold text-[#A67B5B] text-sm sm:text-base custom-item-price">${getEffectivePrice(book).toFixed(2)} USD</span>
                      <span className="line-through text-[10px] sm:text-xs text-gray-400 font-mono">${book.price?.toFixed(2)} USD</span>
                    </>
                  ) : (
                    <span className="font-mono font-extrabold text-natural-primary text-sm sm:text-base custom-item-price">${book.price?.toFixed(2)} USD</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <div className="flex items-center gap-1.5 text-xs custom-item-stock">
                  <span className="text-gray-900 font-extrabold">Disponibles:</span>
                  {hasNoStock ? (
                    <span
                      className="text-[10px] font-bold text-natural-alert-text bg-natural-alert-bg/60 px-1.5 py-0.5 rounded border border-[#EBE3D5]"
                      style={{ fontSize: '12px' }}
                    >
                      Sin stock
                    </span>
                  ) : !isAdmin && book.stock <= lowStockThreshold ? (
                    <span
                      className="text-[11px] font-extrabold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse"
                      style={{ fontSize: '12px' }}
                    >
                      Próximo a agotarse
                    </span>
                  ) : isLowStock ? (
                    <span
                      className="text-[10px] font-bold text-natural-terracotta bg-[#FDF5E6] px-1.5 py-0.5 rounded border border-[#F5E6CC]"
                      style={{ fontSize: '12px' }}
                    >
                      ¡Últimas {book.stock}!
                    </span>
                  ) : (
                    <span
                      className="text-[10px] font-bold text-natural-primary bg-natural-light-bg px-1.5 py-0.5 rounded border border-natural-accent-border"
                      style={{ fontSize: '12px' }}
                    >
                      {book.stock} u.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom actions space for Cart quantity and Pedir option unified into a single block */}
        <div
          className="px-0 sm:px-0.5 pt-3 border-t border-natural-light-border/75 flex items-center justify-center font-sans w-full self-center"
          style={{
            paddingTop: '4px',
            marginLeft: '17.4062px',
            marginTop: '0px',
            marginBottom: '4px',
            ...(typeof window !== 'undefined' && window.innerWidth < 640
              ? {
                  paddingLeft: '0px',
                  paddingRight: '0px',
                  paddingTop: '8px',
                  paddingBottom: '4px',
                  marginTop: '0px',
                  marginBottom: '0px',
                  margin: '0 auto',
                }
              : undefined)
          }}
        >
          <div
            className="flex flex-col items-center justify-center w-full gap-2"
            style={{
              maxWidth: isMobile ? '100%' : '194.812px',
              width: '100%',
              margin: '0 auto',
            }}
          >
            {/* Quantity Selector - high visual presence matching Pedir size */}
            <div
              className={`flex items-center rounded-none border overflow-hidden ${
                hasNoStock || isCartFull
                  ? 'bg-black/5 border-natural-border text-natural-secondary'
                  : 'bg-[#FCFBF7] border-[#E1DEC9] text-natural-primary'
              }`}
              style={{
                backgroundColor: '#fff1cf',
                borderColor: '#bab8a2',
                height: isMobile ? '35px' : '89px',
                width: isMobile ? '100%' : '194.812px',
                borderRadius: '0px',
              }}
            >
              {/* Left group of controls (Minus, Qty, Plus) */}
              <div className="flex items-center justify-between w-full h-full">
                <button
                  type="button"
                  disabled={localQty <= 1 || hasNoStock || isCartFull}
                  onClick={() => handleQtyChange(localQty - 1)}
                  className={`px-3 h-full transition-colors font-extrabold text-sm cursor-pointer disabled:opacity-20 flex items-center justify-center ${
                    hasNoStock || isCartFull ? 'text-natural-secondary' : 'text-natural-primary hover:bg-black/5'
                  }`}
                  style={{ color: '#000000', width: '30%', borderRadius: '0px' }}
                >
                  −
                </button>
                <input
                  type="number"
                  value={displayQtyString}
                  onChange={onChange}
                  onBlur={onBlur}
                  disabled={hasNoStock || isCartFull}
                  className={`text-center font-mono text-sm font-extrabold border-0 outline-none p-0 focus:ring-0 focus:outline-none bg-transparent h-full ${
                    hasNoStock || isCartFull ? 'text-natural-secondary/60' : 'text-natural-primary'
                  }`}
                  style={{ color: '#000000', width: '40%', borderRadius: '0px' }}
                  min="1"
                  max={remainingAvailable}
                />
                <button
                  type="button"
                  disabled={localQty >= remainingAvailable || hasNoStock || isCartFull}
                  onClick={() => handleQtyChange(localQty + 1)}
                  className={`px-3 h-full transition-colors font-extrabold text-sm cursor-pointer disabled:opacity-20 flex items-center justify-center ${
                    hasNoStock || isCartFull ? 'text-natural-secondary' : 'text-natural-primary hover:bg-black/5'
                  }`}
                  style={{ backgroundColor: '#f9e0a2', color: '#000000', width: '30%', borderRadius: '0px' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Pedir Button container of same width and height */}
            <div className="w-full flex justify-center">
              <button
                disabled={hasNoStock || isCartFull}
                onClick={() => onAddToCart(book.id, currentInCart + localQty)}
                className={`font-extrabold text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all duration-205 cursor-pointer rounded-none w-full ${
                  hasNoStock || isCartFull
                    ? 'text-natural-secondary/50 cursor-not-allowed bg-gray-100/50'
                    : currentInCart > 0
                    ? 'bg-[#A34343] hover:bg-[#8F3A3A] text-white border-none shadow-xs hover:shadow-sm'
                    : 'bg-natural-primary hover:bg-natural-primary/95 text-white border-none shadow-xs hover:shadow-sm'
                }`}
                style={{
                  height: isMobile ? '35px' : '89px',
                  width: isMobile ? '100%' : '194.812px',
                  borderRadius: '0px',
                }}
              >
                <ShoppingBag className="w-3.5 h-3.5" style={isMobile ? { fontSize: '13px' } : undefined} />
                <span className="truncate" style={isMobile ? { fontSize: '13px' } : undefined}>
                  {hasNoStock ? 'Sin stock' : isCartFull ? 'Límite' : currentInCart > 0 ? `Pedir` : 'Pedir'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      id={`book-card-${book.id}`}
      className={`bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm p-2 sm:p-4 ${
        currentInCart > 0
          ? 'border-natural-primary ring-2 ring-natural-primary/10'
          : 'border-natural-border hover:border-natural-accent-border hover:shadow-md'
      }`}
      style={{
        width: '100%',
        paddingLeft: '10.600000000000001px',
        paddingRight: '10.600000000000001px',
        ...(book.id === '12-014-002'
          ? {
              paddingTop: '10.6px',
              paddingBottom: '10.6px',
              marginTop: '7px',
              marginBottom: '7px',
              marginLeft: '0px',
              marginRight: '0px',
            }
          : {
              paddingBottom: '6.600000000000001px',
              paddingTop: '4.600000000000001px',
              margin: '0 auto',
            }),
      }}
    >
      <div>
        {/* Fluid Square Book Cover with dynamic responsive widths */}
        <div className="flex justify-center mb-3 sm:mb-4 select-none">
          <div className="w-full max-w-[250px] aspect-square rounded-xl sm:rounded-2xl text-white flex flex-col justify-between p-3 sm:p-5 relative overflow-hidden shadow-xs shrink-0 transition-transform duration-300 hover:scale-[1.01] group">
            <div className={`absolute inset-0 bg-gradient-to-br ${book.coverColor} z-0`} />
            {book.coverImage && (
              <>
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="absolute inset-0 w-full h-full object-cover z-10 animate-fade-in"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoomImage?.(book);
                  }}
                  className="absolute inset-0 z-20 flex items-center justify-center border-0 outline-none focus:outline-none cursor-pointer"
                  title="Ampliar imagen"
                >
                  <div className="bg-black/45 backdrop-blur-[2px] text-white p-2.5 rounded-full opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 border border-white/15 shadow-md">
                    <ZoomIn className="w-4.5 h-4.5 sm:w-6 sm:h-6 text-white scale-100 sm:scale-75 sm:group-hover:scale-100 transition-transform duration-300 drop-shadow-sm" />
                  </div>
                </button>
              </>
            )}
            {/* Decorative elements representing book spine / pages edge */}
            <div className="absolute top-0 right-0 w-6 sm:w-8 h-full bg-white/5 backdrop-blur-[1px] shadow-inner z-20" />
            <div className="absolute top-0 inset-y-0 left-1.5 w-0.5 bg-black/10 z-20" />
            <div className="absolute top-0 inset-y-0 left-2.5 w-px bg-white/20 z-20" />

            {/* Price tag or Discount overlay without cluttering title/author */}
            <div className="flex justify-between items-start z-20 w-full relative">
              {book.discountType && book.discountType !== 'none' && book.discountValue ? (
                <span className="text-[7.5px] sm:text-xs font-serif uppercase font-extrabold tracking-wide bg-rose-600 px-2 py-0.5 sm:py-1 rounded text-white shadow-xs ml-auto border border-white/20">
                  -{book.discountType === 'percentage' ? `${book.discountValue}%` : `$${book.discountValue}`}
                </span>
              ) : <div className="h-4" />}
            </div>
          </div>
        </div>

        {/* Book details rendered UNDERNEATH (below) the fluid cover */}
        <div className="px-0.5 sm:px-1.5 space-y-1.5 sm:space-y-2">
          <div>
            <div className="mb-1 flex flex-col gap-1.5">
              <span className="w-fit text-[8px] sm:text-[9px] uppercase font-bold tracking-widest bg-[#A34343] text-white px-1.5 sm:px-2 py-0.5 rounded-full inline-block border border-[#A34343]/30 truncate max-w-full">
                {book.category}
              </span>
              <div className="flex flex-row items-center justify-between gap-1.5 flex-wrap">
                <p className="text-[10px] sm:text-xs text-natural-secondary font-sans font-bold truncate max-w-[120px] custom-item-author" title={book.author}>
                  por {book.author}
                </p>
              </div>
            </div>
            <h4
              className="font-serif italic text-xs sm:text-base leading-snug text-natural-primary line-clamp-2 h-7 sm:h-12 overflow-hidden custom-item-title"
              title={book.title}
              style={{ marginLeft: '0px', paddingTop: '0px', paddingBottom: '2px', height: '54px' }}
            >
              {book.title}
            </h4>
          </div>

          <div className="pt-2 border-t border-natural-light-border/75 space-y-1.5">
            <div className="flex justify-between items-center text-[10px] sm:text-xs">
              <span className="text-natural-secondary font-medium">Precio:</span>
              <div className="flex items-center gap-1.5 justify-end">
                {book.discountType && book.discountType !== 'none' && book.discountValue ? (
                  <>
                    <span className="font-mono font-extrabold text-[#A67B5B] text-base sm:text-lg custom-item-price">${getEffectivePrice(book).toFixed(2)}</span>
                    <span className="line-through text-[10px] sm:text-xs text-gray-400 font-mono">${book.price?.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="font-mono font-extrabold text-natural-primary text-base sm:text-lg custom-item-price">${book.price?.toFixed(2)}</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs pb-1 custom-item-stock">
              <span className="text-gray-900 font-extrabold">Disponibles:</span>
              {hasNoStock ? (
                <span className="inline-flex items-center text-[8px] sm:text-[11px] font-bold text-natural-alert-text bg-natural-alert-bg/65 px-1 sm:px-2.5 py-0.5 rounded border border-natural-alert-text/10 shrink-0">
                  Sin stock
                </span>
              ) : !isAdmin && book.stock <= lowStockThreshold ? (
                <span className="inline-flex items-center text-[9px] sm:text-[11px] font-extrabold text-red-600 bg-red-50 px-1.5 sm:px-2.5 py-0.5 rounded border border-red-100 shrink-0 animate-pulse">
                  Próximo a agotarse
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center text-[8px] sm:text-[11px] font-bold text-natural-terracotta bg-[#FDF5E6] px-1.5 sm:px-2.5 py-0.5 rounded border border-[#F5E6CC] shrink-0">
                  ¡Últimas {book.stock}!
                </span>
              ) : (
                <span className="inline-flex items-center text-[8px] sm:text-[11px] font-bold text-natural-primary bg-natural-light-bg px-1.5 sm:px-2.5 py-0.5 rounded border border-natural-accent-border shrink-0">
                  {book.stock} u.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar underneath - controls for cart qty and Pedir buttons */}
      <div
        className="px-0 sm:px-0.5 pt-[6px] sm:pt-3 pb-[6px] sm:pb-0 mt-[5px] sm:mt-3 mb-[5px] sm:mb-0 border-t border-natural-light-border/75 flex items-center justify-between font-sans"
        style={
          book.id === '12-014-002'
            ? {
                paddingLeft: '5.2px',
                paddingRight: '5.2px',
                paddingTop: '4.2px',
                paddingBottom: '5px',
                marginTop: '8.2px',
              }
            : { paddingTop: '4.199999999999999px' }
        }
      >
        <div className="flex flex-col items-center justify-center w-full gap-2">
          {/* Quantity Selector - high visual presence */}
          <div
            className={`flex items-center h-[35px] rounded-none border overflow-hidden ${
              hasNoStock || isCartFull
                ? 'bg-black/5 border-natural-border text-natural-secondary'
                : 'bg-[#FCFBF7] border-[#E1DEC9] text-natural-primary'
            }`}
            style={{
              backgroundColor: '#fff1cf',
              borderColor: '#bab8a2',
              height: '35px',
              width: isMobile ? '100%' : '209.812px',
              borderRadius: '0px',
            }}
          >
            {/* Left group of controls (Minus, Qty, Plus) */}
            <div className="flex items-center justify-between w-full h-full">
              <button
                type="button"
                disabled={localQty <= 1 || hasNoStock || isCartFull}
                onClick={() => handleQtyChange(localQty - 1)}
                className={`px-3 h-full transition-colors font-extrabold text-sm cursor-pointer disabled:opacity-20 flex items-center justify-center ${
                  hasNoStock || isCartFull ? 'text-natural-secondary' : 'text-natural-primary hover:bg-black/5'
                }`}
                style={{ color: '#000000' }}
              >
                −
              </button>
              <input
                type="number"
                value={displayQtyString}
                onChange={onChange}
                onBlur={onBlur}
                disabled={hasNoStock || isCartFull}
                className={`w-8 text-center font-mono text-sm font-extrabold border-0 outline-none p-0 focus:ring-0 focus:outline-none bg-transparent h-full ${
                  hasNoStock || isCartFull ? 'text-natural-secondary/60' : 'text-natural-primary'
                }`}
                style={{ color: '#000000' }}
                min="1"
                max={remainingAvailable}
              />
              <button
                type="button"
                disabled={localQty >= remainingAvailable || hasNoStock || isCartFull}
                onClick={() => handleQtyChange(localQty + 1)}
                className={`px-3 h-full transition-colors font-extrabold text-sm cursor-pointer disabled:opacity-20 flex items-center justify-center ${
                  hasNoStock || isCartFull ? 'text-natural-secondary' : 'text-natural-primary hover:bg-black/5'
                }`}
                style={{ backgroundColor: '#f9e0a2', color: '#000000' }}
              >
                +
              </button>
            </div>
          </div>

          {/* Pedir Button nested inside its own div below the quantity selector */}
          <div className="w-full flex justify-center">
            <button
              disabled={hasNoStock || isCartFull}
              onClick={() => onAddToCart(book.id, currentInCart + localQty)}
              className={`font-extrabold text-xs tracking-wide flex items-center justify-center gap-1.5 transition-all duration-205 cursor-pointer rounded-none ${
                hasNoStock || isCartFull
                  ? 'text-natural-secondary/50 cursor-not-allowed bg-gray-100/50'
                  : currentInCart > 0
                  ? 'bg-[#A34343] hover:bg-[#8F3A3A] text-white border-none shadow-xs hover:shadow-sm'
                  : 'bg-natural-primary hover:bg-natural-primary/95 text-white border-none shadow-xs hover:shadow-sm'
              }`}
              style={{
                height: '35px',
                width: isMobile ? '100%' : '209.812px',
                borderRadius: '0px',
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5" style={isMobile ? { fontSize: '13px' } : undefined} />
              <span className="truncate" style={isMobile ? { fontSize: '13px' } : undefined}>
                {hasNoStock ? 'Sin stock' : isCartFull ? 'Límite' : currentInCart > 0 ? `Pedir` : 'Pedir'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CatalogProps {
  books: Book[];
  cart: Record<string, number>;
  onAddToCart: (bookId: string, qty: number) => void;
  onRemoveFromCart: (bookId: string) => void;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  isAdmin?: boolean;
  isDeveloperMode?: boolean;
  lowStockThreshold?: number;
  columnsDesktop?: number;
  columnsTablet?: number;
  columnsMobile?: number;
  itemSpacing?: 'narrow' | 'medium' | 'large';
}

export const Catalog: React.FC<CatalogProps> = ({
  books,
  cart,
  onAddToCart,
  onRemoveFromCart,
  searchTerm: propSearchTerm,
  onSearchTermChange,
  selectedCategory: propSelectedCategory,
  onSelectCategory,
  isAdmin,
  isDeveloperMode = false,
  lowStockThreshold = 10,
  columnsDesktop = 4,
  columnsTablet = 2,
  columnsMobile = 2,
  itemSpacing = 'medium',
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localSelectedCategory, setLocalSelectedCategory] = useState('Todos');

  const searchTerm = propSearchTerm !== undefined ? propSearchTerm : localSearchTerm;
  const setSearchTerm = onSearchTermChange || setLocalSearchTerm;

  const selectedCategory = propSelectedCategory !== undefined ? propSelectedCategory : localSelectedCategory;
  const setSelectedCategory = onSelectCategory || setLocalSelectedCategory;

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [selectedBookDetail, setSelectedBookDetail] = useState<Book | null>(null);
  const [zoomedImage, setZoomedImage] = useState<Book | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [columns, setColumns] = useState<2 | 3 | 4>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1150) {
        return 3;
      }
    }
    if (columnsDesktop === 2 || columnsDesktop === 3 || columnsDesktop === 4) {
      return columnsDesktop as 2 | 3 | 4;
    }
    return 4;
  });

  useEffect(() => {
    if (windowWidth < 1150) {
      setColumns((prev) => (prev === 4 ? 3 : prev));
    } else {
      setColumns((prev) => (prev === 3 || prev === 2 ? 4 : prev));
    }
    if (windowWidth >= 640) {
      setViewMode('grid');
    }
  }, [windowWidth]);

  // Extract unique categories (ignoring hidden books) and sort them alphabetically
  const uniqueCategoryStrings = Array.from(new Set(
    books
      .filter((b) => b && b.visible !== false && typeof b.category === 'string' && b.category.trim() !== '')
      .map((b) => b.category as string)
  )) as string[];
  const sortedUniqueCategories = uniqueCategoryStrings.sort((a, b) => {
    const strA = a || '';
    const strB = b || '';
    return strA.localeCompare(strB, 'es', { sensitivity: 'base' });
  });
  const categories = ['Todos', ...sortedUniqueCategories];

  // Filter books list (ignoring hidden books)
  const filteredBooks = books.filter((book) => {
    if (!book) return false;
    if (book.visible === false) return false;
    const titleStr = book.title || '';
    const authorStr = book.author || '';
    const matchesSearch =
      titleStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      authorStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Search & Filters block */}
      {!isDeveloperMode && (
        <div className="lg:col-span-1 space-y-6 animate-fade-in">
          <div className="bg-white rounded-3xl border border-natural-border shadow-sm space-y-5 lg:sticky lg:top-6" style={{ paddingTop: '19.4px', paddingBottom: '19.4px', paddingRight: '20.4px', paddingLeft: '20.4px' }}>
            <h3 className="hidden lg:flex font-serif italic text-lg text-[#424e3a] items-center gap-2">
              <Filter className="w-4 h-4 text-[#424e3a]" />
              Buscar y Filtrar
            </h3>
   
            {/* Search Input*/}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar item"
                id="catalog-sidebar-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white hover:bg-white focus:bg-white border border-[#636055] focus:border-[#636055] rounded-[26px] outline-none text-sm text-[#3e3e2e] transition-all placeholder:text-natural-secondary"
                style={{ fontFamily: 'system-ui', lineHeight: '18px' }}
              />
              <Search className="w-4 h-4 text-natural-secondary absolute left-3.5 top-3.5" />
            </div>
   
            {/* Category List - Desktop Mode */}
            <div className="hidden lg:block space-y-1.5">
              <label className="font-['Arial'] font-bold text-[13.2px] not-italic text-natural-secondary uppercase tracking-wider block">Categorías</label>
              <div className="flex flex-col gap-1">
                {categories.map((cat) => {
                  const isTodos = cat === 'Todos';
                  const count = isTodos 
                    ? books.filter((b) => b && b.visible !== false).length 
                    : books.filter((b) => b && b.visible !== false && b.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-left text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                        selectedCategory === cat
                          ? 'bg-natural-primary text-white font-bold shadow-xs border-natural-primary'
                          : 'text-natural-secondary bg-[#FAF8F5]/80 hover:bg-natural-light-bg border border-natural-border/40 hover:text-natural-text'
                      }`}
                    >
                      {isTodos ? `Todos (${count})` : `${cat} (${count})`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
   
          {/* Selected Book Info Drawer / Visual card if anything's clicked */}
          {selectedBookDetail && (
            <div className="bg-white rounded-3xl p-6 border border-natural-border shadow-sm relative overflow-hidden animate-fade-in">
              <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${selectedBookDetail.coverColor}`} />
              
              <button
                type="button"
                onClick={() => setSelectedBookDetail(null)}
                className="absolute top-4 right-4 text-natural-secondary hover:text-natural-text text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
   
              <span className="text-[10px] font-bold tracking-wider text-natural-primary uppercase bg-natural-light-bg border border-natural-light-border px-2.5 py-1 rounded-full mb-3 inline-block">
                {selectedBookDetail.category}
              </span>
              <h4 className="font-serif italic text-natural-primary text-base mb-1">{selectedBookDetail.title}</h4>
              <p className="text-xs text-natural-secondary mb-3">por {selectedBookDetail.author}</p>
              
              <p className="text-xs text-natural-secondary leading-relaxed bg-natural-light-bg/40 p-3.5 border border-natural-light-border rounded-2xl mb-4">
                {selectedBookDetail.description}
              </p>
   
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-natural-secondary font-medium">Precio Unitario:</span>
                <div className="flex flex-col items-end">
                  {selectedBookDetail.discountType && selectedBookDetail.discountType !== 'none' && selectedBookDetail.discountValue ? (
                    <>
                      <span className="font-mono font-bold text-sm text-natural-primary">${getEffectivePrice(selectedBookDetail).toFixed(2)} USD</span>
                      <span className="line-through text-[9px] text-gray-400 font-mono">${selectedBookDetail.price?.toFixed(2)} USD</span>
                    </>
                  ) : (
                    <span className="font-mono font-bold text-sm text-natural-primary">${selectedBookDetail.price?.toFixed(2)} USD</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-natural-secondary font-medium">Estado de Stock:</span>
                <span
                  className={`font-semibold px-2.5 py-1 rounded-full text-[11px] ${
                    selectedBookDetail.stock === 0
                      ? 'bg-natural-alert-bg text-natural-alert-text border border-natural-alert-text/10'
                      : selectedBookDetail.stock <= 2
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-natural-light-bg text-natural-primary border border-natural-accent-border'
                  }`}
                >
                  {selectedBookDetail.stock === 0
                    ? 'Sin existencias'
                    : `${selectedBookDetail.stock} disponibles`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
   
      {/* Book Grid/List area */}
      <div className={!isDeveloperMode ? 'lg:col-span-3' : 'lg:col-span-4'}>
                {/* Visual View Mode Selector bar */}
        <div
          className="flex flex-row items-center justify-between mb-5 bg-[#fff9e7] rounded-2xl px-4 py-2.5 border border-natural-border shadow-xs gap-3"
          style={{
            paddingLeft: '10px',
            paddingRight: '10px',
            paddingTop: '8px',
            paddingBottom: '8px',
            marginBottom: '15px'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <div className="text-sm text-natural-secondary font-medium pl-1 shrink-0">
              {selectedCategory} ({filteredBooks.length} items)
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {viewMode === 'grid' && (
              <div className="hidden sm:flex items-center gap-2 animate-fade-in">
                <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1.5 rounded-xl border border-natural-border/30 animate-fade-in">
                  {([2, 3, 4] as const)
                    .filter((col) => {
                      if (windowWidth >= 1150) {
                        return col !== 2;
                      } else {
                        return col !== 4;
                      }
                    })
                    .map((col) => (
                    <button
                      key={col}
                      onClick={() => setColumns(col)}
                      className={`px-3 py-1.5 rounded-lg text-[14px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                        columns === col
                           ? 'bg-[#4F6F52] text-white shadow-sm'
                           : 'text-natural-secondary hover:text-natural-text hover:bg-white/40'
                      }`}
                    >
                      <span>{col}</span>
                      <Columns className="w-4 h-4 opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div
              className="flex sm:hidden items-center gap-1.5 bg-natural-light-bg/50 p-1.5 rounded-xl border border-natural-border/30"
              style={{
                backgroundColor: '#ffffff',
                paddingLeft: '0px',
                paddingRight: '0px',
                paddingTop: '0px',
                paddingBottom: '0px'
              }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all font-bold flex items-center justify-center cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-natural-primary text-white shadow-sm'
                    : 'text-natural-secondary hover:text-natural-text hover:bg-white/40'
                }`}
                title="Vista de Cuadrícula"
              >
                <LayoutGrid className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all font-bold flex items-center justify-center cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-natural-primary text-white shadow-xs'
                    : 'text-natural-secondary hover:text-natural-text hover:bg-white/40'
                }`}
                style={{
                  paddingTop: '8px',
                  paddingLeft: '8px'
                }}
                title="Vista de Listado"
              >
                <List className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-natural-border shadow-sm max-w-lg mx-auto">
            <BookOpen className="w-12 h-12 text-natural-secondary mx-auto mb-4" />
            <h3 className="font-serif italic text-natural-primary text-lg">No encontramos ese título</h3>
            <p className="text-sm text-natural-secondary mt-1">Prueba con otra palabra clave o cambia los filtros de categoría.</p>
          </div>
        ) : (
          <div 
            className={viewMode === 'list' 
              ? "grid grid-cols-1 gap-4" 
              : `grid ${
                  itemSpacing === 'narrow' ? 'gap-[8px]' : itemSpacing === 'large' ? 'gap-[25px]' : 'gap-[15px]'
                }`
            }
            style={viewMode === 'grid' ? {
              display: 'grid',
              gridTemplateColumns: `repeat(${
                windowWidth < 640 
                  ? (columnsMobile === 1 ? 1 : 2)
                  : columns
              }, minmax(0, 1fr))`
            } : undefined}
          >
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                currentInCart={cart[book.id] || 0}
                onAddToCart={onAddToCart}
                onSelectDetail={setSelectedBookDetail}
                onZoomImage={(book) => setZoomedImage(book)}
                viewMode={viewMode}
                isAdmin={isAdmin}
                lowStockThreshold={lowStockThreshold}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile & Tablet Book Details Modal */}
      {selectedBookDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] lg:hidden animate-fade-in text-natural-text">
          <div className="bg-white rounded-3xl p-6 border border-natural-border shadow-2xl relative overflow-hidden max-w-md w-full max-h-[90vh] flex flex-col animate-scale-up">
            <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${selectedBookDetail.coverColor}`} />
            
            <button
              type="button"
              onClick={() => setSelectedBookDetail(null)}
              className="absolute top-4 right-4 text-natural-secondary hover:text-natural-text text-lg font-semibold cursor-pointer w-8 h-8 rounded-full bg-natural-light-bg flex items-center justify-center transition-colors shadow-xs"
            >
              ✕
            </button>
  
            <div className="overflow-y-auto pr-1 flex-1 mt-4 space-y-4">
              <div className="flex items-start gap-4">
                {selectedBookDetail.coverImage && (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden relative shadow-md shrink-0 bg-gray-50">
                    <img
                      src={selectedBookDetail.coverImage}
                      alt={selectedBookDetail.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-white uppercase bg-[#A34343] border border-[#A34343]/30 px-2.5 py-0.5 rounded-full inline-block">
                    {selectedBookDetail.category}
                  </span>
                  <h4 className="font-serif italic text-natural-primary text-base sm:text-lg leading-snug break-words">{selectedBookDetail.title}</h4>
                  <p className="text-xs text-natural-secondary font-medium font-sans">por {selectedBookDetail.author}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <h5 className="text-xs font-bold text-natural-text uppercase tracking-wider font-sans">Sinopsis y Reseña</h5>
                <p className="text-xs sm:text-sm text-[#4D4D44] leading-relaxed bg-natural-light-bg/50 p-4 border border-natural-light-border rounded-2xl whitespace-pre-line font-sans">
                  {selectedBookDetail.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1 font-sans">
                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-natural-border/30">
                  <span className="text-[10px] text-natural-secondary font-semibold uppercase tracking-wider block mb-0.5">Precio</span>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    {selectedBookDetail.discountType && selectedBookDetail.discountType !== 'none' && selectedBookDetail.discountValue ? (
                      <>
                        <span className="font-mono font-extrabold text-[#A67B5B] text-base sm:text-lg">${getEffectivePrice(selectedBookDetail).toFixed(2)}</span>
                        <span className="line-through text-xs text-gray-400 font-mono">${selectedBookDetail.price?.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="font-mono font-extrabold text-natural-primary text-base sm:text-lg">${selectedBookDetail.price?.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#FAF8F5]/30 flex flex-col justify-between">
                  <span className="text-[10px] text-natural-secondary font-semibold uppercase tracking-wider block mb-0.5">Disponibilidad</span>
                  <span
                    className={`font-extrabold text-[11px] sm:text-xs block w-fit ${
                      selectedBookDetail.stock === 0
                        ? 'text-natural-alert-text'
                        : selectedBookDetail.stock <= 2
                        ? 'text-natural-terracotta'
                        : 'text-natural-primary'
                    }`}
                  >
                    {selectedBookDetail.stock === 0
                      ? 'Sin existencias'
                      : `${selectedBookDetail.stock} unidades`}
                  </span>
                </div>
              </div>
            </div>

            {selectedBookDetail.stock > 0 && (
              <div className="pt-4 mt-2 border-t border-natural-light-border/75 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    const currentQty = cart[selectedBookDetail.id] || 0;
                    if (currentQty < selectedBookDetail.stock) {
                      onAddToCart(selectedBookDetail.id, currentQty + 1);
                    }
                    setSelectedBookDetail(null);
                  }}
                  className="w-full py-3 bg-[#4F6F52] hover:bg-[#435e46] text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Añadir a mi reserva</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern, elegant and responsive Zoom Image Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in text-natural-text"
          onClick={() => setZoomedImage(null)}
        >
          <div 
            className="relative max-w-full max-h-[85vh] flex flex-col items-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Caption Bar */}
            <div className="absolute -top-12 left-0 right-0 flex items-center justify-between text-white px-2 w-[calc(100vw-32px)] sm:w-full">
              <h3 className="font-serif italic text-sm sm:text-base md:text-lg truncate max-w-[80%] drop-shadow-sm">
                {zoomedImage.title}
              </h3>
              <button
                onClick={() => setZoomedImage(null)}
                className="text-white hover:text-rose-400 bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer transition-colors shadow-md flex items-center justify-center shrink-0"
                title="Cerrar vista grande"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bounding container with premium device-awareness constraint */}
            <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
              {zoomedImage.coverImage && (
                <img
                  src={zoomedImage.coverImage}
                  alt={zoomedImage.title}
                  className="max-w-[90vw] max-h-[60vh] sm:max-h-[65vh] md:max-h-[70vh] w-auto h-auto object-contain rounded-xl shadow-lg select-none"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Floating button / status over the portada */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex justify-center w-fit">
                {zoomedImage.description && 
                 zoomedImage.description.trim() !== '' && 
                 !['no disponible', 'no hay', 'sin descripción', 'sin descripcion', 'no hay descripción', 'no hay descripcion', 'N/A', 'n/a'].includes(zoomedImage.description.trim().toLowerCase()) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBookDetail(zoomedImage);
                      setZoomedImage(null);
                    }}
                    className="px-6 py-2.5 bg-[#FAF9F5] hover:bg-white text-natural-primary rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-xl flex items-center gap-2 cursor-pointer border border-[#E1DEC9] active:scale-95 whitespace-nowrap"
                    title="Ver sinopsis y reseña"
                  >
                    <Info className="w-4 h-4 text-[#5F6F52]" />
                    <span>Ver detalles</span>
                  </button>
                ) : (
                  <div className="px-5 py-2.5 bg-black/45 backdrop-blur-md rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 select-none border border-white/10 whitespace-nowrap">
                    <Info className="w-4 h-4 text-neutral-600" />
                    <span className="text-neutral-500">Ver detalles</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

