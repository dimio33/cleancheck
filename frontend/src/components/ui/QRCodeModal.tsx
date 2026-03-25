import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
}

export default function QRCodeModal({ isOpen, onClose, restaurantId, restaurantName }: QRCodeModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl] = useState(`https://cleancheck.e-findo.de/rate/${restaurantId}`);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#14B8A6', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      });
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
    const escapedName = restaurantName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedText = t('qr.scanToRate').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>CleanCheck QR</title>
      <style>
        body { font-family: Inter, system-ui, sans-serif; text-align: center; padding: 40px; }
        h1 { font-size: 24px; color: #1c1917; margin-bottom: 8px; }
        p { font-size: 16px; color: #78716c; margin-bottom: 24px; }
        img { width: 256px; height: 256px; }
        .footer { margin-top: 24px; font-size: 12px; color: #a8a29e; }
      </style></head>
      <body>
        <h1>${escapedName}</h1>
        <p>${escapedText}</p>
        <img src="${canvasRef.current.toDataURL('image/png')}" />
        <p class="footer">Powered by CleanCheck &middot; cleancheck.e-findo.de</p>
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
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-lg font-semibold text-stone-900 mb-1 pr-8">{restaurantName}</h3>
            <p className="text-sm text-stone-500 mb-4">{t('qr.scanToRate')}</p>

            <div className="flex justify-center mb-4 bg-white rounded-xl p-3">
              <canvas ref={canvasRef} style={{ width: 200, height: 200 }} />
            </div>

            <button
              onClick={() => { navigator.clipboard.writeText(qrUrl); }}
              className="text-xs text-stone-400 hover:text-teal-500 text-center mb-4 break-all block w-full transition-colors"
              title={t('share.copied')}
            >
              {qrUrl} <span className="text-[10px]">📋</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 text-sm font-medium text-stone-700 active:scale-[0.98] transition-transform"
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
