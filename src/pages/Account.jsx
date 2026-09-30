import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { ArrowUpRight, LogOut } from "lucide-react";
import { useStore } from "../context/Store";
import { api, money } from "../services/api";
import { useResource } from "../hooks/useResource";
import {
  Field,
  AddressFields,
  ProductGrid,
  Empty,
  Loading,
  ErrorState,
} from "../components/UI";
export function AuthPage({ register = false }) {
  const { setUser, notify } = useStore(),
    navigate = useNavigate(),
    location = useLocation();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const from = location.state?.from;
  return (
    <div className="auth-page">
      <div className="auth-note">
        <p className="eyebrow">A LITTLE LESS NEW.</p>
        <h1>
          Make room for
          <br />
          <i>a good find.</i>
        </h1>
        <img src="/images/rail.jpg" alt="Handpicked clothing on a rail" />
      </div>
      <div className="auth-form">
        <p className="eyebrow">YOUR SECONDHAND</p>
        <h2>{register ? "A place for your finds." : "Good to see you."}</h2>
        <p>
          {register
            ? "Save your favourites and keep your orders in one place."
            : "Sign in to pick up where you left off."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const fields = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const user = await api(
                "/auth/" + (register ? "register" : "login"),
                { method: "POST", body: fields },
              );
              setUser(user);
              notify(register ? "Your account is ready." : "You’re signed in.");
              navigate(
                from?.startsWith("/") && !from.startsWith("//")
                  ? from
                  : "/account",
                { replace: true },
              );
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {register && (
            <Field
              label="Your name"
              name="name"
              autoComplete="name"
              maxLength={100}
            />
          )}
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            minLength={register ? 12 : 1}
            maxLength={72}
          />
          {register && <p className="muted">Use at least 12 characters.</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full-width" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            <ArrowUpRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New here?"}{" "}
          <Link to={register ? "/login" : "/register"} state={{ from }}>
            {register ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
export function AccountNav() {
  return (
    <nav className="account-nav" aria-label="Account">
      <NavLink end to="/account">
        Profile & settings
      </NavLink>
      <NavLink to="/account/orders">Orders</NavLink>
      <NavLink to="/favorites">Saved pieces</NavLink>
      <NavLink to="/account/addresses">Addresses</NavLink>
    </nav>
  );
}
export function Account() {
  const { user, setUser, logout, notify } = useStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">YOUR SECONDHAND</p>
        <h1>Hello, {user.name.split(" ")[0]}.</h1>
      </div>
      <AccountNav />
      <div className="account-columns">
        <section>
          <h2>Your details</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                setUser(
                  await api("/account", {
                    method: "PUT",
                    body: { name: new FormData(e.currentTarget).get("name") },
                  }),
                );
                notify("Profile updated.");
              } catch (e) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Name" name="name" defaultValue={user.name} />
            <Field
              label="Email"
              name="email"
              type="email"
              value={user.email}
              readOnly
            />
            <button className="button" disabled={busy}>
              Save details
            </button>
          </form>
        </section>
        <section>
          <h2>Account settings</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              setBusy(true);
              try {
                await api("/account/password", {
                  method: "PUT",
                  body: Object.fromEntries(new FormData(form)),
                });
                form.reset();
                notify(
                  "Password changed. Other sessions have been signed out.",
                );
              } catch (e) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              name="current_password"
              label="Current password"
              type="password"
              autoComplete="current-password"
            />
            <Field
              name="password"
              label="New password (12+ characters)"
              type="password"
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
            />
            <button className="button secondary" disabled={busy}>
              Change password
            </button>
          </form>
        </section>
      </div>
      <div className="account-actions">
        {user.role === "admin" && (
          <Link className="button" to="/admin">
            Manage the shop <ArrowUpRight size={16} />
          </Link>
        )}
        <button
          className="text-button"
          onClick={async () => {
            try {
              await logout();
              navigate("/");
            } catch (e) {
              notify(e.message);
            }
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
export function Orders() {
  const { data, loading, error, reload } = useResource("/orders");
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Your orders</h1>
      </div>
      <AccountNav />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} retry={reload} />
      ) : !data.length ? (
        <Empty
          title="No orders yet."
          description="Your next good find is out there."
        />
      ) : (
        <div className="order-list">
          {data.map((o) => (
            <Link to={"/order/" + o.id} key={o.id}>
              <div>
                <strong>#{o.order_number}</strong>
                <p>
                  {new Date(o.created_at).toLocaleDateString("en-PH")} ·{" "}
                  {o.item_count} {o.item_count === 1 ? "piece" : "pieces"}
                </p>
              </div>
              <span className="status">{o.status}</span>
              <strong>{money(o.total)}</strong>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
export function Favorites() {
  const { favorites, ready } = useStore();
  return (
    <div className="page">
      <div className="page-heading">
        <p className="eyebrow">WORTH A SECOND LOOK</p>
        <h1>Your saved pieces</h1>
        <p>Keep an eye on them. Saved pieces aren’t reserved.</p>
      </div>
      <AccountNav />
      {!ready ? (
        <Loading />
      ) : favorites.length ? (
        <ProductGrid products={favorites} />
      ) : (
        <Empty
          title="Something will catch your eye."
          description="Tap the heart on a piece to save it here."
        />
      )}
    </div>
  );
}
export function Addresses() {
  const { data, loading, error, reload } = useResource("/addresses");
  const { user, notify } = useStore();
  const [address, setAddress] = useState({
      full_name: user.name,
      email: user.email,
    }),
    [busy, setBusy] = useState(false);
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Your addresses</h1>
      </div>
      <AccountNav />
      <div className="account-columns">
        <section>
          <h2>Saved addresses</h2>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorState error={error} retry={reload} />
          ) : data.length ? (
            data.map((a) => (
              <div className="address-card" key={a.id}>
                <strong>{a.full_name}</strong>
                <p>
                  {a.address}
                  <br />
                  {a.barangay}, {a.city}
                  <br />
                  {a.province} {a.postal_code}
                  <br />
                  {a.phone}
                </p>
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      await api("/addresses/" + a.id, { method: "DELETE" });
                      reload();
                    } catch (e) {
                      notify(e.message);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="muted">No saved addresses yet.</p>
          )}
        </section>
        <section>
          <h2>Add an address</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/addresses", { method: "POST", body: address });
                setAddress({ full_name: user.name, email: user.email });
                reload();
                notify("Address saved.");
              } catch (e) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <AddressFields value={address} onChange={setAddress} />
            <button className="button" disabled={busy}>
              Save address
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
