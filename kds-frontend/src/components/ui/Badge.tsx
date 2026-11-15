import React from 'react';
import type { OrderStatus, OrderItemStatus, OrderType } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple'
    | OrderStatus
    | OrderItemStatus
    | OrderType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const getVariantStyles = (): { bg: string; text: string; dotColor: string } => {
    switch (variant) {
      // Order Statuses
      case 'incoming':
        return {
          bg: 'bg-sky-950/70 border-sky-600/40',
          text: 'text-sky-300 font-semibold',
          dotColor: 'bg-sky-400',
        };
      case 'preparing':
      case 'cooking':
        return {
          bg: 'bg-amber-950/70 border-amber-600/40',
          text: 'text-amber-300 font-semibold',
          dotColor: 'bg-amber-400 animate-pulse',
        };
      case 'ready':
      case 'done':
      case 'success':
        return {
          bg: 'bg-emerald-950/70 border-emerald-600/40',
          text: 'text-emerald-300 font-semibold',
          dotColor: 'bg-emerald-400',
        };
      case 'served':
        return {
          bg: 'bg-indigo-950/70 border-indigo-600/40',
          text: 'text-indigo-300 font-semibold',
          dotColor: 'bg-indigo-400',
        };
      case 'completed':
        return {
          bg: 'bg-slate-800/80 border-slate-700/50',
          text: 'text-slate-300',
          dotColor: 'bg-slate-400',
        };
      case 'cancelled':
      case 'danger':
        return {
          bg: 'bg-rose-950/70 border-rose-600/40',
          text: 'text-rose-300 font-semibold',
          dotColor: 'bg-rose-400',
        };
      case 'pending':
        return {
          bg: 'bg-slate-800/80 border-slate-600/40',
          text: 'text-slate-300',
          dotColor: 'bg-slate-400',
        };

      // Order Types
      case 'dine_in':
        return {
          bg: 'bg-emerald-950/50 border-emerald-700/40',
          text: 'text-emerald-300',
          dotColor: 'bg-emerald-400',
        };
      case 'takeaway':
        return {
          bg: 'bg-amber-950/50 border-amber-700/40',
          text: 'text-amber-300',
          dotColor: 'bg-amber-400',
        };
      case 'pre_order':
        return {
          bg: 'bg-purple-950/50 border-purple-700/40',
          text: 'text-purple-300',
          dotColor: 'bg-purple-400',
        };

      case 'info':
        return {
          bg: 'bg-blue-950/70 border-blue-600/40',
          text: 'text-blue-300',
          dotColor: 'bg-blue-400',
        };
      case 'warning':
        return {
          bg: 'bg-orange-950/70 border-orange-600/40',
          text: 'text-orange-300',
          dotColor: 'bg-orange-400',
        };
      case 'purple':
        return {
          bg: 'bg-violet-950/70 border-violet-600/40',
          text: 'text-violet-300',
          dotColor: 'bg-violet-400',
        };

      default:
        return {
          bg: 'bg-slate-800/70 border-slate-700/60',
          text: 'text-slate-300',
          dotColor: 'bg-slate-400',
        };
    }
  };

  const { bg, text, dotColor } = getVariantStyles();

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 tracking-wide',
    md: 'text-xs px-2.5 py-1 font-medium tracking-wide',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${bg} ${text} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
};
