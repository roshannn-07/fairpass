// File: src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString()
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function isEmpty(value: any): boolean {
  if (value == null) return true
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// --- O1: Debounce Utility ---
export function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout | null; // Use NodeJS.Timeout for better typing

  return function executedFunction(...args: any[]) {
    // @ts-ignore - This context binding is necessary for debounce to work with classes
    const context = this; 
    
    const later = () => {
      timeout = null;
      func.apply(context, args);
    };
    
    clearTimeout(timeout as NodeJS.Timeout); // Cast to NodeJS.Timeout for safety
    timeout = setTimeout(later, wait);
  }
}

export function throttle(func: Function, limit: number) {
  let inThrottle: boolean
  return function executedFunction(...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function deepClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

// --- O9: Image Optimization Utility ---
export function getOptimizedImageUrl(ipfsUrl: string): string {
    if (!ipfsUrl) return "/placeholder.svg";
    // Replace ipfs:// with a public gateway URL for general display
    return ipfsUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
}