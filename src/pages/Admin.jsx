import { useEffect, useState } from "react";
import {
  NavLink,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Plus, ArrowUpRight, Upload, Trash2 } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { useStore } from "../context/Store";
import { api, money } from "../services/api";
import { Field, Loading, ErrorState, ConfirmDialog } from "../components/UI";
export function AdminLayout() {
  return (
    <div className="page admin-page">
      <div className="page-heading">
        <p className="eyebrow">BEHIND THE RAIL</p>
        <h1>Shop management</h1>
      </div>
      <nav className="account-nav" aria-label="Shop management">
        {[
          ["", "Overview"],
          ["products", "Products"],
          ["orders", "Orders"],
          ["customers", "Customers"],
          ["inventory", "Inventory"],
          ["analytics", "Sales"],
        ].map(([p, n]) => (
          <NavLink key={p} end to={"/admin" + (p ? "/" + p : "")}>
            {n}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
export function Dashboard({ analytics = false }) {
  const { data: d, loading, error, reload } = useResource("/admin/dashboard");
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} retry={reload} />;
  return (
    <>
      <div className="section-heading">
        <h2>{analytics ? "Sales at a glance" : "The shop today"}</h2>
        <Link to="/admin/products/new">
          Add a piece <Plus size={15} />
        </Link>
      </div>
      <p className="muted">
        Figures reflect simulated orders. They are not real sales.
      </p>
      <div className="stats-grid">
        {(analytics
          ? [
              ["Order value", money(d.revenue)],
              ["Orders", d.orders],
              ["Available pieces", d.available],
            ]
          : [
              ["Listed pieces", d.total],
              ["Available", d.available],
              ["Out of stock", d.sold],
              ["Orders", d.orders],
            ]
        ).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {analytics ? (
        <section>
          <h3>Best-selling categories</h3>
          {d.categories.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Pieces ordered</th>
                    <th>Item value</th>
                  </tr>
                </thead>
                <tbody>
                  {d.categories.map((c) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td>{c.units}</td>
                      <td>{money(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-inline">
              No orders yet. Sales by category will appear here.
            </p>
          )}
        </section>
      ) : (
        <div className="admin-shortcuts">
          <Link to="/admin/inventory">
            <h3>Check the rail</h3>
            <p>{d.low_stock} pieces have just one left.</p>
            <ArrowUpRight />
          </Link>
          <Link to="/admin/orders">
            <h3>Pack the next order</h3>
            <p>Review orders and update their progress.</p>
            <ArrowUpRight />
          </Link>
        </div>
      )}
    </>
  );
}
export function AdminProducts({ inventory = false }) {
  const resource = useResource("/products");
  const { notify } = useStore();
  const [query, setQuery] = useState(""),
    [busy, setBusy] = useState(null),
    [deleteId, setDeleteId] = useState(null);
  async function markSold(p) {
    setBusy(p.id);
    try {
      await api("/products/" + p.id, {
        method: "PUT",
        body: { ...p, stock: 0 },
      });
      resource.reload();
      notify("Marked out of stock.");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="section-heading">
        <h2>{inventory ? "Inventory" : "Your pieces"}</h2>
        <Link className="button" to="/admin/products/new">
          <Plus size={16} /> Add a piece
        </Link>
      </div>
      <label className="field">
        Find a product
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or brand"
        />
      </label>
      {resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <ErrorState error={resource.error} retry={resource.reload} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Piece</th>
                <th>Size</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resource.data.products
                .filter((p) =>
                  (p.name + " " + p.brand)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-product">
                        <img src={p.images[0]?.url} alt="" />
                        <span>
                          {p.name}
                          <small>{p.category}</small>
                        </span>
                      </div>
                    </td>
                    <td>{p.size}</td>
                    <td>{money(p.price)}</td>
                    <td>
                      {p.stock === 0
                        ? "Sold / unavailable"
                        : p.stock === 1
                          ? "1 · one of one"
                          : p.stock}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/admin/products/${p.id}/edit`}>Edit</Link>
                        {p.stock > 0 && (
                          <button
                            disabled={busy === p.id}
                            onClick={() => markSold(p)}
                          >
                            Mark sold
                          </button>
                        )}
                        <button onClick={() => setDeleteId(p.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!resource.data.products.length && (
            <p className="empty-inline">
              No products yet. Add your first piece.
            </p>
          )}
        </div>
      )}
      {deleteId && (
        <ConfirmDialog onClose={() => setDeleteId(null)}>
          <h3 id="delete-title">Remove this listing?</h3>
          <p>
            It will disappear from the shop. Past orders keep their original
            details.
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              autoFocus
              onClick={() => setDeleteId(null)}
            >
              Keep it
            </button>
            <button
              className="button"
              disabled={busy === deleteId}
              onClick={async () => {
                setBusy(deleteId);
                try {
                  await api("/products/" + deleteId, { method: "DELETE" });
                  setDeleteId(null);
                  resource.reload();
                  notify("Listing removed.");
                } catch (e) {
                  notify(e.message);
                } finally {
                  setBusy(null);
                }
              }}
            >
              Remove listing
            </button>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
const blank = {
  name: "",
  brand: "",
  category_id: "",
  price: "",
  size: "",
  condition: "Excellent",
  material: "",
  description: "",
  measurements: {},
  stock: 1,
  images: [],
};
export function ProductEditor() {
  const { id } = useParams(),
    navigate = useNavigate();
  const { notify } = useStore();
  const { data: categories } = useResource("/categories");
  const resource = useResource(id ? "/products/" + id : null);
  const [form, setForm] = useState(blank),
    [measurements, setMeasurements] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    if (resource.data) {
      setForm({ ...resource.data, price: resource.data.price / 100 });
      setMeasurements(
        Object.entries(resource.data.measurements)
          .map(([k, v]) => k + ": " + v)
          .join("\n"),
      );
    } else if (!id) {
      setForm({ ...blank });
      setMeasurements("");
    }
  }, [resource.data, id]);
  function field(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("image", file);
      const result = await api("/admin/uploads", {
        method: "POST",
        body: data,
      });
      setForm((f) => ({
        ...f,
        images: [
          ...f.images,
          { url: result.url, alt: f.name || "Product photograph" },
        ],
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  if (id && resource.loading) return <Loading />;
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.reload} />;
  return (
    <>
      <div className="section-heading">
        <h2>{id ? "Edit this piece" : "Add a good find"}</h2>
        <Link to="/admin/products">Back to products</Link>
      </div>
      <form
        className="product-editor"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const entries = measurements
              .split("\n")
              .filter((l) => l.trim())
              .map((line) => {
                const idx = line.indexOf(":");
                if (idx < 1 || !line.slice(idx + 1).trim())
                  throw Error(
                    "Measurements should use one “Chest: 21 in” entry per line.",
                  );
                return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
              });
            const body = {
              ...form,
              category_id: Number(form.category_id),
              price: Math.round(Number(form.price) * 100),
              stock: Number(form.stock),
              measurements: Object.fromEntries(entries),
            };
            await api(id ? "/products/" + id : "/products", {
              method: id ? "PUT" : "POST",
              body,
            });
            notify(id ? "Piece updated." : "New piece added.");
            navigate("/admin/products");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <div className="form-grid">
            <Field
              label="Product name"
              name="name"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
            />
            <Field
              label="Brand"
              name="brand"
              value={form.brand}
              onChange={(e) => field("brand", e.target.value)}
            />
            <label className="field">
              Category
              <select
                required
                value={form.category_id}
                onChange={(e) => field("category_id", e.target.value)}
              >
                <option value="">Choose category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Price (₱)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              max="1000000"
              value={form.price}
              onChange={(e) => field("price", e.target.value)}
            />
            <Field
              label="Size"
              name="size"
              placeholder="M, W32 L30, EU 39…"
              value={form.size}
              onChange={(e) => field("size", e.target.value)}
            />
            <label className="field">
              Condition
              <select
                value={form.condition}
                onChange={(e) => field("condition", e.target.value)}
              >
                {["Like New", "Excellent", "Good", "Fair"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <Field
              label="Material"
              name="material"
              value={form.material}
              onChange={(e) => field("material", e.target.value)}
            />
            <Field
              label="Available stock"
              name="stock"
              type="number"
              min="0"
              max="10000"
              value={form.stock}
              onChange={(e) => field("stock", e.target.value)}
            />
          </div>
          <label className="field">
            Description & condition notes
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
              maxLength={4000}
            />
          </label>
          <label className="field">
            Measurements — one per line
            <textarea
              rows={5}
              placeholder={"Chest: 21 in\nLength: 28 in"}
              value={measurements}
              onChange={(e) => setMeasurements(e.target.value)}
            />
          </label>
        </div>
        <div>
          <h3>Product photographs</h3>
          <p className="muted">Up to 8 images. The first is the cover.</p>
          <div className="editor-images">
            {form.images.map((img, i) => (
              <div key={i}>
                <img src={img.url} alt={img.alt} />
                <Field
                  label={`Image ${i + 1} description`}
                  name={"alt" + i}
                  value={img.alt}
                  onChange={(e) =>
                    field(
                      "images",
                      form.images.map((v, j) =>
                        j === i ? { ...v, alt: e.target.value } : v,
                      ),
                    )
                  }
                />
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    field(
                      "images",
                      form.images.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            ))}
          </div>
          {form.images.length < 8 && (
            <>
              <label className="upload-control">
                <Upload size={18} />
                {uploading ? "Uploading…" : "Upload photograph"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={upload}
                />
              </label>
              <p className="muted">JPEG, PNG or WebP · Up to 5 MB</p>
              <Field
                label="Or use an HTTPS image URL"
                name="image_url"
                type="url"
                required={false}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <button
                className="button secondary"
                type="button"
                disabled={!/^https:\/\//.test(imageUrl)}
                onClick={() => {
                  field("images", [
                    ...form.images,
                    { url: imageUrl, alt: form.name || "Product photograph" },
                  ]);
                  setImageUrl("");
                }}
              >
                Add image URL
              </button>
            </>
          )}
        </div>
        {error && <ErrorState error={error} />}
        <div className="editor-submit">
          <button className="button" disabled={busy || uploading}>
            {busy ? "Saving…" : id ? "Save changes" : "List this piece"}
          </button>
        </div>
      </form>
    </>
  );
}
const transitions = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};
export function AdminOrders() {
  const { data, loading, error, reload } = useResource("/admin/orders");
  const { notify } = useStore();
  const [busy, setBusy] = useState(null),
    [filter, setFilter] = useState("");
  return (
    <>
      <div className="section-heading">
        <h2>Orders</h2>
        <label>
          Status{" "}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All orders</option>
            {Object.keys(transitions).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} retry={reload} />
      ) : !data.length ? (
        <p className="empty-inline">No orders yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {data
                .filter((o) => !filter || o.status === filter)
                .map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="text-link" to={"/order/" + o.id}>
                        #{o.order_number}
                      </Link>
                      <small>
                        {new Date(o.created_at).toLocaleDateString("en-PH")}
                      </small>
                    </td>
                    <td>
                      {o.customer}
                      <small>{o.email}</small>
                    </td>
                    <td>
                      {money(o.total)}
                      <small>{o.payment_method} · Simulated</small>
                    </td>
                    <td>
                      <span className="status">{o.status}</span>
                    </td>
                    <td>
                      {transitions[o.status].length > 0 ? (
                        <select
                          aria-label={"Update " + o.order_number}
                          value=""
                          disabled={busy === o.id}
                          onChange={async (e) => {
                            if (!e.target.value) return;
                            setBusy(o.id);
                            try {
                              await api("/admin/orders/" + o.id, {
                                method: "PUT",
                                body: { status: e.target.value },
                              });
                              reload();
                              notify("Order status updated.");
                            } catch (e) {
                              notify(e.message);
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          <option value="">Move to…</option>
                          {transitions[o.status].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        "Complete"
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export function Customers() {
  const { data, loading, error, reload } = useResource("/admin/customers");
  const [selected, setSelected] = useState(null);
  const orders = useResource(
    selected ? `/admin/customers/${selected.id}/orders` : null,
  );
  return (
    <>
      <h2>Customers</h2>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} retry={reload} />
      ) : !data.length ? (
        <p className="empty-inline">No customers have registered yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Total ordered</th>
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.name}
                    <small>
                      Joined{" "}
                      {new Date(c.created_at).toLocaleDateString("en-PH")}
                    </small>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.orders}</td>
                  <td>{money(c.spent)}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setSelected(c)}
                    >
                      View orders
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <section className="customer-history">
          <div className="section-heading">
            <h3>{selected.name}’s orders</h3>
            <button className="text-button" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          {orders.loading ? (
            <Loading />
          ) : orders.error ? (
            <ErrorState error={orders.error} retry={orders.reload} />
          ) : orders.data?.length ? (
            orders.data.map((o) => (
              <p key={o.id}>
                <Link className="text-link" to={"/order/" + o.id}>
                  #{o.order_number}
                </Link>{" "}
                · {o.status} · {money(o.total)}
              </p>
            ))
          ) : (
            <p>No orders yet.</p>
          )}
        </section>
      )}
    </>
  );
}
