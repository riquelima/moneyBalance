import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />

            {/* Container de Centralização Horizontal */}
            <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none overflow-hidden">
              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 100) {
                    onClose();
                  }
                }}
                className="w-full max-w-md h-[80vh] rounded-t-3xl border-t border-white/20 bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-xl shadow-glass-lg flex flex-col text-gray-900 dark:text-white select-none pointer-events-auto"
              >
                {/* Handle */}
                <div className="flex justify-center p-4 cursor-grab active:cursor-grabbing">
                  <div className="h-1.5 w-16 rounded-full bg-gray-300/50 dark:bg-white/20" />
                </div>

                {/* Header */}
                {title && (
                  <div className="border-b border-gray-200/50 dark:border-white/10 px-6 pb-4">
                    <h2 className="text-xl font-bold text-text-primary dark:text-white leading-none">{title}</h2>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6" style={{ touchAction: 'pan-y' }}>
                  {children}
                </div>
              </motion.div>
            </div>
          </>
        )
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BottomSheet;
