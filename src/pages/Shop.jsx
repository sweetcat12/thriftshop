import { useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { ProductGrid, Loading, ErrorState, Empty } from "../components/UI";
export default function Shop() {
  const [params, setParams] = useSearchParams();
  const { category } = useParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState(params.get("q") || "");
  const effective = new URLSearchParams(params);
  if (category) effective.set("category", category);
  const { data, loading, error, reload } = useResource(
    "/products?" + effective.toString(),
  );
  const { data: categories } = useResource("/categories");
  const { data: brands } = useResource("/brands");
  function change(key, value) {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  }
  const price =
    params.get("max") === "500"
      ? "0-500"
      : params.get("min") === "500"
        ? "500-1000"
        : params.get("min") === "1000"
          ? "1000-2000"
          : params.get("min") === "2000"
            ? "2000-"
            : "";
  return (
    <div className="page shop-page">
      <div className="page-heading">
        <p className="eyebrow">THE SECONDHAND COLLECTION</p>
        <h1>
          {category
            ? categories?.find((c) => c.slug === category)?.name || category
            : params.get("q")
              ? `Results for “${params.get("q")}”`
              : "Find something worth keeping."}
        </h1>
        <p>One piece, one size. When it’s gone, it’s gone.</p>
      </div>
      <form
        className="shop-search"
        onSubmit={(e) => {
          e.preventDefault();
          change("q", search);
        }}
      >
        <label className="sr-only" htmlFor="product-search">
          Search products
        </label>
        <input
          id="product-search"
          placeholder="Search pieces, brands, fabrics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="button">Search</button>
      </form>
      <div className="shop-toolbar">
        <span>
          {loading ? "Finding pieces…" : `${data?.total || 0} pieces`}
        </span>
        <button
          className="filter-toggle"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
        <label>
          Sort{" "}
          <select
            value={params.get("sort") || "newest"}
            onChange={(e) => change("sort", e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className="shop-layout">
        <aside
          className={"filters " + (filterOpen ? "open" : "")}
          id="categories"
        >
          <div className="filter-heading">
            Filter pieces
            <button
              className="icon-button"
              aria-label="Clear filters"
              onClick={() => {
                setParams({});
                setSearch("");
              }}
            >
              <X size={16} />
            </button>
          </div>
          <label>
            Category
            <select
              value={category || params.get("category") || ""}
              disabled={!!category}
              onChange={(e) => change("category", e.target.value)}
            >
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Price
            <select
              value={price}
              onChange={(e) => {
                const next = new URLSearchParams(params);
                next.delete("min");
                next.delete("max");
                if (e.target.value) {
                  const [min, max] = e.target.value.split("-");
                  if (min) next.set("min", min);
                  if (max) next.set("max", max);
                }
                setParams(next);
              }}
            >
              <option value="">All prices</option>
              <option value="0-500">Under ₱500</option>
              <option value="500-1000">₱500–₱1,000</option>
              <option value="1000-2000">₱1,000–₱2,000</option>
              <option value="2000-">₱2,000+</option>
            </select>
          </label>
          <label>
            Size
            <select
              value={params.get("size") || ""}
              onChange={(e) => change("size", e.target.value)}
            >
              <option value="">All sizes</option>
              {["XS", "S", "M", "L", "XL", "XXL", "One size", "EU 39"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Condition
            <select
              value={params.get("condition") || ""}
              onChange={(e) => change("condition", e.target.value)}
            >
              <option value="">Any condition</option>
              {["Like New", "Excellent", "Good", "Fair"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Brand
            <select
              value={params.get("brand") || ""}
              onChange={(e) => change("brand", e.target.value)}
            >
              <option value="">All brands</option>
              {brands?.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={params.get("available") === "true"}
              onChange={(e) =>
                change("available", e.target.checked ? "true" : "")
              }
            />{" "}
            Available pieces only
          </label>
          <button
            className="text-button"
            onClick={() => {
              setParams({});
              setSearch("");
            }}
          >
            Clear filters
          </button>
        </aside>
        <div>
          {loading ? (
            <Loading grid />
          ) : error ? (
            <ErrorState error={error} retry={reload} />
          ) : data?.products.length ? (
            <ProductGrid products={data.products} />
          ) : (
            <Empty
              title="No pieces match just yet."
              description="Try a different size, category or search."
              link="/shop"
              action="Reset your search"
            />
          )}
        </div>
      </div>
    </div>
  );
}
