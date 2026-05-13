'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setVisible(false);
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  /* 焦点陷阱 */
  useEffect(() => {
    if (!open || !visible) return;
    const el = modalRef.current;
    if (!el) return;

    const focusableEls = el.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusableEls[0];
    const last = focusableEls[focusableEls.length - 1];
    first?.focus();

    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [open, visible]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[--z-modal] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* 遮罩 */}
      <div
        className={[
          'fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out',
          animating ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* 弹窗 */}
      <div
        ref={modalRef}
        className={[
          'relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl',
          'transition-all duration-200 ease-out',
          animating ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        ].join(' ')}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            <button
              onClick={onClose}
              className="touch-target flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 active:scale-[0.97]"
              aria-label="关闭"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
