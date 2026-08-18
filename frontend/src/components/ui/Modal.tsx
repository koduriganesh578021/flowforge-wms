import { useEffect, useRef, useId } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
          return;
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusables = modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      
      // Auto focus container or first input
      requestAnimationFrame(() => {
        if (modalRef.current) {
          const firstInput = modalRef.current.querySelector<HTMLElement>(
            'input, select, textarea, button:not([aria-label="Close dialog"])'
          );
          if (firstInput) {
            firstInput.focus();
          } else {
            modalRef.current.focus();
          }
        }
      });

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative bg-[#16192b] border border-[#424769] text-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto z-10 focus:outline-none',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#424769]/60">
          <h2 id={titleId} className="text-base font-bold text-white font-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#9ba3c9] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#2d3250] focus:outline-none focus:ring-2 focus:ring-[#f9b17a]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

