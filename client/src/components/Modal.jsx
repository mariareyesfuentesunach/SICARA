import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }) {
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-vino-dark/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div 
        className={`relative z-10 flex flex-col max-h-[90vh] rounded-card bg-white text-left shadow-elevated transition-all w-full ${maxWidth} border border-app-border animate-fade-in my-auto overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Fijo en la parte superior) */}
        <div className="flex shrink-0 items-center justify-between border-b border-app-border px-6 py-4 bg-gradient-to-r from-vino-soft/50 to-white">
          <div className="pr-4">
            <h3 className="text-base sm:text-lg font-bold text-vino-dark leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-app-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-subtle p-1.5 text-app-muted hover:bg-vino-soft hover:text-vino-primary transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Con scroll vertical suave) */}
        <div className="px-6 py-5 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
