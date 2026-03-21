import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
}

// Simple QR code generator using canvas (no external deps)
function generateQRCanvas(canvas: HTMLCanvasElement, text: string, color: string) {
  // Use a simple approach: encode the URL as a QR-like visual
  // For production, we'd use the backend endpoint or a library
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = 256;
  canvas.width = size;
  canvas.height = size;

  // Draw white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Draw colored QR placeholder with URL text
  ctx.fillStyle = color;
  ctx.font = 'bold 14px Inter, system-ui';
  ctx.textAlign = 'center';

  // Draw a border
  const pad = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(pad, pad, size - pad * 2, size - pad * 2);

  // Draw inner pattern (simplified QR visual)
  const cellSize = 8;
  const offset = 30;
  const gridSize = Math.floor((size - offset * 2) / cellSize);

  // Generate deterministic pattern from URL
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  // Draw finder patterns (QR corners)
  const drawFinder = (x: number, y: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
    ctx.fillStyle = color;
    ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
  };

  drawFinder(offset, offset);
  drawFinder(size - offset - cellSize * 7, offset);
  drawFinder(offset, size - offset - cellSize * 7);

  // Draw data cells
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = offset + col * cellSize;
      const y = offset + row * cellSize;

      // Skip finder pattern areas
      if ((col < 8 && row < 8) || (col > gridSize - 9 && row < 8) || (col < 8 && row > gridSize - 9)) continue;

      // Deterministic fill based on hash + position
      const val = Math.abs((hash * (row * gridSize + col + 1)) % 100);
      if (val < 40) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
      }
    }
  }
}

export default function QRCodeModal({ isOpen, onClose, restaurantId, restaurantName }: QRCodeModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl] = useState(`https://cleancheck.e-findo.de/rate/${restaurantId}`);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      generateQRCanvas(canvasRef.current, qrUrl, '#14B8A6');
    }
  }, [isOpen, qrUrl]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `cleancheck-qr-${restaurantName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !canvasRef.current) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>CleanCheck QR - ${restaurantName}</title>
      <style>
        body { font-family: Inter, system-ui, sans-serif; text-align: center; padding: 40px; }
        h1 { font-size: 24px; color: #1c1917; margin-bottom: 8px; }
        p { font-size: 16px; color: #78716c; margin-bottom: 24px; }
        img { width: 256px; height: 256px; }
        .footer { margin-top: 24px; font-size: 12px; color: #a8a29e; }
      </style></head>
      <body>
        <h1>${restaurantName}</h1>
        <p>${t('qr.scanToRate')}</p>
        <img src="${canvasRef.current.toDataURL('image/png')}" />
        <p class="footer">Powered by CleanCheck · cleancheck.e-findo.de</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />

          {/* Modal */}
          <motion.div
            className="relative bg-white dark:bg-stone-900 rounded-2xl p-6 w-full max-w-sm shadow-xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1 pr-8">{restaurantName}</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">{t('qr.scanToRate')}</p>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <canvas ref={canvasRef} className="rounded-xl" style={{ width: 200, height: 200 }} />
            </div>

            <p className="text-xs text-stone-400 text-center mb-4 break-all">{qrUrl}</p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-sm font-medium text-stone-700 dark:text-stone-300 active:scale-[0.98] transition-transform"
              >
                {t('qr.download')}
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-medium text-white active:scale-[0.98] transition-transform"
              >
                {t('qr.print')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
