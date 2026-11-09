import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  footer = null,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-vino-dark/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fade-in">
      {/* Click outside backdrop */}
      <div 
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div 
        className={`relative flex flex-col w-full ${maxWidth} max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] rounded-card bg-white text-left shadow-elevated border border-app-border overflow-hidden my-auto`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Fixed at the top */}
        <div className="shrink-0 flex items-center justify-between border-b border-app-border px-5 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-vino-soft/50 via-vino-soft/20 to-white">
          <div className="pr-3 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-vino-dark leading-snug truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-app-muted mt-0.5 line-clamp-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-subtle p-1.5 text-app-muted hover:bg-vino-soft hover:text-vino-primary transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable content with min-h-0 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 overscroll-contain">
          {children}
        </div>

        {/* Footer opcional - Fijo en la base del modal */}
        {footer && (
          <div className="shrink-0 border-t border-app-border px-5 sm:px-6 py-3.5 bg-gray-50/90 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
