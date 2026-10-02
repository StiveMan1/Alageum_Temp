import React, { useEffect, useRef, useState } from "react";
import { useAuth, useFetchClient } from "@strapi/strapi/admin";
import { useSearchParams } from "react-router-dom";
import "./catalog.css";
import { errorMessage, accountKey, mutationOptions, acceptMutationResponse } from "../client-guards.mjs";

const ROOT = "/alageum-catalog";
const LOCALES = [["ru", "RU"], ["kk", "KZ"], ["en", "EN"], ["zh", "CN"], ["uz", "UZ"]];
const nameOf = (p) => p.translations?.ru?.name || Object.values(p.translations || {}).find((t) => t.name)?.name || p.public_key;

function Field({ label, children }) {
  return <label className="alageum-field"><span>{label}</span>{children}</label>;
}

function Editor({ id, categories, token, onClose, onSaved }) {
  const { get, post, put } = useFetchClient();
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const inFlight = useRef(false);
  const loadGeneration = useRef(0);
  const isNew = id === "new";
  const populate = (p) => {
    setProduct(p);
    setForm({ ...p, translations: structuredClone(p.translations), price: p.price ?? "", currency: p.currency ?? "KZT", sku: p.sku ?? "" });
  };
  async function load() {
    const generation = ++loadGeneration.current;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { data } = await get(`${ROOT}/products/${id}`);
      if (active.current && generation === loadGeneration.current) populate(data);
    } catch (e) {
      if (active.current && generation === loadGeneration.current) setError(errorMessage(e));
    } finally {
      if (active.current && generation === loadGeneration.current) setBusy(false);
    }
  }
  useEffect(() => {
    active.current = true;
    if (isNew) populate({ public_key: "", slug: "", category_id: categories[0]?.id || "", translations: { ru: { name: "", description: "" } }, status: "draft", price_mode: "on_request", comparable: true });
    else load();
    return () => { active.current = false; ++loadGeneration.current; };
  }, [id]);
  function field(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function translation(locale, key, value) {
    setForm((current) => ({ ...current, translations: { ...current.translations, [locale]: { ...current.translations[locale], [key]: value } } }));
  }
  async function save(action = "save") {
    if (inFlight.current || !form) return;
    inFlight.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      // Native Strapi's fetch client retries every method on 401. Accept that
      // response here and reject it ourselves, outside its retry interceptor.
      // A save must never be replayed under a later login or refreshed session.
      const options = mutationOptions(token);
      let response;
      if (action !== "save") response = await post(`${ROOT}/products/${id}/${action}`, { version: product.version }, options);
      else {
        const body = { slug: form.slug, sku: form.sku || null, category_id: form.category_id, translations: form.translations, status: form.status, comparable: form.comparable, price_mode: form.price_mode, price: form.price_mode === "fixed" ? form.price : null, currency: form.price_mode === "fixed" ? form.currency : null };
        response = isNew ? await post(`${ROOT}/products`, { ...body, public_key: form.public_key }, options) : await put(`${ROOT}/products/${id}`, { ...body, version: product.version }, options);
      }
      acceptMutationResponse(response);
      if (!active.current) return;
      populate(response.data);
      setNotice("Product saved");
      onSaved(response.data);
    } catch (e) {
      if (active.current) setError(errorMessage(e));
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }
  return <section className="alageum-editor" aria-label="Catalog product editor" aria-busy={busy}>
    <div className="alageum-toolbar"><h2>{isNew ? "Create product" : "Edit product"}</h2><button type="button" onClick={onClose}>Close editor</button></div>
    {error && <p className="alageum-error" role="alert">{error}</p>}
    {notice && <p role="status" className="alageum-success">{notice}</p>}
    {!form ? <p>Loading product…</p> : <form onSubmit={(e) => { e.preventDefault(); save(); }}>
      <fieldset disabled={busy}>
        <div className="alageum-grid">
          <Field label="Public key"><input required maxLength={240} value={form.public_key} readOnly={!isNew} onChange={(e) => field("public_key", e.target.value)} /></Field>
          <Field label="Slug"><input required maxLength={240} value={form.slug} onChange={(e) => field("slug", e.target.value)} /></Field>
          <Field label="Category"><select value={form.category_id} onChange={(e) => field("category_id", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{nameOf(c)}{c.is_published ? "" : " (unpublished)"}</option>)}</select></Field>
          <Field label="SKU"><input maxLength={120} value={form.sku} onChange={(e) => field("sku", e.target.value)} /></Field>
          <Field label="Status"><select value={form.status} onChange={(e) => field("status", e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="hidden">Hidden</option></select></Field>
          <Field label="Version"><input value={product.version || "New product"} readOnly /></Field>
        </div>
        {LOCALES.map(([locale, label]) => <details key={locale} open={locale === "ru" || undefined}><summary>{label} content</summary>
          <Field label={`Name (${label})`}><input maxLength={500} value={form.translations[locale]?.name || ""} onChange={(e) => translation(locale, "name", e.target.value)} /></Field>
          <Field label={`Description (${label})`}><textarea rows={4} maxLength={20000} value={form.translations[locale]?.description || ""} onChange={(e) => translation(locale, "description", e.target.value)} /></Field>
        </details>)}
        <div className="alageum-grid">
          <Field label="Price mode"><select value={form.price_mode} onChange={(e) => field("price_mode", e.target.value)}><option value="on_request">On request</option><option value="fixed">Fixed price</option></select></Field>
          {form.price_mode === "fixed" && <><Field label="Price"><input required inputMode="decimal" value={form.price} onChange={(e) => field("price", e.target.value)} /></Field><Field label="Currency"><input required maxLength={3} pattern="[A-Z]{3}" value={form.currency} onChange={(e) => field("currency", e.target.value.toUpperCase())} /></Field></>}
        </div>
        <label className="alageum-checkbox"><input type="checkbox" checked={form.comparable} onChange={(e) => field("comparable", e.target.checked)} />Available for comparison</label>
        {!isNew && <p className="alageum-muted">Public ID: {product.id}. Existing source evidence, specifications and media are preserved.</p>}
        <div className="alageum-actions"><button className="alageum-primary" type="submit">{busy ? "Saving…" : "Save product"}</button>
          {!isNew && <button type="button" onClick={() => save(product.status === "hidden" ? "restore" : "hide")}>{product.status === "hidden" ? "Restore draft" : "Hide product"}</button>}
          {!isNew && <button type="button" onClick={load}>Reload product</button>}
        </div>
      </fieldset>
    </form>}
  </section>;
}

function CatalogContents({ token }) {
  const { get } = useFetchClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("product");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    setLoading(true); setError("");
    Promise.all([get(`${ROOT}/products?${new URLSearchParams({ page: String(page), page_size: "20", q: search })}`), get(`${ROOT}/categories?page_size=100`)])
      .then(([products, cats]) => { if (generation.current === current) { setResult(products.data); setCategories(cats.data.items); } })
      .catch((e) => { if (generation.current === current) { setResult({ items: [], total: 0 }); setCategories([]); setError(errorMessage(e)); } })
      .finally(() => { if (generation.current === current) setLoading(false); });
    return () => { ++generation.current; };
  }, [page, search, revision]);
  function select(product) { setSearchParams(product ? { product } : {}); }
  return <main className="alageum-catalog">
    <div className="alageum-toolbar"><div><p className="alageum-eyebrow">ALAGEUM</p><h1>Catalog</h1><p>Edit catalog content and publication status</p></div><button disabled={!categories.length} onClick={() => select("new")}>Create product</button></div>
    {error && <p className="alageum-error" role="alert">{error}</p>}
    {id && categories.length > 0 && <Editor key={id} id={id} token={token} categories={categories} onClose={() => select(null)} onSaved={(product) => { setRevision((n) => n + 1); if (id === "new") select(product.id); }} />}
    <form className="alageum-search" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(query.trim()); }}><Field label="Search catalog"><input maxLength={200} value={query} onChange={(e) => setQuery(e.target.value)} /></Field><button type="submit">Search</button></form>
    <p role="status">{loading ? "Loading catalog…" : `${result.total} products`}</p>
    <div className="alageum-table-wrap"><table><thead><tr><th>Product</th><th>Public key</th><th>Status</th><th>Version</th></tr></thead><tbody>{result.items.map((p) => <tr key={p.id}><td><button className="alageum-link" onClick={() => select(p.id)}>{nameOf(p)}</button></td><td>{p.public_key}</td><td>{p.status}</td><td>{p.version}</td></tr>)}</tbody></table></div>
    {!loading && result.items.length === 0 && !error && <p>No matching products</p>}
    <nav className="alageum-actions" aria-label="Catalog pagination"><button disabled={page === 1 || loading} onClick={() => setPage((n) => n - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 20 >= result.total || loading} onClick={() => setPage((n) => n + 1)}>Next</button></nav>
  </main>;
}

// This key only resets local UI state; native server authorization remains the
// security boundary. Native refresh rotates session IDs, so renewal must preserve
// unsaved edits. Account changes remount; native logout unmounts the admin route.

export default function Catalog() {
  const token = useAuth("ALAGEUM catalog", (auth) => auth.token);
  const principal = accountKey(token || "");
  if (!principal) return <main className="alageum-catalog"><p role="alert">Sign in to manage the catalog.</p></main>;
  return <CatalogContents key={principal} token={token} />;
}
