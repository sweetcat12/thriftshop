import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { ProductGrid, Loading, ErrorState } from "../components/UI";
export default function Home() {
  const { data, loading, error, reload } = useResource(
    "/products?available=true",
  );
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">LESS NEW. MORE YOU.</p>
          <h1>
            Good clothes.
            <br />
            <i>Another life.</i>
          </h1>
          <p>
            Pieces with a little history.
            <br />
            And plenty of wear left in them.
          </p>
          <Link className="button" to="/shop?sort=newest">
            Shop new arrivals <ArrowUpRight size={18} />
          </Link>
          <span className="small-note">
            Handpicked in the Philippines. Always one of a kind.
          </span>
        </div>
        <div
          className="hero-photo"
          role="img"
          aria-label="A rail of neutral-toned clothing"
        >
          <p>
            THE EVERYDAY EDIT
            <br />A FEW GOOD FINDS.
          </p>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FRESH ON THE RAIL</p>
            <h2>New arrivals</h2>
          </div>
          <Link to="/shop">See all pieces ↗</Link>
        </div>
        {loading ? (
          <Loading grid />
        ) : error ? (
          <ErrorState error={error} retry={reload} />
        ) : (
          <ProductGrid products={data.products.slice(0, 4)} />
        )}
      </section>
      <section className="editorial section">
        <img
          src="/images/shirt.jpg"
          alt="Blue linen shirt on a wooden hanger"
          loading="lazy"
        />
        <div>
          <p className="eyebrow">NOT NEW. NOT ORDINARY.</p>
          <h2>
            A good find is
            <br />
            <i>worth keeping.</i>
          </h2>
          <p>
            We look for the pieces you’ll reach for again and again. Easy
            shirts. Good denim. A jacket with a bit of character.
          </p>
          <p>
            Every piece comes with measurements and honest condition notes. A
            little history, no surprises.
          </p>
          <Link className="text-link" to="/about">
            A little about us <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <section className="section categories-section">
        <p className="eyebrow">WHAT ARE YOU LOOKING FOR?</p>
        <h2>Find your kind of secondhand.</h2>
        <div className="category-links">
          {[
            "T-Shirts",
            "Shirts",
            "Jeans",
            "Jackets",
            "Skirts",
            "Bags",
            "Shoes",
            "Accessories",
          ].map((c) => (
            <Link key={c} to={"/category/" + c.toLowerCase()}>
              {c}
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
