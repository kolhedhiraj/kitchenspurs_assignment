"use client";

import { useState, type FormEvent } from "react";
import Loader from "@/components/Loader";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
type Category = { id: number; name: string };
type MenuItem = { id: string; name: string; category: string; category_id: number; description: string; price: number; image_url: string | null; is_available: boolean; created_at: string; updated_at: string };
type MenuPayload = { currency: string; categories: Category[]; items: MenuItem[] };
type EditorItem = MenuItem | null;

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const validation = body.errors && Object.values(body.errors as Record<string, string[]>).flat()[0];
    if (typeof validation === "string") return validation;
    if (response.status === 401) return "The menu management key is incorrect.";
    if (response.status === 503) return "Menu management is not configured on the API.";
    return body.message ?? "The request failed. Please try again.";
  } catch { return "The request failed. Please try again."; }
}

export default function MenuManagement() {
 const [key, setKey] = useState(() => {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("menu-management-key") ?? "";
});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [data, setData] = useState<MenuPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorItem | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [manageCategories, setManageCategories] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);

  
async function loadItems(candidateKey: string) {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch(`${API_URL}/api/v1/admin/menu-items`, {
      headers: {
        "X-Menu-Management-Key": candidateKey,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    // Save the key only after the API accepts it.
    sessionStorage.setItem("menu-management-key", candidateKey);

    setData(await response.json() as MenuPayload);
    setActiveKey(candidateKey);
    setKey(candidateKey);
  } catch (reason) {
    setError(
      reason instanceof Error
        ? reason.message
        : "Unable to load menu items."
    );
  } finally {
    setLoading(false);
  }
}


  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeKey) return;
    setSaving(true); setError(null); setSuccess(null);
    const formData = new FormData(event.currentTarget);
    formData.set("is_available", formData.has("is_available") ? "1" : "0");
    const editing = editor && editor !== null ? editor : null;
    if (editing) formData.set("_method", "PATCH");
    const url = editing ? `${API_URL}/api/v1/admin/menu-items/${encodeURIComponent(editing.id)}` : `${API_URL}/api/v1/admin/menu-items`;
    try {
      // Multipart PATCH is not consistently parsed by PHP; use Laravel's method override for edits.
      const response = await fetch(url, { method: "POST", headers: { "X-Menu-Management-Key": activeKey, Accept: "application/json" }, body: formData });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json() as { item: MenuItem; message: string };
      setData((current) => current ? { ...current, items: editing ? current.items.map((item) => item.id === body.item.id ? body.item : item) : [body.item, ...current.items] } : current);
      setSuccess(body.message); setEditor(undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save this menu item."); }
    finally { setSaving(false); }
  }

  async function toggleAvailability(item: MenuItem) {
    if (!activeKey) return;
    setBusyItem(item.id); setError(null); setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/menu-items/${encodeURIComponent(item.id)}/availability`, { method: "PATCH", headers: { "X-Menu-Management-Key": activeKey, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ is_available: !item.is_available }) });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json() as { item: MenuItem; message: string };
      setData((current) => current ? { ...current, items: current.items.map((entry) => entry.id === item.id ? body.item : entry) } : current);
      setSuccess(body.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update availability."); }
    finally { setBusyItem(null); }
  }

  async function deleteItem() {
    if (!activeKey || !deleteTarget) return;
    setBusyItem(deleteTarget.id); setError(null); setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/menu-items/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE", headers: { "X-Menu-Management-Key": activeKey, Accept: "application/json" } });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json() as { message: string };
      setData((current) => current ? { ...current, items: current.items.filter((item) => item.id !== deleteTarget.id) } : current);
      setSuccess(body.message); setDeleteTarget(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to remove this menu item."); }
    finally { setBusyItem(null); }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeKey) return;
    setCategorySaving(true); setError(null); setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/categories${editingCategory ? `/${editingCategory.id}` : ""}`, {
        method: editingCategory ? "PATCH" : "POST",
        headers: { "X-Menu-Management-Key": activeKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json() as { message: string; category: Category };
      setData((current) => current ? {
        ...current,
        categories: editingCategory
          ? current.categories.map((category) => category.id === body.category.id ? body.category : category).sort((a, b) => a.name.localeCompare(b.name))
          : [...current.categories, body.category].sort((a, b) => a.name.localeCompare(b.name)),
        items: editingCategory ? current.items.map((item) => item.category_id === body.category.id ? { ...item, category: body.category.name } : item) : current.items,
      } : current);
      setSuccess(body.message); setEditingCategory(null); setCategoryName("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save this category."); }
    finally { setCategorySaving(false); }
  }

  async function deleteCategory(category: Category) {
    if (!activeKey) return;
    setCategorySaving(true); setError(null); setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/categories/${category.id}`, { method: "DELETE", headers: { "X-Menu-Management-Key": activeKey, Accept: "application/json" } });
      if (!response.ok) throw new Error(await readError(response));
      const body = await response.json() as { message: string };
      setData((current) => current ? { ...current, categories: current.categories.filter((entry) => entry.id !== category.id) } : current);
      setSuccess(body.message);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete this category."); }
    finally { setCategorySaving(false); }
  }

  if (!activeKey) return <section className="panel menu-access-panel"><div className="panel-heading"><div><p className="eyebrow">RESTAURANT</p><h2>Menu Management</h2><p className="panel-detail">Enter the menu management key configured for the Laravel API.</p></div></div>
    <form className="menu-access-form" onSubmit={(event) => { event.preventDefault(); void loadItems(key); }}><label htmlFor="menu-key">Menu management key</label><input id="menu-key" type="password" autoComplete="current-password" value={key} onChange={(event) => setKey(event.target.value)} required />{error && <p className="menu-error" role="alert">{error}</p>}<button className="menu-primary-button" disabled={loading || !key}>{loading ? <><Loader size="sm"/> Checking access…</> : "Continue"}</button></form>
  </section>;

  return <section className="panel menu-management-panel">
    <div className="menu-management-heading"><div><p className="eyebrow">RESTAURANT</p><h2>Menu Management</h2><p className="panel-detail">Manage your restaurant’s food items, prices and availability.</p></div><div className="menu-category-actions"><button className="menu-secondary-button" onClick={() => setManageCategories((visible) => !visible)}>{manageCategories ? "Hide Categories" : "Manage Categories"}</button><button className="menu-primary-button" onClick={() => { setEditor(null); setError(null); }}>Add Food Item</button></div></div>
    {error && <div className="menu-feedback error" role="alert">{error}<button onClick={() => setError(null)} aria-label="Dismiss error">×</button></div>}
    {success && <div className="menu-feedback success" role="status">{success}<button onClick={() => setSuccess(null)} aria-label="Dismiss message">×</button></div>}
    {manageCategories && <section className="menu-category-manager" aria-labelledby="category-manager-title"><div><h3 id="category-manager-title">Manage Categories</h3><p className="panel-detail">Add, rename, or remove categories. Reassign menu items before deleting a category.</p></div>
      <form onSubmit={saveCategory} className="menu-category-form"><label htmlFor="menu-category-name">{editingCategory ? "Category name" : "New category"}<input id="menu-category-name" value={categoryName} maxLength={80} required onChange={(event) => setCategoryName(event.target.value)} placeholder="e.g. Desserts"/></label><button className="menu-primary-button" disabled={categorySaving}>{categorySaving ? <><Loader size="sm"/> Saving…</> : editingCategory ? "Save name" : "Add category"}</button>{editingCategory && <button type="button" className="menu-secondary-button" disabled={categorySaving} onClick={() => { setEditingCategory(null); setCategoryName(""); }}>Cancel</button>}</form>
      {data?.categories.length ? <ul className="menu-category-list">{data.categories.map((category) => <li key={category.id}><span>{category.name}</span><div><button disabled={categorySaving} onClick={() => { setEditingCategory(category); setCategoryName(category.name); setError(null); }}>Edit</button><button className="delete-action" disabled={categorySaving} onClick={() => void deleteCategory(category)}>Delete</button></div></li>)}</ul> : <p className="menu-empty-state">No categories yet. Add one above.</p>}
    </section>}
    {loading && <div className="menu-loading-state" role="status"><Loader size="sm"/> Loading menu items…</div>}
    {!loading && data?.items.length === 0 && <div className="menu-empty-state"><h3>No menu items yet</h3><p>Add the first food item to make it available in the restaurant.</p></div>}
    {!!data?.items.length && <div className="menu-table-wrap"><table className="menu-table"><thead><tr><th>Food</th><th>Category</th><th>Price</th><th>Availability</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}>
      <td><div className="menu-food-cell"><MenuImage item={item}/><div><strong>{item.name}</strong><small>{item.description}</small></div></div></td><td>{item.category}</td><td>{new Intl.NumberFormat("en-IN", { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(item.price)}</td><td><span className={`menu-availability ${item.is_available ? "available" : "unavailable"}`}>{item.is_available ? "Available" : "Unavailable"}</span></td><td>{new Date(item.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td><td><div className="menu-row-actions"><button disabled={busyItem === item.id} onClick={() => { setEditor(item); setError(null); }}>Edit</button><button disabled={busyItem === item.id} onClick={() => void toggleAvailability(item)}>{busyItem === item.id ? "Saving…" : item.is_available ? "Disable" : "Enable"}</button><button className="delete-action" disabled={busyItem === item.id} onClick={() => { setError(null); setDeleteTarget(item); }}>Delete</button></div></td>
    </tr>)}</tbody></table></div>}
    {editor !== undefined && <MenuEditor item={editor} categories={data?.categories ?? []} saving={saving} error={error} onClose={() => { if (!saving) setEditor(undefined); }} onSubmit={saveItem}/>}
    {deleteTarget && <div className="menu-dialog-backdrop"><section className="menu-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><h3 id="delete-title">Remove menu item?</h3><p>Are you sure you want to delete {deleteTarget.name}? Historical orders will keep their item and price details.</p>{error && <p className="menu-error" role="alert">{error}</p>}<div><button className="menu-secondary-button" onClick={() => { setDeleteTarget(null); setError(null); }} disabled={busyItem === deleteTarget.id}>Cancel</button><button className="menu-danger-button" onClick={() => void deleteItem()} disabled={busyItem === deleteTarget.id}>{busyItem === deleteTarget.id ? <><Loader size="sm"/> Removing…</> : "Remove item"}</button></div></section></div>}
  </section>;
}

function MenuImage({ item }: { item: MenuItem }) {
  const [failed, setFailed] = useState(false);
  return item.image_url && !failed ? <img className="menu-food-image" src={item.image_url} alt="" onError={() => setFailed(true)}/> : <span className="menu-food-placeholder" aria-label="No food image">🍽</span>;
}

function MenuEditor({ item, categories, saving, error, onClose, onSubmit }: { item: EditorItem; categories: Category[]; saving: boolean; error: string | null; onClose(): void; onSubmit(event: FormEvent<HTMLFormElement>): void }) {
  const editing = item !== null;
  return <div className="menu-dialog-backdrop"><section className="menu-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="menu-editor-title"><header><div><p className="eyebrow">MENU ITEM</p><h3 id="menu-editor-title">{editing ? "Edit Food Item" : "Add Food Item"}</h3></div><button className="menu-close-button" onClick={onClose} disabled={saving} aria-label="Close">×</button></header>
    {editing && item.image_url && <div className="menu-editor-current-image"><MenuImage item={item}/><span>Current food image</span></div>}
    <form onSubmit={onSubmit} encType="multipart/form-data">{error && <p className="menu-error" role="alert">{error}</p>}<label>Food name<input name="name" defaultValue={item?.name ?? ""} maxLength={120} required /></label><label>Description<textarea name="description" defaultValue={item?.description ?? ""} maxLength={1000} required rows={3}/></label><div className="menu-form-row"><label>Category<select name="category_id" defaultValue={item?.category_id ?? categories[0]?.id ?? ""} required>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Price<input name="price" type="number" min="0" max="1000000" step="1" defaultValue={item?.price ?? ""} required /></label></div><label>Food image<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!editing}/><small>JPEG, PNG or WebP · up to 5 MB{editing ? " · leave empty to keep the current image" : ""}</small></label><label className="menu-checkbox"><input name="is_available" type="checkbox" value="1" defaultChecked={item?.is_available ?? true}/><span>Available to customers</span></label><footer><button type="button" className="menu-secondary-button" onClick={onClose} disabled={saving}>Cancel</button><button className="menu-primary-button" disabled={saving}>{saving ? <><Loader size="sm"/> Saving…</> : editing ? "Save changes" : "Add food item"}</button></footer></form>
  </section></div>;
}
