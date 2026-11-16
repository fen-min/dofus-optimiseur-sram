import {calculateCraft, asPositive, asWhole, taxRatio} from "./profit-core.js";

const STORE = "ombre-profit-workbook-v1";
const MAX_ROWS = 500;
const MAX_RECIPES = 150;
const uid = () => "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&#39;"}[c]));
const safeText = (value, max = 120) => String(value ?? "").slice(0, max);
const num = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const money = value => Number.isFinite(value)
  ? value.toLocaleString("fr-FR", {maximumFractionDigits:2}) + " K" : "—";
const percent = value => Number.isFinite(value)
  ? value.toLocaleString("fr-FR", {maximumFractionDigits:1}) + " %" : "—";
const TYPES = ["craft", "vente", "autre"];

export function calculateWorkbookRow(row, defaultTax = 2) {
  const quantity = asWhole(row?.quantity);
  const costUnit = asPositive(row?.costUnit);
  const saleUnit = asPositive(row?.saleUnit);
  const taxPercent = row?.taxPercent === "" || row?.taxPercent == null
    ? num(defaultTax) : num(row.taxPercent);
  const rate = taxRatio(taxPercent);
  const costs = costUnit * quantity;
  const gross = saleUnit * quantity;
  const fees = gross * rate;
  const profit = gross - fees - costs;
  return {quantity, costUnit, saleUnit, costs, gross, fees, profit,
    profitUnit: saleUnit * (1-rate) - costUnit,
    margin: gross > 0 ? profit / gross * 100 : 0};
}

export function calculateWorkbook(rows, defaultTax = 2) {
  const values = rows.map(row => calculateWorkbookRow(row, defaultTax));
  return {values, quantity:values.reduce((s,r)=>s+r.quantity,0),
    costs:values.reduce((s,r)=>s+r.costs,0),
    gross:values.reduce((s,r)=>s+r.gross,0),
    fees:values.reduce((s,r)=>s+r.fees,0),
    profit:values.reduce((s,r)=>s+r.profit,0)};
}

