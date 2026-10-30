import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (totalPages <= 1 && total <= limit) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Generar páginas a mostrar
  const getPages = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-app-border text-xs text-app-muted">
      <div>
        Mostrando <span className="font-semibold text-app-text">{start}</span> a{' '}
        <span className="font-semibold text-app-text">{end}</span> de{' '}
        <span className="font-semibold text-app-text">{total}</span> registros
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-subtle border border-app-border bg-white text-app-text hover:bg-vino-soft hover:text-vino-primary disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-app-text transition-colors"
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPages().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] h-8 px-2 rounded-subtle text-xs font-semibold transition-colors ${
              p === page
                ? 'bg-vino-primary text-white shadow-sm'
                : 'bg-white border border-app-border text-app-text hover:bg-vino-soft hover:text-vino-primary'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-subtle border border-app-border bg-white text-app-text hover:bg-vino-soft hover:text-vino-primary disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-app-text transition-colors"
          title="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

