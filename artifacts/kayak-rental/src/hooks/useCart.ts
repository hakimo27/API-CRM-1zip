import { useState, useCallback, useEffect } from "react";
import {
  loadCart,
  saveCart,
  addToCart as addToCartLib,
  removeFromCart as removeFromCartLib,
  updateCartDates as updateCartDatesLib,
  clearCart as clearCartLib,
  type CartState,
  type CartItem,
} from "@/lib/cart";

export function useCart() {
  const [cart, setCart] = useState<CartState>(() => loadCart());

  useEffect(() => {
    const handleStorage = () => setCart(loadCart());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addItem = useCallback((item: CartItem) => {
    const updated = addToCartLib(item);
    setCart({ ...updated });
  }, []);

  const removeItem = useCallback((productId: number) => {
    const updated = removeFromCartLib(productId);
    setCart({ ...updated });
  }, []);

  const setDates = useCallback((startDate: string, endDate: string) => {
    const updated = updateCartDatesLib(startDate, endDate);
    setCart({ ...updated });
  }, []);

  const clear = useCallback(() => {
    const updated = clearCartLib();
    setCart({ ...updated });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    const current = loadCart();
    const item = current.items.find((i) => i.productId === productId);
    if (item) {
      if (quantity <= 0) {
        const updated = removeFromCartLib(productId);
        setCart({ ...updated });
      } else {
        item.quantity = quantity;
        saveCart(current);
        setCart({ ...current });
      }
    }
  }, []);

  return {
    cart,
    addItem,
    removeItem,
    setDates,
    clear,
    updateQuantity,
    itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
  };
}
