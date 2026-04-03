import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CartItem {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  tariffId: number;
  tariffLabel: string;
  pricePerDay: number;
  quantity: number;
  startDate: string;
  endDate: string;
  days: number;
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateItem: (productId: number, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  totalAmount: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = 'kayak_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.items)) return parsed.items;
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems(prev => {
      const exists = prev.find(i => i.productId === item.productId);
      if (exists) return prev.map(i => i.productId === item.productId ? item : i);
      return [...prev, item];
    });
  };

  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateItem = (productId: number, updates: Partial<CartItem>) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, ...updates } : i));
  };

  const clearCart = () => setItems([]);

  const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItem, clearCart, totalAmount, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
