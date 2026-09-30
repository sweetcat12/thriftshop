import { Link } from "react-router-dom";
import { Empty } from "../components/UI";
export function About() {
  return (
    <div className="page about-page">
      <section className="about-intro">
        <div>
          <p className="eyebrow">THE SECONDHAND STORY</p>
          <h1>
            Already loved.
            <br />
            <i>Ready for more.</i>
          </h1>
          <p>
            We like clothes with a little history. The worn-in denim, the easy
            shirt, the piece you didn’t know you were looking for.
          </p>
          <p>
            SECONDHAND is an independent thrift-store concept from the
            Philippines. A smaller, thoughtful rail of pieces worth wearing
            again.
          </p>
        </div>
        <img
          src="/images/rail.jpg"
          alt="A selection of secondhand clothing on a rail"
        />
      </section>
      <div className="about-notes">
        <section>
          <h2>Know what you’re getting.</h2>
          <p>
            Every listing includes its condition, material and actual
            measurements. Sizes vary between brands and decades, so measure a
            piece you already love and compare.
          </p>
          <dl>
            <div>
              <dt>Like New</dt>
              <dd>Minimal signs of wear.</dd>
            </div>
            <div>
              <dt>Excellent</dt>
              <dd>Light wear, with plenty of life left.</dd>
            </div>
            <div>
              <dt>Good</dt>
              <dd>Visible everyday wear, noted in the description.</dd>
            </div>
            <div>
              <dt>Fair</dt>
              <dd>More noticeable wear or flaws, priced accordingly.</dd>
            </div>
          </dl>
        </section>
        <section>
          <h2>Shop notes</h2>
          <details open>
            <summary>Shipping across the Philippines</summary>
            <p>
              The prototype uses a flat ₱120 shipping fee, waived for orders of
              ₱2,000 or more. A real launch needs a courier connection and
              verified delivery estimates.
            </p>
          </details>
          <details>
            <summary>One-of-one pieces</summary>
            <p>
              Most pieces have a stock of one. Your bag doesn’t reserve an item.
              Availability is confirmed when your order is placed.
            </p>
          </details>
          <details>
            <summary>Returns & concerns</summary>
            <p>
              Check the measurements and condition notes before ordering. This
              is a demonstration store; a live returns policy and contact
              channel must be established before real sales begin.
            </p>
          </details>
          <details>
            <summary>About this prototype</summary>
            <p>
              Catalog photos illustrate sample products. Product details and
              measurements are demonstration data. Payments are simulated. No
              real money is collected or goods dispatched.
            </p>
            <p>
              Photographs are from Unsplash; attribution and source links are
              included in the project’s image credits.
            </p>
          </details>
          <Link className="text-link" to="/shop">
            Back to the rail →
          </Link>
        </section>
      </div>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="page">
      <Empty
        title="This page has moved on."
        description="There are still good finds on the rail."
      />
    </div>
  );
}
