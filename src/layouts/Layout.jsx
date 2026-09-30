import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Search,
  UserRound,
  ShoppingBag,
  Menu,
  X,
  ArrowUpRight,
  Heart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../context/Store";
export default function Layout() {
  const { user, cart } = useStore();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [q, setQ] = useState("");
  const location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    setMenu(false);
    setSearch(false);
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        One of a kind. Ready for another life.
        <span>Shipping across the Philippines</span>
      </div>
      <header>
        <Link className="logo" to="/">
          SECONDHAND<span>CURATED FINDS. SECOND CHANCES.</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/shop">Shop all</NavLink>
          <Link to="/shop?sort=newest">New arrivals</Link>
          <Link to="/shop#categories">Categories</Link>
          <NavLink to="/about">Our story</NavLink>
        </nav>
        <div className="nav-tools">
          <button
            aria-label="Search"
            aria-expanded={search}
            onClick={() => setSearch(!search)}
          >
            <Search size={20} />
          </button>
          <Link
            className="desktop-account"
            to={user ? "/account" : "/login"}
            aria-label="Account"
          >
            <UserRound size={20} />
          </Link>
          <Link
            to="/cart"
            aria-label={`Shopping bag, ${cart.reduce((s, p) => s + p.quantity, 0)} items`}
            className="bag-link"
          >
            <ShoppingBag size={20} />
            <span>{cart.reduce((s, p) => s + p.quantity, 0)}</span>
          </Link>
          <button
            className="mobile-menu-toggle"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      {search && (
        <form
          className="header-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/search?q=" + encodeURIComponent(q));
          }}
        >
          <label htmlFor="site-search">Find your next piece</label>
          <input
            autoFocus
            id="site-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try denim, linen or a brand…"
          />
          <button className="button" type="submit">
            Search
          </button>
        </form>
      )}
      {menu && (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          <Link to="/shop">Shop all</Link>
          <Link to="/shop?sort=newest">New arrivals</Link>
          <Link to="/shop#categories">Categories</Link>
          <Link to="/favorites">Saved pieces</Link>
          <Link to={user ? "/account" : "/login"}>My account</Link>
          <Link to="/about">Our story</Link>
        </nav>
      )}
      <main id="main">
        <Outlet />
      </main>
      <section className="values-strip">
        <span>Handpicked, one by one</span>
        <span>Honest condition notes</span>
        <span>A little less landfill</span>
      </section>
      <footer>
        <div>
          <Link className="logo" to="/">
            SECONDHAND
          </Link>
          <p>Good clothes deserve another life.</p>
          <small>Independent thrift, Philippines.</small>
        </div>
        <div className="footer-links">
          <Link to="/shop">
            Shop the collection <ArrowUpRight size={14} />
          </Link>
          <Link to="/about">Our story & shipping</Link>
          <Link to="/account/orders">Track your orders</Link>
          <Link to="/favorites">
            <Heart size={14} /> Saved pieces
          </Link>
          {user?.role === "admin" && <Link to="/admin">Shop management</Link>}
        </div>
      </footer>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SECONDHAND</span>
        <span>Prototype store · Sample inventory · Payments simulated</span>
      </div>
    </>
  );
}
