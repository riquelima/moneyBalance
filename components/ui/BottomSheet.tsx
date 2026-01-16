import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

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
            className="fixed bottom-0 left-0 right-0 z-50 h-[80vh] rounded-t-3xl border-t-4 border-dark bg-white dark:bg-surface-dark dark:border-white shadow-[0_-4px_0_0_rgba(0,0,0,1)] dark:shadow-[0_-4px_0_0_rgba(255,255,255,1)] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center p-4 cursor-grab active:cursor-grabbing">
              <div className="h-1.5 w-16 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Header */}
            {title && (
              <div className="border-b-2 border-dark/10 dark:border-white/10 px-6 pb-4">
                <h2 className="text-xl font-bold text-dark dark:text-white">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
