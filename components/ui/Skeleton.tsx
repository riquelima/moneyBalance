import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  variant = 'text' 
}) => {
  const baseStyles = "animate-pulse bg-gray-200 dark:bg-gray-700/50";
  const variants = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-md"
  };

  const style = {
    width: width,
    height: height
  };

  return (
    <div 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      style={style}
    />
  );
};

export default Skeleton;
