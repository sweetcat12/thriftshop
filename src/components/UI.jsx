import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, ArrowUpRight, LoaderCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { money } from "../services/api";
import { useStore } from "../context/Store";
export function Empty({
  title = "Nothing here yet.",
  description,
  link = "/shop",
  action = "Browse the shop",
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button" to={link}>
        {action}
        <ArrowUpRight size={18} />
      </Link>
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="error-state" role="alert">
      <p>{error}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Loading({ grid = false }) {
  return grid ? (
    <div className="product-grid" aria-label="Loading products" role="status">
      {Array.from({ length: 8 }, (_, i) => (
        <div className="skeleton" key={i}>
          <div />
          <p />
          <p />
        </div>
      ))}
    </div>
  ) : (
    <div className="loading" role="status">
      <LoaderCircle size={24} /> Loading…
    </div>
  );
}
export function FavoriteButton({ id }) {
  const { user, favorites, toggleFavorite, notify } = useStore();
  const navigate = useNavigate(),
    location = useLocation();
  const [busy, setBusy] = useState(false);
  const saved = favorites.some((p) => p.id === id);
  return (
    <button
      className={"favorite " + (saved ? "saved" : "")}
      aria-label={saved ? "Remove from saved pieces" : "Save this piece"}
      aria-pressed={saved}
      disabled={busy}
      onClick={async () => {
        if (!user)
          return navigate("/login", {
            state: { from: location.pathname + location.search },
          });
        setBusy(true);
        try {
          await toggleFavorite(id);
        } catch (e) {
          notify(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Heart size={19} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
export function ProductCard({ product: p }) {
  return (
    <article className="product-card">
      <div className="product-image">
        <Link to={`/product/${p.id}`}>
          <img
            src={p.images[0]?.url}
            alt={p.images[0]?.alt || p.name}
            loading="lazy"
          />
          {p.images[1] && (
            <img
              className="alternate-image"
              src={p.images[1].url}
              alt=""
              loading="lazy"
            />
          )}
        </Link>
        <FavoriteButton id={p.id} />
        {!p.stock && <span className="sold-label">Found a home</span>}
      </div>
      <Link to={`/product/${p.id}`} className="product-title">
        {p.name}
        <span>{money(p.price)}</span>
      </Link>
      <p>
        {p.brand} <span className="dot">·</span> {p.size}
        <br />
        {p.condition} condition
      </p>
    </article>
  );
}
export function ProductGrid({ products }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
export function ConfirmDialog({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="delete-title"
      onCancel={onClose}
    >
      {children}
    </dialog>
  );
}
export function Field({
  label,
  name,
  type = "text",
  required = true,
  ...props
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} required={required} {...props} />
    </label>
  );
}
export const addressFields = [
  ["full_name", "Full name", "name"],
  ["email", "Email", "email"],
  ["phone", "Mobile number", "tel"],
  ["address", "House / building / street", "street-address"],
  ["barangay", "Barangay", "address-level3"],
  ["city", "City / municipality", "address-level2"],
  ["province", "Province", "address-level1"],
  ["postal_code", "Postal code", "postal-code"],
];
export function AddressFields({ value, onChange }) {
  return (
    <div className="form-grid">
      {addressFields.map(([name, label, autocomplete]) => (
        <Field
          key={name}
          name={name}
          label={label}
          autoComplete={autocomplete}
          type={name === "email" ? "email" : name === "phone" ? "tel" : "text"}
          value={value[name] || ""}
          onChange={(e) => onChange({ ...value, [name]: e.target.value })}
          pattern={
            name === "postal_code"
              ? "[0-9]{4}"
              : name === "phone"
                ? "(\\+63|0)9[0-9]{9}"
                : undefined
          }
          maxLength={name === "postal_code" ? 4 : 200}
          placeholder={name === "phone" ? "09171234567" : undefined}
        />
      ))}
    </div>
  );
}
