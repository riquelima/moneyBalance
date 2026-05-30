import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataItem {
    name: string;
    value: number;
    color?: string;
}

interface StyledPieChartProps {
    data: DataItem[];
    size?: number;
    donut?: boolean;
    thickness?: number;
    hideLegend?: boolean;
    hideCenterText?: boolean;
}

const StyledPieChart: React.FC<StyledPieChartProps> = ({
    data,
    size = 220,
    donut = true,
    thickness = 40,
    hideLegend = false,
    hideCenterText = false
}) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const total = useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

    // Generate vibrant, distinct colors if not provided
    const defaultColors = [
        '#FF455F', // Red/Pink
        '#00D68F', // Green/Teal
        '#2D9CDB', // Blue
        '#F2C94C', // Yellow
        '#9B51E0', // Purple
        '#FF9F43', // Orange
        '#341f97', // Dark Blue
        '#10ac84', // Dark Green
        '#f368e0', // Light Pink
        '#0abde3', // Cyan
    ];

    const processedData = useMemo(() => {
        let startAngle = 0;
        return data.map((item, index) => {
            const percentage = total > 0 ? item.value / total : 0;
            const angle = percentage * 360;
            const endAngle = startAngle + angle;

            const slice = {
                ...item,
                startAngle,
                endAngle,
                percentage,
                color: item.color || defaultColors[index % defaultColors.length]
            };

            startAngle = endAngle;
            return slice;
        });
    }, [data, total]);

    // Helper to calculate SVG path for visual slice
    const getSlicePath = (start: number, end: number, innerR: number, outerR: number) => {
        const startRad = (start - 90) * (Math.PI / 180);
        const endRad = (end - 90) * (Math.PI / 180);

        // Ensure we don't draw weird artifacts for 100% or close to 100%
        const largeArc = end - start > 180 ? 1 : 0;

        // Outer points
        const x1 = Math.cos(startRad) * outerR;
        const y1 = Math.sin(startRad) * outerR;
        const x2 = Math.cos(endRad) * outerR;
        const y2 = Math.sin(endRad) * outerR;

        // Inner points
        const x3 = Math.cos(endRad) * innerR;
        const y3 = Math.sin(endRad) * innerR;
        const x4 = Math.cos(startRad) * innerR;
        const y4 = Math.sin(startRad) * innerR;

        // Full circle check
        if (Math.abs(end - start) >= 360) {
            return `M ${-outerR} 0 A ${outerR} ${outerR} 0 1 1 ${outerR} 0 A ${outerR} ${outerR} 0 1 1 ${-outerR} 0 M ${-innerR} 0 A ${innerR} ${innerR} 0 1 0 ${innerR} 0 A ${innerR} ${innerR} 0 1 0 ${-innerR} 0 Z`;
        }

        return `
      M ${x1} ${y1}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
    };

    const center = size / 2;
    const outerRadius = (size / 2) - 10; // Padding
    const innerRadius = donut ? outerRadius - thickness : 0;

    const activeItem = activeIndex !== null ? processedData[activeIndex] : null;



    return (
        <div className="flex flex-col items-center justify-center w-full relative">
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`-${size / 2} -${size / 2} ${size} ${size}`} className="overflow-visible z-10">
                    {processedData.map((slice, index) => {
                        const isActive = activeIndex === index;
                        const path = getSlicePath(slice.startAngle, slice.endAngle, innerRadius, outerRadius);
                        const midAngle = slice.startAngle + (slice.endAngle - slice.startAngle) / 2;
                        const midRad = (midAngle - 90) * (Math.PI / 180);
                        const offset = isActive ? 10 : 0;
                        const tx = Math.cos(midRad) * offset;
                        const ty = Math.sin(midRad) * offset;

                        return (
                            <motion.path
                                key={`${index}-${slice.name}`}
                                d={path}
                                fill={slice.color}
                                stroke="white"
                                strokeWidth="2"
                                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                                animate={{
                                    scale: isActive ? 1.05 : 1,
                                    opacity: (activeIndex === null || isActive) ? 1 : 0.5,
                                    rotate: 0,
                                    x: tx,
                                    y: ty,
                                }}
                                style={{
                                    filter: isActive ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.2))' : 'none',
                                    transformBox: 'fill-box',
                                    transformOrigin: 'center'
                                }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 100,
                                    damping: 20
                                }}
                                onMouseEnter={() => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                                onClick={() => setActiveIndex(index === activeIndex ? null : index)}
                                className="cursor-pointer"
                            />
                        );
                    })}
                </svg>

                {/* Center Info (Overlay) */}
                {donut && !hideCenterText && (
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-20"
                        style={{ width: innerRadius * 2, height: innerRadius * 2 }}
                    >
                        <AnimatePresence mode="wait">
                            {activeItem ? (
                                <motion.div
                                    key="active"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex flex-col items-center justify-center"
                                >
                                    <span
                                        className="font-bold uppercase mb-1 text-center leading-tight break-words px-1"
                                        style={{
                                            color: activeItem.color,
                                            fontSize: activeItem.name.length > 14 ? '9px' : '11px',
                                            maxWidth: '100%'
                                        }}
                                    >
                                        {activeItem.name}
                                    </span>
                                    <span className="text-2xl font-black text-gray-900 leading-none">
                                        {Math.round(activeItem.percentage * 100)}%
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                                        {activeItem.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="total"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex flex-col items-center justify-center"
                                >
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total</span>
                                    <span className="text-sm font-black text-gray-900 text-center leading-tight truncate max-w-full px-1">
                                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Legend Below - Grid Layout (2 Columns) */}
            {!hideLegend && (
                <div className="mt-6 w-full max-h-60 overflow-y-auto custom-scrollbar px-1">
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {processedData.map((item, index) => (
                            <motion.div
                                key={index}
                                className={`flex items-center gap-2 p-2 px-3 rounded-xl border transition-all cursor-pointer ${activeIndex === index ? 'bg-white shadow-lg scale-105 border-transparent' : 'bg-transparent border-transparent hover:bg-white/40'}`}
                                onClick={() => setActiveIndex(index === activeIndex ? null : index)}
                                whileHover={{ scale: 1.02 }}
                                style={{
                                    backgroundColor: activeIndex === index ? 'rgba(255,255,255,0.85)' : undefined,
                                    boxShadow: activeIndex === index ? `0 4px 15px -3px ${item.color}40` : undefined
                                }}
                            >
                                <div className="min-w-[12px] h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-bold text-gray-700 truncate w-full">{item.name}</span>
                                    <span className="text-[10px] font-bold text-gray-400 opacity-80">{Math.round(item.percentage * 100)}%</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
};

export default StyledPieChart;
