import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ShoppingBag, Check, ArrowLeft } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useStore } from "../context/Store";
import { money, api } from "../services/api";
import {
  ProductGrid,
  Loading,
  ErrorState,
  FavoriteButton,
} from "../components/UI";
export default function Product() {
  const { id } = useParams(),
    navigate = useNavigate();
  const { user, cart, addToBag, notify } = useStore();
  const { data: p, loading, error, reload } = useResource("/products/" + id);
  const related = useResource(
    p ? "/products?category=" + p.category_slug + "&available=true" : null,
  );
  const reviews = useResource("/products/" + id + "/reviews");
  const [image, setImage] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => setImage(0), [id]);
  if (loading)
    return (
      <div className="page">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="page">
        <ErrorState error={error} retry={reload} />
      </div>
    );
  const inBag = cart.some((c) => c.id === p.id);
  return (
    <div className="page">
      <Link className="back-link" to="/shop">
        <ArrowLeft size={15} /> Back to the rail
      </Link>
      <div className="product-detail">
        <div>
          <div className="detail-image">
            <img
              src={p.images[image]?.url}
              alt={p.images[image]?.alt || p.name}
            />
          </div>
          {p.images.length > 1 && (
            <div className="thumbnails">
              {p.images.map((img, i) => (
                <button
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={image === i}
                  onClick={() => setImage(i)}
                  key={img.id}
                >
                  <img src={img.url} alt={img.alt} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <p className="eyebrow">{p.category} / ONE OF A KIND</p>
          <h1>{p.name}</h1>
          <p className="detail-price">{money(p.price)}</p>
          <p className="brand-line">
            {p.brand} · Size {p.size}
          </p>
          <div className="condition-note">
            <Check size={17} />
            {p.condition} condition
          </div>
          <p className="description">{p.description}</p>
          <dl className="product-specs">
            <div>
              <dt>Tagged size</dt>
              <dd>{p.size}</dd>
            </div>
            <div>
              <dt>Material</dt>
              <dd>{p.material}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>
                {p.stock ? `${p.stock} available` : "Sold — found a new home"}
              </dd>
            </div>
          </dl>
          <div className="buy-actions">
            <button
              className="button"
              disabled={!p.stock || busy || inBag}
              onClick={async () => {
                if (!user)
                  return navigate("/login", {
                    state: { from: "/product/" + id },
                  });
                setBusy(true);
                try {
                  await addToBag(p.id);
                } catch (e) {
                  notify(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ShoppingBag size={18} />
              {busy
                ? "Adding…"
                : inBag
                  ? "In your bag"
                  : p.stock
                    ? "Add to bag"
                    : "Sold out"}
            </button>
            <FavoriteButton id={p.id} />
          </div>
          {inBag && (
            <Link className="text-link" to="/cart">
              View your bag →
            </Link>
          )}
          <p className="shipping-note">
            ₱120 nationwide shipping · Free over ₱2,000
            <br />
            Adding to your bag does not reserve this piece.
          </p>
          <details open>
            <summary>Actual measurements</summary>
            <p className="muted">
              Measured flat. Compare with something you own.
            </p>
            <dl className="measurement-grid">
              {Object.entries(p.measurements).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </details>
          <details>
            <summary>Condition & care</summary>
            <p>
              {p.condition} — {p.description}
            </p>
            <p>
              Follow the garment’s care label. Wash secondhand clothing before
              wearing.
            </p>
          </details>
          <details>
            <summary>Shipping & returns</summary>
            <p>
              Ships from the Philippines. This prototype simulates purchases; no
              parcel or payment is sent.
            </p>
            <Link className="text-link" to="/about">
              Read our shop notes →
            </Link>
          </details>
          <p className="seller-note">
            Selected by SECONDHAND · Independent thrift, Philippines
          </p>
        </div>
      </div>
      <section className="reviews">
        <h2>Reviews</h2>
        {reviews.data?.length ? (
          reviews.data.map((r) => (
            <div key={r.id}>
              <strong>
                {r.name} · {r.rating}/5
              </strong>
              <p>{r.body}</p>
            </div>
          ))
        ) : (
          <p className="muted">
            No reviews for this piece yet. Buyers can leave a review after
            delivery.
          </p>
        )}
        {user && <ReviewForm id={id} reload={reviews.reload} />}
      </section>
      {related.data?.products.filter((i) => i.id !== p.id).length > 0 && (
        <section className="related">
          <div className="section-heading">
            <h2>A few more good finds</h2>
            <Link to="/shop">Back to the shop ↗</Link>
          </div>
          <ProductGrid
            products={related.data.products
              .filter((i) => i.id !== p.id)
              .slice(0, 4)}
          />
        </section>
      )}
    </div>
  );
}
function ReviewForm({ id, reload }) {
  const { notify } = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <details>
      <summary>Leave a review</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            fields = new FormData(form);
          setBusy(true);
          try {
            await api(`/products/${id}/reviews`, {
              method: "POST",
              body: {
                rating: Number(fields.get("rating")),
                body: fields.get("body"),
              },
            });
            notify("Thanks for sharing.");
            form.reset();
            reload();
          } catch (e) {
            notify(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Rating
          <select name="rating">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Your review
          <textarea name="body" required maxLength={1000} />
        </label>
        <button className="button" disabled={busy}>
          Submit review
        </button>
      </form>
    </details>
  );
}
