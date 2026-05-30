import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface HeaderProps {
    title: React.ReactNode;
    leftAction?: ReactNode;
    rightAction?: ReactNode;
    className?: string;
}

const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction, className = '' }) => {
    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`sticky top-0 z-50 flex items-center justify-between px-6 py-5 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all ${className}`}
        >
            <div className="flex-shrink-0 flex justify-start items-center min-w-[40px]">
                {leftAction}
            </div>

            <div className="text-center flex-1 px-2 flex justify-center min-w-0">
                {title}
            </div>

            <div className="flex-shrink-0 flex justify-end items-center min-w-[40px]">
                {rightAction}
            </div>
        </motion.header>
    );
};

export default Header;
