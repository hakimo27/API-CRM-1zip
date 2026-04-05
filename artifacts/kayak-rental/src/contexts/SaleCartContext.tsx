import React, { createContext, useContext, useEffect, useState } from 'react';

export interface SaleCartItem {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  oldPrice: number | null;
  quantity: number;
  maxQuantity: number;
  stockStatus: string;
}

interface SaleCartContextType {
  items: SaleCartItem[];
  addItem: (item: SaleCartItem) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  itemCount: number;
}

const SaleCartContext = createContext<SaleCartContextType | null>(null);
const SALE_CART_KEY = 'kayak_sale_cart';

export function SaleCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SaleCartItem[]>(() => {
    try {
      const stored = localStorage.getItem(SALE_CART_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(SALE_CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: SaleCartItem) => {
    setItems(prev => {
      const exists = prev.find(i => i.productId === item.productId);
      if (exists) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxQuantity || 99) }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const removeItem = (productId: number) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQty = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(i =>
        i.productId === productId
          ? { ...i, quantity: Math.min(quantity, i.maxQuantity || 99) }
          : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <SaleCartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalAmount, itemCount }}>
      {children}
    </SaleCartContext.Provider>
  );
}

export function useSaleCart() {
  const ctx = useContext(SaleCartContext);
  if (!ctx) throw new Error('useSaleCart must be used within SaleCartProvider');
  return ctx;
}