const blankRow = (taxPercent = 2) => ({
  id:uid(), reference:"", name:"", type:"vente", quantity:1,
  costUnit:"", saleUnit:"", taxPercent:String(taxPercent), notes:""
});
function sanitizeRows(rows) {
  const ids = new Set();
  return (Array.isArray(rows) ? rows : []).slice(0, MAX_ROWS).map(row => {
    const validId = typeof row?.id === "string" && /^w[a-zA-Z0-9_-]{4,75}$/.test(row.id) && !ids.has(row.id);
    const id = validId ? row.id : uid();
    ids.add(id);
    return {id, reference:safeText(row?.reference, 80), name:safeText(row?.name, 120),
      type:TYPES.includes(row?.type) ? row.type : "vente",
      quantity:safeText(row?.quantity ?? 1, 30), costUnit:safeText(row?.costUnit, 30),
      saleUnit:safeText(row?.saleUnit, 30), taxPercent:safeText(row?.taxPercent ?? 2, 20),
      notes:safeText(row?.notes, 250)};
  });
}
function sanitizeRecipe(recipe) {
  if (!recipe || typeof recipe !== "object") return null;
  const data = recipe.data && typeof recipe.data === "object" ? recipe.data : {};
  return {id:/^w[a-zA-Z0-9_-]{4,75}$/.test(recipe.id || "") ? recipe.id : uid(),
    name:safeText(recipe.name || data.product || "Sans nom", 90),
    data:{product:safeText(data.product, 90),
      quantity:safeText(data.quantity, 30), saleUnit:safeText(data.saleUnit, 30),
      taxPercent:safeText(data.taxPercent ?? 2, 20),
      ingredients:Array.from({length:8}, (_,i) => ({
        name:safeText(data.ingredients?.[i]?.name, 90),
        perCraft:safeText(data.ingredients?.[i]?.perCraft, 30),
        costUnit:safeText(data.ingredients?.[i]?.costUnit, 30),
        resaleUnit:safeText(data.ingredients?.[i]?.resaleUnit, 30)
      }))}};
}
function cleanBook(raw) {
  const recipes = (Array.isArray(raw?.recipes) ? raw.recipes : [])
    .slice(0, MAX_RECIPES).map(sanitizeRecipe).filter(Boolean);
  const ids = new Set();
  for (const recipe of recipes) {
    if (ids.has(recipe.id)) recipe.id = uid();
    ids.add(recipe.id);
  }
  return {rows:sanitizeRows(raw?.rows), recipes,
    selectedRecipe:recipes.some(r=>r.id===raw?.selectedRecipe) ? raw.selectedRecipe : ""};
}
function download(filename, content, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value) {
  let cell = String(value ?? "");
  // Prévenir l'interprétation de formules lors de l'ouverture dans Excel.
  if (/^[\s]*[=+@-]/.test(cell) && !/^-?\d+(?:[.,]\d+)?$/.test(cell.trim())) cell = "'" + cell;
  return '"' + cell.replace(/"/g, '""') + '"';
}

export function mountProfitWorkbook({root, getCraft, setCraft}) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch {}
  let book = cleanBook(saved);
  const $ = id => document.getElementById(id);
  const status = message => { $("profit-workbook-status").textContent = message; };
  const persist = () => {
    try { localStorage.setItem(STORE, JSON.stringify(book)); status("Modifications enregistrées dans ce navigateur."); }
    catch { status("Enregistrement local impossible : exporte une sauvegarde JSON."); }
  };
  const recipeSelect = $("profit-recipe-select");
  function renderRecipes() {
    recipeSelect.innerHTML = '<option value="">— Choisir une fiche enregistrée —</option>' +
      book.recipes.map(r => '<option value="' + escapeHtml(r.id) + '"' +
      (r.id === book.selectedRecipe ? " selected" : "") + '>' + escapeHtml(r.name) + '</option>').join("");
    const selected = book.recipes.find(r => r.id === book.selectedRecipe);
    $("profit-recipe-name").value = selected?.name || "";
    for (const id of ["profit-recipe-load", "profit-recipe-save", "profit-recipe-delete"])
      $(id).disabled = !selected;
    $("profit-recipe-counter").textContent = book.recipes.length + " fiche(s) sauvegardée(s)";
  }
  function field(value, property, id, type = "text") {
    const numeric = type === "number";
    return '<input aria-label="' + escapeHtml(property) + '" data-workbook-id="' + escapeHtml(id) +
      '" data-workbook-property="' + property + '" type="' + type + '"' +
      (numeric ? ' min="0" step="any" inputmode="decimal"' : ' maxlength="' + (property === "notes" ? 250 : 120) + '"') +
      ' value="' + escapeHtml(value) + '">';
  }
  const viewRows = () => {
    const search = $("profit-workbook-search").value.trim().toLocaleLowerCase("fr");
    const filter = $("profit-workbook-filter").value;
    const sort = $("profit-workbook-sort").value;
    const rows = book.rows.filter(r =>
      (filter === "all" || r.type === filter) &&
      (!search || [r.reference,r.name,r.type,r.notes].some(s=>s.toLocaleLowerCase("fr").includes(search))));
    if (sort === "name") rows.sort((a,b)=>a.name.localeCompare(b.name, "fr"));
    if (sort === "profit-desc") rows.sort((a,b)=>calculateWorkbookRow(b).profit-calculateWorkbookRow(a).profit);
    if (sort === "profit-asc") rows.sort((a,b)=>calculateWorkbookRow(a).profit-calculateWorkbookRow(b).profit);
    return rows;
  };
  function renderTable() {
    const rows = viewRows();
    $("profit-workbook-body").innerHTML = rows.map((row, index) => {
      const typeSelect = '<select aria-label="Catégorie" data-workbook-id="' + row.id +
        '" data-workbook-property="type">' + TYPES.map(t =>
        '<option value="' + t + '"' + (row.type === t ? " selected" : "") + '>' +
        ({craft:"Craft",vente:"Vente",autre:"Autre"}[t]) + '</option>').join("") + '</select>';
      return '<tr data-workbook-row="' + row.id + '"><th scope="row">' + (index+1) + '</th>' +
        '<td>' + field(row.reference,"reference",row.id) + '</td>' +
        '<td>' + field(row.name,"name",row.id) + '</td>' +
        '<td>' + typeSelect + '</td>' +
        '<td>' + field(row.quantity,"quantity",row.id,"number") + '</td>' +
        '<td>' + field(row.costUnit,"costUnit",row.id,"number") + '</td>' +
        '<td>' + field(row.saleUnit,"saleUnit",row.id,"number") + '</td>' +
        '<td>' + field(row.taxPercent,"taxPercent",row.id,"number") + '</td>' +
        '<td data-workbook-result="costs"></td><td data-workbook-result="gross"></td>' +
        '<td data-workbook-result="profit"></td><td data-workbook-result="margin"></td>' +
        '<td>' + field(row.notes,"notes",row.id) + '</td>' +
        '<td><div class="profit-row-actions"><button type="button" data-workbook-duplicate="' + row.id +
        '" title="Dupliquer cette ligne" aria-label="Dupliquer ' + escapeHtml(row.name) + '">⧉</button>' +
        '<button type="button" data-workbook-delete="' + row.id +
        '" title="Supprimer cette ligne" aria-label="Supprimer ' + escapeHtml(row.name) + '">✕</button></div></td></tr>';
    }).join("");
    $("profit-workbook-empty").hidden = rows.length !== 0;
    $("profit-workbook-count").textContent = rows.length + " affichée(s) / " + book.rows.length + " ligne(s)";
    refresh();
  }
  function refresh() {
    const summary = calculateWorkbook(book.rows);
    const visibleRows = new Map([...$("profit-workbook-body").querySelectorAll("tr")]
      .map(element => [element.dataset.workbookRow, element]));
    for (const row of book.rows) {
      const tr = visibleRows.get(row.id);
      if (!tr) continue;
      const calc = calculateWorkbookRow(row);
      for (const [property, value] of [["costs",money(calc.costs)],["gross",money(calc.gross)],
        ["profit",money(calc.profit)],["margin",percent(calc.margin)]]) {
        const cell = tr.querySelector('[data-workbook-result="' + property + '"]');
        cell.textContent = value;
        cell.classList.toggle("is-negative", property === "profit" && calc.profit < 0);
      }
    }
    $("profit-workbook-sum-quantity").textContent = summary.quantity.toLocaleString("fr-FR");
    $("profit-workbook-sum-cost").textContent = money(summary.costs);
    $("profit-workbook-sum-gross").textContent = money(summary.gross);
    $("profit-workbook-sum-fees").textContent = money(summary.fees);
    $("profit-workbook-sum-profit").textContent = money(summary.profit);
    $("profit-workbook-sum-profit").classList.toggle("is-negative", summary.profit < 0);
  }
  const addRows = rows => {
    const available = MAX_ROWS - book.rows.length;
    if (available <= 0) { status("Limite de 500 lignes atteinte."); return; }
    const added = sanitizeRows(rows).slice(0, available).map(r=>({...r,id:uid()}));
    book.rows.push(...added);
    persist(); renderTable();
    if (added.length) status(added.length + " objet(s) ajouté(s) et sauvegardé(s).");
  };
  root.addEventListener("input", event => {
    const input = event.target;
    if (input.id === "profit-workbook-search") { renderTable(); return; }
    if (!input.dataset.workbookId) return;
    const row = book.rows.find(r=>r.id===input.dataset.workbookId);
    const property = input.dataset.workbookProperty;
    if (!row || !["reference","name","type","quantity","costUnit","saleUnit","taxPercent","notes"].includes(property)) return;
    row[property] = input.value;
    persist(); refresh();
  });
  root.addEventListener("change", event => {
    if (["profit-workbook-filter","profit-workbook-sort"].includes(event.target.id)) renderTable();
    if (event.target.id === "profit-recipe-select") {
      book.selectedRecipe = event.target.value; persist(); renderRecipes();
    }
    if (event.target.dataset.workbookProperty === "type" &&
        $("profit-workbook-filter").value !== "all") renderTable();
  });
  root.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.id === "profit-workbook-add") { addRows([blankRow(getCraft().taxPercent)]); return; }
    if (button.dataset.workbookDuplicate) {
      const row = book.rows.find(r=>r.id===button.dataset.workbookDuplicate);
      if (row) addRows([{...row,reference:row.reference ? row.reference+" (copie)" : "",id:uid()}]);
      return;
    }
    if (button.dataset.workbookDelete) {
      const index = book.rows.findIndex(r=>r.id===button.dataset.workbookDelete);
      if (index >= 0 && window.confirm("Supprimer cette ligne du tableau ?")) {
        book.rows.splice(index, 1); persist(); renderTable();
      }
      return;
    }
    if (button.id === "profit-workbook-clear") {
      if (book.rows.length && window.confirm("Effacer toutes les lignes du tableau ? Les fiches de craft restent sauvegardées.")) {
        book.rows = []; persist(); renderTable();
      }
      return;
    }
    if (button.id === "profit-workbook-add-craft") {
      const craft = getCraft(), calc = calculateCraft(craft);
      addRows([{reference:"",name:craft.product||"Objet fabriqué",type:"craft",
        quantity:craft.quantity, costUnit:calc.costPerCraft,
        saleUnit:craft.saleUnit, taxPercent:craft.taxPercent,
        notes:craft.ingredients.filter(i=>Number(i.perCraft)>0)
          .map(i=>i.name+" ×"+i.perCraft).join(", ")}]);
      return;
    }
    if (button.id === "profit-workbook-add-sales") {
      const craft = getCraft();
      const selected = craft.listings.filter(r=>r.name || Number(r.units)>0 || Number(r.lotPrice)>0);
      if (!selected.length) {status("Aucune vente renseignée à ajouter.");return;}
      addRows(selected.map(r=>({reference:"",name:r.name||"Objet en vente",type:"vente",
        quantity:r.units, costUnit:r.costUnit,
        saleUnit:num(r.lotPrice) / ([1,10,100,1000].includes(Number(r.lotSize)) ? Number(r.lotSize) : 1),
        taxPercent:craft.taxPercent,notes:"Prix saisi pour un lot de "+r.lotSize})));
      return;
    }
    if (button.id === "profit-recipe-new") {
      if (book.recipes.length >= MAX_RECIPES) {status("Limite de 150 fiches atteinte.");return;}
      const craft = getCraft(), label = $("profit-recipe-name").value.trim() || craft.product || "Nouveau craft";
      const recipe = sanitizeRecipe({id:uid(),name:label,data:craft});
      book.recipes.push(recipe); book.selectedRecipe = recipe.id;
      persist(); renderRecipes(); status("Fiche « "+recipe.name+" » enregistrée."); return;
    }
    const recipe = book.recipes.find(r=>r.id===book.selectedRecipe);
    if (button.id === "profit-recipe-save" && recipe) {
      const latest = sanitizeRecipe({id:recipe.id,
        name:$("profit-recipe-name").value.trim() || getCraft().product || recipe.name, data:getCraft()});
      Object.assign(recipe,latest);
      persist(); renderRecipes(); status("Fiche « "+recipe.name+" » mise à jour."); return;
    }
    if (button.id === "profit-recipe-load" && recipe) {
      setCraft(recipe.data); status("Fiche « "+recipe.name+" » chargée dans le simulateur."); return;
    }
    if (button.id === "profit-recipe-delete" && recipe) {
      if (window.confirm("Supprimer définitivement la fiche « "+recipe.name+" » ?")) {
        book.recipes = book.recipes.filter(r=>r.id!==recipe.id);
        book.selectedRecipe = ""; persist(); renderRecipes();
      }
      return;
    }
    if (button.id === "profit-workbook-export-json") {
      download("ombre-benefices-sauvegarde.json",
        JSON.stringify({format:"ombre-profit-workbook",version:1,
          exportedAt:new Date().toISOString(),book,activeCraft:getCraft()},null,2),
        "application/json;charset=utf-8"); return;
    }
    if (button.id === "profit-workbook-export-csv") {
      const headers = ["Référence","Objet","Catégorie","Quantité","Coût/unité (K)","Vente/unité (K)",
        "Taxe (%)","Coût total (K)","Ventes brutes (K)","Frais (K)","Bénéfice (K)","Marge (%)","Notes"];
      const lines = [headers, ...book.rows.map(r=>{
        const c = calculateWorkbookRow(r);
        return [r.reference,r.name,r.type,r.quantity,r.costUnit,r.saleUnit,r.taxPercent,
          c.costs,c.gross,c.fees,c.profit,c.margin,r.notes];
      })];
      download("ombre-tableau-benefices.csv", "\uFEFF"+lines.map(row=>row.map(csvCell).join(";")).join("\r\n"),
        "text/csv;charset=utf-8"); return;
    }
    if (button.id === "profit-workbook-import-button") $("profit-workbook-import").click();
  });
  $("profit-workbook-import").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw Error("Fichier trop volumineux (2 Mo maximum).");
      const parsed = JSON.parse(await file.text());
      if (parsed?.format !== "ombre-profit-workbook" ||
          !Array.isArray(parsed?.book?.rows) || !Array.isArray(parsed?.book?.recipes))
        throw Error("Ce fichier n'est pas une sauvegarde OMBRE valide.");
      if (!window.confirm("Importer cette sauvegarde ? Le tableau et les fiches actuels seront remplacés.")) return;
      book = cleanBook(parsed.book);
      if (parsed.activeCraft && typeof parsed.activeCraft === "object") setCraft(parsed.activeCraft);
      persist(); renderRecipes(); renderTable();
      status("Sauvegarde importée : "+book.rows.length+" lignes et "+book.recipes.length+" fiches.");
    } catch (error) {status("Import impossible : "+error.message);}
    finally {event.target.value = "";}
  });
  renderRecipes();
  renderTable();
  status("Sauvegarde automatique locale active. Export JSON recommandé pour conserver une copie.");
}
