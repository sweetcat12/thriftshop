import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import { useWebMCP } from "../hooks/useWebMCP";
const Store = createContext(null);
export function StoreProvider({ children }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [cart, setCart] = useState([]),
    [favorites, setFavorites] = useState([]),
    [message, setMessage] = useState("");
  useEffect(() => {
    api("/auth/me")
      .then(setUser)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  async function refresh() {
    if (!user) {
      setCart([]);
      setFavorites([]);
      return;
    }
    const [c, f] = await Promise.all([api("/cart"), api("/favorites")]);
    setCart(c);
    setFavorites(f);
  }
  useEffect(() => {
    refresh().catch((e) => notify(e.message));
  }, [user?.id]);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(id);
  }, [message]);
  function notify(text) {
    setMessage(text);
  }
  async function toggleFavorite(id) {
    if (!user) return false;
    const saved = favorites.some((p) => p.id === id);
    await api(saved ? `/favorites/${id}` : "/favorites", {
      method: saved ? "DELETE" : "POST",
      ...(!saved ? { body: { product_id: id } } : {}),
    });
    await refresh();
    notify(saved ? "Removed from saved pieces." : "Saved for later.");
    return true;
  }
  async function addToBag(id) {
    await api("/cart", {
      method: "POST",
      body: { product_id: id, quantity: 1 },
    });
    await refresh();
    notify("Added to your bag.");
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setCart([]);
    setFavorites([]);
  }
  useWebMCP({ user, addToBag });
  return (
    <Store.Provider
      value={{
        user,
        setUser,
        ready,
        cart,
        favorites,
        refresh,
        notify,
        toggleFavorite,
        addToBag,
        logout,
      }}
    >
      {children}
      <div
        className={message ? "toast visible" : "toast"}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </Store.Provider>
  );
}
export const useStore = () => useContext(Store);
