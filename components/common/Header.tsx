import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface HeaderProps {
    title: string;
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
            <div className="w-10 flex justify-start items-center">
                {leftAction}
            </div>

            <h1 className="text-xl font-bold text-gray-900 tracking-tight text-center flex-1 truncate">
                {title}
            </h1>

            <div className="w-10 flex justify-end items-center">
                {rightAction}
            </div>
        </motion.header>
    );
};

export default Header;
