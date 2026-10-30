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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-vino-dark/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div 
          className={`relative transform overflow-hidden rounded-card bg-white text-left shadow-elevated transition-all sm:my-8 w-full ${maxWidth} border border-app-border animate-fade-in`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-app-border px-6 py-4 bg-gradient-to-r from-vino-soft/50 to-white">
            <div>
              <h3 className="text-lg font-bold text-vino-dark">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-app-muted mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-subtle p-1.5 text-app-muted hover:bg-vino-soft hover:text-vino-primary transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

