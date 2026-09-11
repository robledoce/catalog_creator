import React, { useState, useEffect, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import logoAlessiana from "./assets/logo-alessiana.png";
import {
  Plus,
  Trash2,
  Download,
  ArrowLeft,
  ImagePlus,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Store,
  ChevronLeft,
} from "lucide-react";

/* ============================================================
   Almacenamiento persistente
   ============================================================ */

const INDEX_KEY = "catalogos-index";
const catalogKey = (id) => `catalogo:${id}`;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function loadIndex() {
  try {
    if (!window.storage) return [];
    const res = await window.storage.get(INDEX_KEY, false);
    return res ? JSON.parse(res.value) : [];
  } catch {
    return [];
  }
}

async function persistIndex(list) {
  try {
    if (!window.storage) return false;
    const res = await window.storage.set(INDEX_KEY, JSON.stringify(list), false);
    return !!res;
  } catch (e) {
    console.error("No se pudo guardar el índice de catálogos", e);
    return false;
  }
}

async function loadCatalog(id) {
  try {
    if (!window.storage) return null;
    const res = await window.storage.get(catalogKey(id), false);
    return res ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}

async function persistCatalog(id, data) {
  try {
    if (!window.storage) return false;
    const res = await window.storage.set(catalogKey(id), JSON.stringify(data), false);
    return !!res;
  } catch (e) {
    console.error("No se pudo guardar el catálogo", e);
    return false;
  }
}

async function removeCatalogData(id) {
  try {
    if (!window.storage) return;
    await window.storage.delete(catalogKey(id), false);
  } catch (e) {
    console.error("No se pudo eliminar el catálogo", e);
  }
}

/* ============================================================
   Utilidades
   ============================================================ */

function resizeImage(file, maxDim = 640, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blankProduct() {
  return { id: genId(), nombre: "", cantidad: 1, precio: 0, imagen: null, calcularTotal: true, totalManual: 0 };
}

function blankCatalog() {
  const now = Date.now();
  return {
    id: genId(),
    marca: "Alessiana Dulces & Postres",
    lema: "",
    moneda: "S/",
    logo: logoAlessiana,
    mostrarTotal: false,
    productos: [blankProduct()],
    createdAt: now,
    updatedAt: now,
  };
}

const money = (n) => (Number(n) || 0).toFixed(2);

const productTotal = (p) =>
  p.calcularTotal === false
    ? Number(p.totalManual) || 0
    : (Number(p.cantidad) || 0) * (Number(p.precio) || 0);

function slugify(text) {
  return (text || "catalogo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "catalogo";
}

async function downloadNodeAsImage(node, fileName) {
  const canvas = await html2canvas(node, {
    backgroundColor: "#efe4d4",
    scale: 2,
    useCORS: true,
  });
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${fileName}.png`;
  link.click();
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/* ============================================================
   Estilos globales
   ============================================================ */

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,600&family=Quicksand:wght@400;500;600;700&display=swap');

      .cat-app{
        --cream:#FBF3EA;
        --terracotta:#C67B5C;
        --pink:#E8A6A0;
        --gold:#C9A24B;
        --deep:#5B3A2E;
        --card:#FFFDFA;
        --ink-soft:#8a6656;
        font-family:'Quicksand', sans-serif;
        color:var(--deep);
        background:
          radial-gradient(circle at 10% 0%, rgba(232,166,160,0.20), transparent 40%),
          radial-gradient(circle at 90% 100%, rgba(201,162,75,0.14), transparent 45%),
          var(--cream);
        min-height:100vh;
      }
      .cat-app *{ box-sizing:border-box; }
      .cat-app :focus-visible{ outline:2px solid var(--terracotta); outline-offset:2px; }

      .page{ max-width:1180px; margin:0 auto; padding:36px 24px 70px; }

      /* ---------- lista ---------- */
      .page-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:34px; flex-wrap:wrap; }
      .page-eyebrow{ font-size:12px; letter-spacing:.14em; color:var(--terracotta); font-weight:700; margin:0 0 6px; text-transform:uppercase; }
      .page-title{ font-family:'Playfair Display', serif; font-style:italic; font-weight:700; font-size:38px; margin:0; }

      .state-msg{ display:flex; align-items:center; gap:10px; color:var(--ink-soft); font-size:15px; padding:40px 0; }
      .spin{ animation:cat-spin 1s linear infinite; }
      @keyframes cat-spin{ to{ transform:rotate(360deg); } }

      .empty-state{ text-align:center; max-width:420px; margin:60px auto; padding:44px 30px; background:var(--card); border-radius:20px 20px 60px 20px; box-shadow:0 10px 26px rgba(91,58,46,0.10); }
      .empty-icon{ width:56px; height:56px; margin:0 auto 16px; border-radius:50%; background:linear-gradient(135deg,var(--terracotta),var(--pink)); color:#fff; display:flex; align-items:center; justify-content:center; }
      .empty-state h2{ font-family:'Playfair Display',serif; font-size:22px; margin:0 0 8px; }
      .empty-state p{ font-size:14px; color:var(--ink-soft); margin:0 0 22px; line-height:1.5; }

      .catalog-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:22px; }
      .catalog-card{ background:var(--card); border-radius:18px 18px 46px 18px; padding:18px; box-shadow:0 8px 20px rgba(91,58,46,0.10); transition:transform .18s ease, box-shadow .18s ease; }
      .catalog-card:hover{ transform:translateY(-4px); box-shadow:0 14px 26px rgba(91,58,46,0.16); }
      .catalog-card-top{ display:flex; justify-content:center; margin-bottom:12px; }
      .catalog-card-logo{ width:64px; height:64px; border-radius:50%; object-fit:cover; box-shadow:0 4px 10px rgba(91,58,46,0.18); }
      .catalog-card-mono{ width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,var(--terracotta),var(--gold)); color:#fff; display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:26px; font-weight:700; }
      .catalog-card-name{ font-family:'Playfair Display',serif; font-size:18px; line-height:1.3; text-align:center; margin:0 0 10px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:47px; }
      .catalog-card-meta{ text-align:center; font-size:12px; color:var(--ink-soft); margin:0 0 14px; }
      .catalog-card-actions{ display:flex; gap:8px; justify-content:center; align-items:center; min-height:36px; }
      .confirm-text{ font-size:12px; color:var(--ink-soft); }

      /* ---------- botones y campos ---------- */
      .btn{ display:inline-flex; align-items:center; gap:7px; border:none; border-radius:999px; font-family:'Quicksand',sans-serif; font-weight:700; font-size:13.5px; padding:10px 18px; cursor:pointer; transition:transform .12s ease, box-shadow .12s ease; white-space:nowrap; }
      .btn:active{ transform:scale(0.97); }
      .btn:disabled{ opacity:.6; cursor:not-allowed; }
      .btn--primary{ background:linear-gradient(135deg,var(--terracotta),var(--pink)); color:#fff; box-shadow:0 8px 18px rgba(198,123,92,0.32); }
      .btn--ghost{ background:#fff; color:var(--deep); border:1px solid rgba(198,123,92,0.35); }
      .btn--danger{ color:#B14A3A; }
      .btn--icon{ padding:9px; background:#fff; border:1px solid rgba(198,123,92,0.3); border-radius:50%; }

      /* ---------- editor ---------- */
      .page--editor{ padding-top:0; }
      .editor-topbar{ position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:14px; background:rgba(251,243,234,0.94); backdrop-filter:blur(6px); padding:16px 24px; border-bottom:1px solid rgba(198,123,92,0.18); }
      .editor-topbar-title{ flex:1; display:flex; flex-direction:column; min-width:0; }
      .editor-topbar-title span{ font-family:'Playfair Display',serif; font-size:18px; font-style:italic; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .save-indicator{ font-size:11.5px; color:var(--ink-soft); height:15px; font-style:normal; }
      .save-indicator--saving{ color:var(--gold); }
      .save-indicator--saved{ color:#5B8A5B; }

      .editor-body{ max-width:1180px; margin:0 auto; padding:26px 24px 70px; display:grid; grid-template-columns:400px 1fr; gap:30px; align-items:start; }
      @media (max-width:900px){ .editor-body{ grid-template-columns:1fr; } }

      .editor-form{ display:flex; flex-direction:column; gap:22px; min-width:0; }
      .form-section{ background:var(--card); border-radius:16px; padding:20px; box-shadow:0 6px 16px rgba(91,58,46,0.08); }
      .form-section-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:10px; }
      .form-section-head h2{ font-family:'Playfair Display',serif; font-size:18px; margin:0; }

      .field{ display:flex; flex-direction:column; gap:5px; margin-bottom:14px; font-size:12.5px; color:var(--ink-soft); font-weight:600; }
      .field input{ font-family:'Quicksand',sans-serif; font-size:14px; padding:10px 12px; border-radius:10px; border:1px solid rgba(198,123,92,0.3); color:var(--deep); background:#fffefb; width:100%; }
      .field-row{ display:flex; gap:14px; align-items:flex-start; }
      .field--small{ width:90px; flex-shrink:0; }
      .field--logo{ flex:1; }
      .logo-uploader{ position:relative; width:56px; height:56px; border-radius:50%; border:1.5px dashed var(--terracotta); display:flex; align-items:center; justify-content:center; color:var(--terracotta); overflow:hidden; background:#fffefb; cursor:pointer; }
      .logo-uploader img{ width:100%; height:100%; object-fit:cover; }
      .logo-uploader input{ position:absolute; inset:0; opacity:0; cursor:pointer; }

      .checkbox-field{ display:flex; align-items:center; gap:9px; font-size:13px; color:var(--ink-soft); font-weight:600; cursor:pointer; }
      .checkbox-field input{ width:16px; height:16px; accent-color:var(--terracotta); }

      .product-list{ display:flex; flex-direction:column; gap:12px; }
      .product-row{ display:flex; gap:12px; align-items:flex-start; padding:12px; border-radius:14px; background:#fffefb; border:1px solid rgba(198,123,92,0.16); }
      .product-photo{ position:relative; width:52px; height:52px; flex-shrink:0; border-radius:10px; border:1.5px dashed var(--terracotta); display:flex; align-items:center; justify-content:center; color:var(--terracotta); overflow:hidden; background:#f6ece1; cursor:pointer; }
      .product-photo img{ width:100%; height:100%; object-fit:cover; }
      .product-photo input{ position:absolute; inset:0; opacity:0; cursor:pointer; }
      .product-fields{ flex:1; display:flex; flex-direction:column; gap:8px; min-width:0; }
      .product-name{ font-family:'Quicksand',sans-serif; font-weight:700; font-size:14.5px; padding:8px 10px; border-radius:9px; border:1px solid rgba(198,123,92,0.28); color:var(--deep); width:100%; }
      .product-numbers{ display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap; }
      .product-numbers label{ display:flex; flex-direction:column; gap:3px; font-size:11px; color:var(--ink-soft); font-weight:600; }
      .product-numbers input{ width:74px; padding:7px 8px; border-radius:8px; border:1px solid rgba(198,123,92,0.28); font-family:'Quicksand',sans-serif; font-size:13px; }
      .product-numbers input:disabled{ opacity:.45; cursor:not-allowed; }
      .product-auto{ flex-direction:row !important; align-items:center; gap:6px !important; padding-bottom:8px; }
      .product-auto input{ width:15px; height:15px; accent-color:var(--terracotta); }
      .product-total{ margin-left:auto; text-align:right; font-size:11px; color:var(--ink-soft); font-weight:600; }
      .product-total b{ display:block; font-family:'Playfair Display',serif; font-size:16px; color:var(--terracotta); }

      .editor-preview{ position:sticky; top:76px; min-width:0; }
      .editor-preview-label{ font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-soft); font-weight:700; margin:0 0 10px; }
      .preview-frame{ background:#efe4d4; border-radius:18px; padding:22px; display:flex; justify-content:center; box-shadow:inset 0 2px 10px rgba(91,58,46,0.08); overflow:auto; }
      .sheet-capture{ background:#efe4d4; display:flex; justify-content:center; width:100%; }

      /* ---------- hoja (vista previa / impresión) ---------- */
      .sheet{ width:100%; }
      .sheet-header{ text-align:center; margin-bottom:26px; }
      .sheet-logo{ width:96px; height:96px; border-radius:50%; background-size:cover; background-position:center; margin:0 auto 10px; box-shadow:0 6px 14px rgba(91,58,46,0.16); display:block; }
      .sheet-monogram{ width:96px; height:96px; border-radius:50%; background:linear-gradient(135deg,var(--terracotta),var(--gold)); color:#fff; display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:40px; font-weight:700; margin:0 auto 10px; }
      .sheet-brand{ font-family:'Playfair Display',serif; font-style:italic; font-weight:700; font-size:32px; margin:0 0 2px; color:var(--deep); }
      .sheet-lema{ font-size:13px; color:var(--ink-soft); margin:0; }
      .sheet-divider{ width:100px; height:2px; margin:16px auto 0; background:linear-gradient(90deg,transparent,var(--gold),transparent); }

      .sheet-board{ display:flex; flex-wrap:wrap; justify-content:center; gap:20px; }
      .sheet-item{ position:relative; width:180px; background:var(--card); border-radius:16px 16px 50px 16px; padding:12px 12px 16px; box-shadow:0 8px 18px rgba(91,58,46,0.10); break-inside:avoid; page-break-inside:avoid; }
      .sheet-item:nth-child(3n){ transform:rotate(-1deg); }
      .sheet-item:nth-child(3n+1){ transform:rotate(1deg); }
      .sheet-num{ position:absolute; top:-8px; left:-8px; width:24px; height:24px; border-radius:50%; background:var(--terracotta); color:#fff; font-family:'Playfair Display',serif; font-weight:700; font-size:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 6px rgba(0,0,0,0.18); }
      .sheet-photo{ width:100%; height:112px; border-radius:10px; overflow:hidden; background:#f1e4d8; }
      .sheet-photo-img{ width:100%; height:100%; background-size:cover; background-position:center; }
      .sheet-photo-empty{ width:100%; height:100%; background:repeating-linear-gradient(45deg,#f1e4d8,#f1e4d8 8px,#ecdbc9 8px,#ecdbc9 16px); }
      .sheet-name{ font-family:'Playfair Display',serif; font-size:14.5px; margin:10px 2px 0; line-height:1.25; color:var(--deep); }
      .sheet-meta{ display:flex; justify-content:space-between; align-items:baseline; margin-top:8px; padding-top:7px; border-top:1px dashed rgba(198,123,92,0.4); }
      .sheet-qty{ font-size:11px; color:var(--ink-soft); font-weight:600; }
      .sheet-qty b{ display:block; color:var(--deep); font-size:12.5px; }
      .sheet-total{ font-family:'Playfair Display',serif; font-weight:700; font-size:16px; color:var(--terracotta); }
      .sheet-total span{ font-size:10.5px; color:var(--gold); margin-right:2px; font-weight:600; }
      .sheet-empty{ color:var(--ink-soft); font-size:13px; text-align:center; }

      .sheet-footer-total{ text-align:center; margin-top:30px; }
      .sheet-footer-total .pill{ display:inline-block; background:linear-gradient(135deg,var(--terracotta),var(--pink)); color:#fff; padding:12px 28px; border-radius:30px; font-family:'Playfair Display',serif; font-size:17px; font-weight:700; box-shadow:0 10px 20px rgba(198,123,92,0.3); }
      .sheet-footer-total small{ display:block; font-family:'Quicksand',sans-serif; font-size:9.5px; letter-spacing:.16em; text-transform:uppercase; font-weight:700; opacity:.85; margin-bottom:3px; }
      .sheet-footer-note{ margin-top:10px; font-size:12px; color:var(--ink-soft); }

      /* ---------- vista de impresión ---------- */
      .print-wrapper{ max-width:900px; margin:0 auto; padding:26px 24px 60px; }
      .print-toolbar{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:12px; flex-wrap:wrap; }
      .print-hint{ font-size:12.5px; color:var(--ink-soft); margin:0 0 22px; }
      .print-page{ background:#fff; width:210mm; min-height:297mm; margin:0 auto; padding:16mm; box-shadow:0 10px 30px rgba(91,58,46,0.18); border-radius:4px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

      @page{ size:A4; margin:14mm; }
      @media print{
        .no-print{ display:none !important; }
        .cat-app{ background:#fff !important; }
        .print-wrapper{ padding:0; max-width:none; }
        .print-page{ box-shadow:none; width:auto; min-height:0; padding:0; margin:0; }
      }

      @media (max-width:640px){
        .page-title{ font-size:28px; }
        .print-page{ width:100%; min-height:0; padding:8mm; }
      }
    `}</style>
  );
}

/* ============================================================
   Hoja de catálogo (usada en vista previa e impresión)
   ============================================================ */

function CatalogSheet({ catalog }) {
  const { marca, lema, moneda, logo, productos, mostrarTotal } = catalog;
  const initials = (marca || "?").trim().charAt(0).toUpperCase() || "?";
  const total = productos.reduce((s, p) => s + productTotal(p), 0);
  const unidades = productos.reduce((s, p) => s + (Number(p.cantidad) || 0), 0);

  return (
    <div className="sheet">
      <div className="sheet-header">
        {logo ? (
          <div
            className="sheet-logo"
            role="img"
            aria-label={marca || "Logo"}
            style={{ backgroundImage: `url(${logo})` }}
          />
        ) : (
          <div className="sheet-monogram">{initials}</div>
        )}
        {marca && <h1 className="sheet-brand">{marca}</h1>}
        {lema && <p className="sheet-lema">{lema}</p>}
        <div className="sheet-divider" />
      </div>

      {productos.length === 0 ? (
        <p className="sheet-empty">Agrega productos para verlos aquí.</p>
      ) : (
        <div className="sheet-board">
          {productos.map((p, i) => (
            <div className="sheet-item" key={p.id}>
              <span className="sheet-num">{i + 1}</span>
              <div className="sheet-photo">
                {p.imagen ? (
                  <div
                    className="sheet-photo-img"
                    role="img"
                    aria-label={p.nombre || "Producto"}
                    style={{ backgroundImage: `url(${p.imagen})` }}
                  />
                ) : (
                  <div className="sheet-photo-empty" />
                )}
              </div>
              <h3 className="sheet-name">{p.nombre || "Producto sin nombre"}</h3>
              <div className="sheet-meta">
                <div className="sheet-qty">
                  Cantidad
                  <br />
                  <b>{p.cantidad || 0} und</b>
                </div>
                <div className="sheet-total">
                  <span>{moneda || "S/"}</span>
                  {money(productTotal(p))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarTotal && productos.length > 0 && (
        <div className="sheet-footer-total">
          <div className="pill">
            <small>Total del pedido</small>
            {moneda || "S/"} {money(total)}
          </div>
          <p className="sheet-footer-note">
            {productos.length} producto{productos.length === 1 ? "" : "s"} · {unidades} unidades en total
          </p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Vista: lista de catálogos
   ============================================================ */

function ListView({ index, loading, onNew, onOpen, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);

  return (
    <div className="page page--list">
      <div className="page-head">
        <div>
          <p className="page-eyebrow">Generador de catálogos</p>
          <h1 className="page-title">Mis catálogos</h1>
        </div>
        <button className="btn btn--primary" onClick={onNew}>
          <Plus size={18} /> Nuevo catálogo
        </button>
      </div>

      {loading ? (
        <div className="state-msg">
          <Loader2 className="spin" size={20} /> Cargando tus catálogos…
        </div>
      ) : index.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Store size={28} />
          </div>
          <h2>Aún no tienes catálogos</h2>
          <p>
            Crea tu primer catálogo: agrega el nombre de tu marca, tus productos con
            cantidad, precio y una foto de cada uno.
          </p>
          <button className="btn btn--primary" onClick={onNew}>
            <Plus size={18} /> Crear catálogo
          </button>
        </div>
      ) : (
        <div className="catalog-grid">
          {index.map((c) => (
            <div className="catalog-card" key={c.id}>
              <div className="catalog-card-top">
                {c.logo ? (
                  <img src={c.logo} alt={c.marca} className="catalog-card-logo" />
                ) : (
                  <div className="catalog-card-mono">
                    {(c.marca || "?").charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <h3 className="catalog-card-name" title={c.lema || undefined}>
                {c.lema || "Sin descripción"}
              </h3>
              <p className="catalog-card-meta">
                {c.itemCount} producto{c.itemCount === 1 ? "" : "s"} · actualizado{" "}
                {formatDate(c.updatedAt)}
              </p>
              <div className="catalog-card-actions">
                {confirmId === c.id ? (
                  <>
                    <span className="confirm-text">¿Eliminar?</span>
                    <button
                      className="btn btn--ghost btn--danger"
                      onClick={() => {
                        onDelete(c.id);
                        setConfirmId(null);
                      }}
                    >
                      Sí
                    </button>
                    <button className="btn btn--ghost" onClick={() => setConfirmId(null)}>
                      No
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn--ghost" onClick={() => onOpen(c.id)}>
                      <Pencil size={15} /> Abrir
                    </button>
                    <button
                      className="btn btn--icon btn--danger"
                      onClick={() => setConfirmId(c.id)}
                      aria-label="Eliminar catálogo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Vista: editor de catálogo
   ============================================================ */

function EditorView({
  catalog,
  savingState,
  busyImage,
  onBack,
  onField,
  onProduct,
  onAddProduct,
  onRemoveProduct,
  onLogo,
  onProductImage,
  onSave,
  onPrint,
}) {
  const sheetRef = useRef(null);
  const [downloadingImage, setDownloadingImage] = useState(false);

  const handleDownloadImage = async () => {
    if (!sheetRef.current || downloadingImage) return;
    setDownloadingImage(true);
    try {
      await downloadNodeAsImage(sheetRef.current, slugify(catalog.marca));
    } catch (e) {
      console.error("No se pudo generar la imagen", e);
    } finally {
      setDownloadingImage(false);
    }
  };

  return (
    <div className="page page--editor">
      <div className="editor-topbar">
        <button className="btn btn--icon" onClick={onBack} aria-label="Volver a mis catálogos">
          <ArrowLeft size={18} />
        </button>
        <div className="editor-topbar-title">
          <span>{catalog.marca || "Nuevo catálogo"}</span>
          <em className={`save-indicator save-indicator--${savingState}`}>
            {savingState === "saving" && "Guardando…"}
            {savingState === "saved" && "Guardado ✓"}
          </em>
        </div>
        <button className="btn btn--ghost" onClick={onSave}>
          Guardar
        </button>
        <button className="btn btn--ghost" onClick={handleDownloadImage} disabled={downloadingImage}>
          {downloadingImage ? (
            <Loader2 className="spin" size={17} />
          ) : (
            <ImageIcon size={17} />
          )}
          Descargar imagen
        </button>
        <button className="btn btn--primary" onClick={onPrint}>
          <Download size={17} /> Descargar PDF
        </button>
      </div>

      <div className="editor-body">
        <div className="editor-form">
          <section className="form-section">
            <label className="field">
              <span>Nombre de la marca</span>
              <input
                value={catalog.marca}
                onChange={(e) => onField("marca", e.target.value)}
                placeholder="Ej. Alessiana Dulces & Postres"
              />
            </label>
            <label className="field">
              <span>Lema o descripción</span>
              <input
                value={catalog.lema}
                onChange={(e) => onField("lema", e.target.value)}
                placeholder="Ej. Dulces hechos con cariño, uno a la vez."
              />
            </label>
            <div className="field-row">
              <label className="field field--small">
                <span>Moneda</span>
                <input
                  value={catalog.moneda}
                  onChange={(e) => onField("moneda", e.target.value)}
                  placeholder="S/"
                />
              </label>
              <label className="field field--logo">
                <span>Logo</span>
                <div className="logo-uploader">
                  {catalog.logo ? (
                    <img src={catalog.logo} alt="Logo" />
                  ) : (
                    <ImagePlus size={18} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onLogo(e.target.files && e.target.files[0])}
                  />
                </div>
              </label>
            </div>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={!!catalog.mostrarTotal}
                onChange={(e) => onField("mostrarTotal", e.target.checked)}
              />
              <span>Mostrar total del pedido al final</span>
            </label>
          </section>

          <section className="form-section">
            <div className="form-section-head">
              <h2>Productos</h2>
              <button className="btn btn--ghost" onClick={onAddProduct}>
                <Plus size={15} /> Agregar producto
              </button>
            </div>

            <div className="product-list">
              {catalog.productos.map((p, i) => (
                <div className="product-row" key={p.id}>
                  <label className="product-photo">
                    {busyImage === p.id ? (
                      <Loader2 className="spin" size={17} />
                    ) : p.imagen ? (
                      <img src={p.imagen} alt={p.nombre || "Producto"} />
                    ) : (
                      <ImagePlus size={17} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onProductImage(p.id, e.target.files && e.target.files[0])}
                    />
                  </label>
                  <div className="product-fields">
                    <input
                      className="product-name"
                      value={p.nombre}
                      placeholder={`Producto ${i + 1}`}
                      onChange={(e) => onProduct(p.id, "nombre", e.target.value)}
                    />
                    <div className="product-numbers">
                      <label>
                        <span>Cantidad</span>
                        <input
                          type="number"
                          min="0"
                          value={p.cantidad}
                          onChange={(e) => onProduct(p.id, "cantidad", parseFloat(e.target.value) || 0)}
                        />
                      </label>
                      <label>
                        <span>Precio unit.</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          disabled={p.calcularTotal === false}
                          value={p.precio}
                          onChange={(e) => onProduct(p.id, "precio", parseFloat(e.target.value) || 0)}
                        />
                      </label>
                      <label className="product-auto">
                        <input
                          type="checkbox"
                          checked={p.calcularTotal !== false}
                          onChange={(e) => onProduct(p.id, "calcularTotal", e.target.checked)}
                        />
                        <span>Calcular auto</span>
                      </label>
                      {p.calcularTotal === false ? (
                        <label>
                          <span>Total final</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={p.totalManual}
                            onChange={(e) => onProduct(p.id, "totalManual", parseFloat(e.target.value) || 0)}
                          />
                        </label>
                      ) : (
                        <div className="product-total">
                          <span>Total</span>
                          <b>
                            {catalog.moneda || "S/"} {money(productTotal(p))}
                          </b>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn--icon btn--danger"
                    onClick={() => onRemoveProduct(p.id)}
                    aria-label="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="editor-preview">
          <p className="editor-preview-label">Vista previa</p>
          <div className="preview-frame">
            <div className="sheet-capture" ref={sheetRef}>
              <CatalogSheet catalog={catalog} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Vista: impresión / PDF
   ============================================================ */

function PrintView({ catalog, onBack }) {
  return (
    <div className="print-wrapper">
      <div className="print-toolbar no-print">
        <button className="btn btn--ghost" onClick={onBack}>
          <ChevronLeft size={17} /> Volver a editar
        </button>
        <button className="btn btn--primary" onClick={() => window.print()}>
          <Download size={17} /> Imprimir / Guardar PDF
        </button>
      </div>
      <p className="print-hint no-print">
        Se abrirá el diálogo de impresión de tu navegador — elige "Guardar como PDF" y
        el tamaño de papel "A4".
      </p>
      <div className="print-page">
        <CatalogSheet catalog={catalog} />
      </div>
    </div>
  );
}

/* ============================================================
   App principal
   ============================================================ */

export default function CatalogApp() {
  const [view, setView] = useState("list"); // list | editor | print
  const [index, setIndex] = useState([]);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [savingState, setSavingState] = useState("idle"); // idle | saving | saved
  const [busyImage, setBusyImage] = useState(null);

  useEffect(() => {
    (async () => {
      const idx = await loadIndex();
      const sorted = idx.slice().sort((a, b) => b.createdAt - a.createdAt);
      setIndex(sorted);
      setLoadingIndex(false);

      if (!sorted.some((c) => c.lema === undefined)) return;

      const filled = await Promise.all(
        sorted.map(async (c) => {
          if (c.lema !== undefined) return c;
          const data = await loadCatalog(c.id);
          return { ...c, lema: (data && data.lema) || "" };
        })
      );
      setIndex(filled);
      persistIndex(filled);
    })();
  }, []);

  const saveCatalog = useCallback(async (cat) => {
    if (!cat) return;
    setSavingState("saving");
    const updated = { ...cat, updatedAt: Date.now() };
    const ok = await persistCatalog(updated.id, updated);
    if (ok) {
      const entry = {
        id: updated.id,
        marca: updated.marca || "Sin nombre",
        lema: updated.lema || "",
        updatedAt: updated.updatedAt,
        createdAt: updated.createdAt,
        itemCount: updated.productos.length,
        logo: updated.logo,
      };
      setIndex((prev) => {
        const others = prev.filter((c) => c.id !== updated.id);
        const next = [entry, ...others].sort((a, b) => b.createdAt - a.createdAt);
        persistIndex(next);
        return next;
      });
      setSavingState("saved");
      setTimeout(() => setSavingState((s) => (s === "saved" ? "idle" : s)), 1500);
    } else {
      setSavingState("idle");
    }
  }, []);

  // autoguardado con debounce mientras se edita
  useEffect(() => {
    if (view !== "editor" || !catalog) return;
    const t = setTimeout(() => {
      saveCatalog(catalog);
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, view]);

  const openNew = () => {
    setCatalog(blankCatalog());
    setView("editor");
  };

  const openExisting = async (id) => {
    setLoadingIndex(true);
    const data = await loadCatalog(id);
    setLoadingIndex(false);
    if (data) {
      setCatalog(data);
      setView("editor");
    }
  };

  const deleteExisting = async (id) => {
    await removeCatalogData(id);
    setIndex((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistIndex(next);
      return next;
    });
  };

  const updateField = (field, value) => {
    setCatalog((c) => ({ ...c, [field]: value }));
  };

  const updateProduct = (id, field, value) => {
    setCatalog((c) => ({
      ...c,
      productos: c.productos.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  };

  const addProduct = () => {
    setCatalog((c) => ({ ...c, productos: [...c.productos, blankProduct()] }));
  };

  const removeProduct = (id) => {
    setCatalog((c) => ({ ...c, productos: c.productos.filter((p) => p.id !== id) }));
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 400, 0.85);
      updateField("logo", dataUrl);
    } catch (e) {
      console.error(e);
    }
  };

  const handleProductImage = async (id, file) => {
    if (!file) return;
    setBusyImage(id);
    try {
      const dataUrl = await resizeImage(file, 640, 0.8);
      updateProduct(id, "imagen", dataUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setBusyImage(null);
    }
  };

  const handleBack = async () => {
    await saveCatalog(catalog);
    setView("list");
  };

  const handlePrint = async () => {
    await saveCatalog(catalog);
    setView("print");
  };

  return (
    <div className="cat-app">
      <GlobalStyles />
      {view === "list" && (
        <ListView
          index={index}
          loading={loadingIndex}
          onNew={openNew}
          onOpen={openExisting}
          onDelete={deleteExisting}
        />
      )}
      {view === "editor" && catalog && (
        <EditorView
          catalog={catalog}
          savingState={savingState}
          busyImage={busyImage}
          onBack={handleBack}
          onField={updateField}
          onProduct={updateProduct}
          onAddProduct={addProduct}
          onRemoveProduct={removeProduct}
          onLogo={handleLogoUpload}
          onProductImage={handleProductImage}
          onSave={() => saveCatalog(catalog)}
          onPrint={handlePrint}
        />
      )}
      {view === "print" && catalog && (
        <PrintView catalog={catalog} onBack={() => setView("editor")} />
      )}
    </div>
  );
}
