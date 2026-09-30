import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Minus, Plus, Check, Trash2 } from "lucide-react";
import { useStore } from "../context/Store";
import { api, money } from "../services/api";
import { useResource } from "../hooks/useResource";
import { Empty, Loading, ErrorState, AddressFields } from "../components/UI";
function Totals({ items, children }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0),
    shipping = subtotal >= 200000 ? 0 : 12000;
  return (
    <aside className="order-summary">
      <h3>Order summary</h3>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{money(subtotal)}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>{shipping ? money(shipping) : "On us"}</dd>
        </div>
        <div className="total">
          <dt>Total</dt>
          <dd>{money(subtotal + shipping)}</dd>
        </div>
      </dl>
      <p className="muted">Free shipping on orders ₱2,000 and up.</p>
      {children}
    </aside>
  );
}
export function Cart() {
  const { user, ready, cart, refresh, notify } = useStore();
  const [busy, setBusy] = useState(null);
  async function update(id, quantity) {
    setBusy(id);
    try {
      await api("/cart/" + id, {
        method: quantity ? "PUT" : "DELETE",
        ...(quantity ? { body: { quantity } } : {}),
      });
      await refresh();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(null);
    }
  }
  if (!ready) return <Loading />;
  if (!user)
    return (
      <div className="page">
        <Empty
          title="Your bag starts here."
          description="Sign in to keep your finds together across visits."
          link="/login"
          action="Sign in"
        />
      </div>
    );
  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">GOOD FINDS, ALL TOGETHER</p>
        <h1>
          Your bag <span className="count">({cart.length})</span>
        </h1>
      </div>
      {!cart.length ? (
        <Empty
          title="Your bag is empty."
          description="Find something worth keeping."
        />
      ) : (
        <div className="checkout-layout">
          <div>
            <div className="cart-list">
              {cart.map((p) => (
                <article className="cart-item" key={p.id}>
                  <Link to={"/product/" + p.id}>
                    <img src={p.images[0]?.url} alt={p.name} />
                  </Link>
                  <div>
                    <Link to={"/product/" + p.id}>
                      <h3>{p.name}</h3>
                    </Link>
                    <p>
                      {p.brand} · Size {p.size}
                      <br />
                      {p.condition} condition
                    </p>
                    {(!p.stock || p.archived) && (
                      <p className="form-error">
                        This piece is no longer available. Please remove it.
                      </p>
                    )}
                    <div className="quantity">
                      <button
                        aria-label={"Decrease quantity of " + p.name}
                        disabled={p.quantity <= 1 || busy === p.id}
                        onClick={() => update(p.id, p.quantity - 1)}
                      >
                        <Minus size={13} />
                      </button>
                      <span aria-label="Quantity">{p.quantity}</span>
                      <button
                        aria-label={"Increase quantity of " + p.name}
                        disabled={p.quantity >= p.stock || busy === p.id}
                        onClick={() => update(p.id, p.quantity + 1)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <button
                      className="remove-button"
                      disabled={busy === p.id}
                      onClick={() => update(p.id, 0)}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                  <strong>{money(p.price * p.quantity)}</strong>
                </article>
              ))}
            </div>
            <p className="muted">
              Pieces in your bag aren’t reserved until checkout is complete.
            </p>
            <Link className="text-link" to="/shop">
              ← Keep looking
            </Link>
          </div>
          <Totals items={cart}>
            {cart.every((p) => p.stock >= p.quantity && !p.archived) ? (
              <Link className="button full-width" to="/checkout">
                Checkout <ArrowRight size={17} />
              </Link>
            ) : (
              <p className="form-error">
                Remove unavailable items before checkout.
              </p>
            )}
            <p className="simulation-note">
              Prototype checkout. No real payment will be taken.
            </p>
          </Totals>
        </div>
      )}
    </div>
  );
}
export function Checkout() {
  const { user, cart, refresh } = useStore();
  const navigate = useNavigate();
  const { data: addresses } = useResource("/addresses");
  const [step, setStep] = useState(1),
    [shipping, setShipping] = useState({
      full_name: user.name,
      email: user.email,
    }),
    [payment, setPayment] = useState("GCash"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  if (!cart.length && !busy)
    return (
      <div className="page">
        <Empty
          title="Your bag is empty."
          description="Choose a piece before checking out."
        />
      </div>
    );
  async function place() {
    setBusy(true);
    setError("");
    try {
      const order = await api("/orders", {
        method: "POST",
        body: {
          shipping_address: shipping,
          payment_method: payment,
          idempotency_key: key,
        },
      });
      navigate("/order/" + order.id, {
        replace: true,
        state: { confirmed: true },
      });
      await refresh();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">ALMOST YOURS</p>
        <h1>Checkout</h1>
      </div>
      <ol className="checkout-steps">
        {["Shipping", "Review", "Payment"].map((label, i) => (
          <li
            key={label}
            className={
              step === i + 1 ? "active" : step > i + 1 ? "complete" : ""
            }
          >
            <span>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="checkout-layout">
        <section>
          {step === 1 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
            >
              <h2>Where’s it going?</h2>
              {addresses?.length > 0 && (
                <label className="field">
                  Use a saved address
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const a = addresses.find(
                        (a) => a.id === Number(e.target.value),
                      );
                      if (a) setShipping(a);
                    }}
                  >
                    <option value="">Choose an address</option>
                    {addresses.map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.full_name} — {a.city}, {a.province}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <AddressFields value={shipping} onChange={setShipping} />
              <button className="button">
                Review your order <ArrowRight size={17} />
              </button>
            </form>
          ) : step === 2 ? (
            <>
              <h2>One last look.</h2>
              <div className="review-address">
                <h3>Shipping to</h3>
                <p>
                  {shipping.full_name}
                  <br />
                  {shipping.address}
                  <br />
                  {shipping.barangay}, {shipping.city}
                  <br />
                  {shipping.province} {shipping.postal_code}
                  <br />
                  {shipping.phone}
                  <br />
                  {shipping.email}
                </p>
                <button className="text-button" onClick={() => setStep(1)}>
                  Edit shipping details
                </button>
              </div>
              <div className="mini-items">
                {cart.map((p) => (
                  <div key={p.id}>
                    <img src={p.images[0]?.url} alt={p.name} />
                    <span>
                      {p.name}
                      <small>
                        Size {p.size} · Qty {p.quantity}
                      </small>
                    </span>
                    <strong>{money(p.price * p.quantity)}</strong>
                  </div>
                ))}
              </div>
              <button className="button" onClick={() => setStep(3)}>
                Choose payment <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <>
              <h2>Payment method</h2>
              <div className="notice">
                <strong>Simulated payment</strong>
                <p>
                  This is a prototype order. No money is collected, and no item
                  will be shipped. Do not send funds to anyone for this
                  checkout.
                </p>
              </div>
              <fieldset className="payment-options">
                <legend className="sr-only">Choose a payment method</legend>
                {["GCash", "Maya", "Cash on Delivery", "Bank Transfer"].map(
                  (method) => (
                    <label key={method}>
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === method}
                        onChange={() => setPayment(method)}
                      />
                      <span>{method}</span>
                      <small>Simulated</small>
                    </label>
                  ),
                )}
              </fieldset>
              {error && <ErrorState error={error} />}
              <button
                className="button full-width"
                disabled={busy}
                onClick={place}
              >
                {busy ? "Placing your order…" : "Place simulated order"}
                <ArrowRight size={17} />
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setStep(2)}
              >
                Back to review
              </button>
            </>
          )}
        </section>
        <Totals items={cart}>
          <p className="simulation-note">
            Stock and prices are checked again when you place your order.
          </p>
        </Totals>
      </div>
    </div>
  );
}
export function Order() {
  const { id } = useParams();
  const { data: o, loading, error, reload } = useResource("/orders/" + id);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="page">
        <ErrorState error={error} retry={reload} />
      </div>
    );
  const a = o.shipping_address;
  return (
    <div className="page order-page">
      <p className="eyebrow">
        {o.status === "Cancelled" ? "ORDER CANCELLED" : "ORDER CONFIRMED"}
      </p>
      <h1>
        {o.status === "Cancelled"
          ? "Until the next good find."
          : "Good find. It’s yours."}
      </h1>
      <p className="order-number">
        #{o.order_number} <span className="status">{o.status}</span>
      </p>
      <p className="simulation-note">
        This is a simulated order. No payment was collected and no shipment will
        be sent.
      </p>
      <div className="checkout-layout">
        <div>
          <h2>Your pieces</h2>
          <div className="mini-items">
            {o.items.map((i) => (
              <div key={i.id}>
                <img src={i.image} alt={i.name} />
                <span>
                  {i.name}
                  <small>
                    Size {i.size} · Qty {i.quantity}
                  </small>
                </span>
                <strong>{money(i.price * i.quantity)}</strong>
              </div>
            ))}
          </div>
          <Link className="text-link" to="/account/orders">
            View all orders →
          </Link>
        </div>
        <aside className="order-summary">
          <h3>Order details</h3>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(o.subtotal)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{money(o.shipping)}</dd>
            </div>
            <div className="total">
              <dt>Total</dt>
              <dd>{money(o.total)}</dd>
            </div>
          </dl>
          <h3>Shipping address</h3>
          <p>
            {a.full_name}
            <br />
            {a.address}
            <br />
            {a.barangay}, {a.city}
            <br />
            {a.province} {a.postal_code}
            <br />
            {a.phone}
          </p>
          <h3>Payment</h3>
          <p>
            {o.payment_method} · {o.payment_status}
          </p>
        </aside>
      </div>
    </div>
  );
}
