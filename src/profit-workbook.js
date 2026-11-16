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
const INGREDIENT_LIMIT = 8;
const blankIngredients = () => Array.from({length: INGREDIENT_LIMIT}, () =>
  ({name:"", perCraft:"", costUnit:""}));
function sanitizeIngredients(ingredients) {
  return Array.from({length: INGREDIENT_LIMIT}, (_, i) => {
    const item = Array.isArray(ingredients) ? ingredients[i] : null;
    return {name:safeText(item?.name, 90), perCraft:safeText(item?.perCraft, 30),
      costUnit:safeText(item?.costUnit, 30)};
  });
}

// Le coût est celui d'UN objet fabriqué ; il est multiplié par la quantité vendue ensuite.
export function calculateRecipeCost(ingredients = []) {
  const rows = sanitizeIngredients(ingredients).map(item => ({
    ...item, quantity:asPositive(item.perCraft), price:asPositive(item.costUnit),
    cost:asPositive(item.perCraft) * asPositive(item.costUnit)
  }));
  const used = rows.filter(item => item.name.trim() || item.quantity || item.price).length;
  const missing = rows.filter(item => (item.name.trim() || item.quantity) &&
    item.quantity > 0 && item.costUnit.trim() === "").length;
  return {rows, used, missing, costUnit:rows.reduce((sum, row) => sum + row.cost, 0)};
}

export function calculateWorkbookRow(row, defaultTax = 2) {
  const quantity = asWhole(row?.quantity);
  const recipeEnabled = row?.recipeEnabled === true;
  const recipe = recipeEnabled ? calculateRecipeCost(row?.ingredients) : null;
  const costUnit = recipeEnabled ? recipe.costUnit : asPositive(row?.costUnit);
  const saleUnit = asPositive(row?.saleUnit);
  const taxPercent = row?.taxPercent === "" || row?.taxPercent == null
    ? num(defaultTax) : num(row.taxPercent);
  const rate = taxRatio(taxPercent);
  const costs = costUnit * quantity;
  const gross = saleUnit * quantity;
  const fees = gross * rate;
  const profit = gross - fees - costs;
  return {quantity, costUnit, saleUnit, costs, gross, fees, profit,
    recipeEnabled, recipeMissing:recipe?.missing ?? 0, recipeUsed:recipe?.used ?? 0,
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
  id:uid(), reference:"", name:"", type:"craft", quantity:1,
  costUnit:"", saleUnit:"", taxPercent:String(taxPercent), notes:"",
  recipeEnabled:true, ingredients:blankIngredients()
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
      notes:safeText(row?.notes, 250),
      recipeEnabled:row?.recipeEnabled === true,
      ingredients:sanitizeIngredients(row?.ingredients)};
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
  // Seul l'état d'ouverture visuel est temporaire : les huit ingrédients restent sauvegardés.
  const expandedRecipes = new Set();
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
  function field(value, property, id, type = "text", readonly = false) {
    const numeric = type === "number";
    return '<input aria-label="' + escapeHtml(property) + '" data-workbook-id="' + escapeHtml(id) +
      '" data-workbook-property="' + property + '" type="' + type + '"' +
      (numeric ? ' min="0" step="any" inputmode="decimal"' : ' maxlength="' + (property === "notes" ? 250 : 120) + '"') +
      (readonly ? ' readonly title="Coût calculé automatiquement depuis les 8 ingrédients"' : '') +
      ' value="' + escapeHtml(value) + '">';
  }
  const viewRows = () => {
    const search = $("profit-workbook-search").value.trim().toLocaleLowerCase("fr");
    const filter = $("profit-workbook-filter").value;
    const sort = $("profit-workbook-sort").value;
    const rows = book.rows.filter(r =>
      (filter === "all" || r.type === filter) &&
      (!search || [r.reference,r.name,r.type,r.notes,
        ...r.ingredients.map(item=>item.name)].some(s=>s.toLocaleLowerCase("fr").includes(search))));
    if (sort === "name") rows.sort((a,b)=>a.name.localeCompare(b.name, "fr"));
    if (sort === "profit-desc") rows.sort((a,b)=>calculateWorkbookRow(b).profit-calculateWorkbookRow(a).profit);
    if (sort === "profit-asc") rows.sort((a,b)=>calculateWorkbookRow(a).profit-calculateWorkbookRow(b).profit);
    return rows;
  };
  function ingredientEditor(row) {
    const opened = expandedRecipes.has(row.id);
    if (!opened) return "";
    const parts = row.ingredients.map((ingredient,i) =>
      '<div class="profit-recipe-ingredient">' +
        '<span class="profit-recipe-number">' + (i+1) + '</span>' +
        '<label>Ingrédient<input maxlength="90" type="text" placeholder="Ex. Chanvre" data-workbook-id="' + row.id +
          '" data-recipe-index="' + i + '" data-recipe-property="name" value="' + escapeHtml(ingredient.name) + '"></label>' +
        '<label>Quantité / craft<input min="0" step="any" type="number" inputmode="decimal" data-workbook-id="' + row.id +
          '" data-recipe-index="' + i + '" data-recipe-property="perCraft" value="' + escapeHtml(ingredient.perCraft) + '"></label>' +
        '<label>Prix acheté / unité (K)<input min="0" step="any" type="number" inputmode="decimal" data-workbook-id="' + row.id +
          '" data-recipe-index="' + i + '" data-recipe-property="costUnit" value="' + escapeHtml(ingredient.costUnit) + '"></label>' +
        '<output data-recipe-line-cost="' + i + '">—</output>' +
      '</div>').join("");
    return '<tr class="profit-recipe-detail" data-workbook-recipe-row="' + row.id +
      '"><td colspan="14"><div class="profit-recipe-editor">' +
      '<div class="profit-recipe-heading"><div><strong>Recette · ' + escapeHtml(row.name || "nouvel objet") +
      '</strong><p>Renseigne jusqu’à 8 ingrédients. Le prix payé par unité et la quantité requise servent à calculer le coût de fabrication d’un objet.</p></div>' +
      '<label class="profit-recipe-toggle"><input type="checkbox" data-workbook-recipe-enabled="' + row.id + '"' +
      (row.recipeEnabled ? ' checked' : '') +
      '> Calculer le coût / unité depuis cette recette</label></div>' +
      '<div class="profit-recipe-headings"><span>N°</span><span>Ressource</span><span>Quantité pour 1 objet</span><span>Prix acheté / unité</span><span>Coût / objet</span></div>' +
      '<div class="profit-recipe-ingredients">' + parts + '</div>' +
      '<div class="profit-recipe-footer"><strong>Coût des ingrédients pour 1 objet : <output data-recipe-total>—</output></strong>' +
      '<span data-recipe-missing></span></div>' +
      '</div></td></tr>';
  }
  function renderTable() {
    const rows = viewRows();
    $("profit-workbook-body").innerHTML = rows.map((row, index) => {
      const calc = calculateWorkbookRow(row);
      const typeSelect = '<select aria-label="Catégorie" data-workbook-id="' + row.id +
        '" data-workbook-property="type">' + TYPES.map(t =>
        '<option value="' + t + '"' + (row.type === t ? " selected" : "") + '>' +
        ({craft:"Craft",vente:"Vente",autre:"Autre"}[t]) + '</option>').join("") + '</select>';
      return '<tr data-workbook-row="' + row.id + '"><th scope="row">' + (index+1) + '</th>' +
        '<td>' + field(row.reference,"reference",row.id) + '</td>' +
        '<td>' + field(row.name,"name",row.id) + '</td>' +
        '<td>' + typeSelect + '</td>' +
        '<td>' + field(row.quantity,"quantity",row.id,"number") + '</td>' +
        '<td>' + field(calc.costUnit,"costUnit",row.id,"number",row.recipeEnabled) + '</td>' +
        '<td>' + field(row.saleUnit,"saleUnit",row.id,"number") + '</td>' +
        '<td>' + field(row.taxPercent,"taxPercent",row.id,"number") + '</td>' +
        '<td data-workbook-result="costs"></td><td data-workbook-result="gross"></td>' +
        '<td data-workbook-result="profit"></td><td data-workbook-result="margin"></td>' +
        '<td>' + field(row.notes,"notes",row.id) + '</td>' +
        '<td><div class="profit-row-actions"><button type="button" data-workbook-recipe="' + row.id +
        '" aria-expanded="' + String(expandedRecipes.has(row.id)) + '" title="Afficher les 8 ingrédients de cet objet">' +
        (expandedRecipes.has(row.id) ? '▾ Recette' : '▸ Recette') + '</button>' +
        '<button type="button" data-workbook-duplicate="' + row.id +
        '" title="Dupliquer cette ligne" aria-label="Dupliquer ' + escapeHtml(row.name) + '">⧉</button>' +
        '<button type="button" data-workbook-delete="' + row.id +
        '" title="Supprimer cette ligne" aria-label="Supprimer ' + escapeHtml(row.name) + '">✕</button></div></td></tr>' +
        ingredientEditor(row);
    }).join("");
    $("profit-workbook-empty").hidden = rows.length !== 0;
    $("profit-workbook-count").textContent = rows.length + " affichée(s) / " + book.rows.length + " ligne(s)";
    refresh();
  }
  function refresh() {
    const summary = calculateWorkbook(book.rows);
    const visibleRows = new Map([...$("profit-workbook-body").querySelectorAll("tr[data-workbook-row]")]
      .map(element => [element.dataset.workbookRow, element]));
    for (const row of book.rows) {
      const tr = visibleRows.get(row.id);
      if (!tr) continue;
      const calc = calculateWorkbookRow(row);
      const costInput = tr.querySelector('[data-workbook-property="costUnit"]');
      if (row.recipeEnabled && costInput) costInput.value = calc.costUnit.toString();
      const recipeDetail = $("profit-workbook-body").querySelector('[data-workbook-recipe-row="' + row.id + '"]');
      if (recipeDetail) {
        const recipe = calculateRecipeCost(row.ingredients);
        recipeDetail.querySelector('[data-recipe-total]').textContent = money(recipe.costUnit);
        recipeDetail.querySelector('[data-recipe-missing]').textContent =
          recipe.missing ? recipe.missing + " prix d’achat manquant(s) : résultat sous-estimé." :
            (recipe.used === 0 ? "Renseigne les ingrédients pour calculer le coût réel." : "");
        recipe.rows.forEach((item,i) => {
          recipeDetail.querySelector('[data-recipe-line-cost="' + i + '"]').textContent = money(item.cost);
        });
      }
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
  const addRows = (rows, expand = false) => {
    const available = MAX_ROWS - book.rows.length;
    if (available <= 0) { status("Limite de 500 lignes atteinte."); return; }
    const added = sanitizeRows(rows).slice(0, available).map(r=>({...r,id:uid()}));
    book.rows.push(...added);
    if (expand) {
      $("profit-workbook-filter").value = "all";
      $("profit-workbook-search").value = "";
      added.forEach(row=>expandedRecipes.add(row.id));
    }
    persist(); renderTable();
    if (added.length) status(added.length + " objet(s) ajouté(s) et sauvegardé(s).");
  };
  root.addEventListener("input", event => {
    const input = event.target;
    if (input.id === "profit-workbook-search") { renderTable(); return; }
    if (!input.dataset.workbookId) return;
    const row = book.rows.find(r=>r.id===input.dataset.workbookId);
    if (!row) return;
    if (input.dataset.recipeIndex !== undefined) {
      const index = Number(input.dataset.recipeIndex), property = input.dataset.recipeProperty;
      if (!Number.isInteger(index) || index < 0 || index >= INGREDIENT_LIMIT ||
          !["name","perCraft","costUnit"].includes(property)) return;
      row.ingredients[index][property] = safeText(input.value, property === "name" ? 90 : 30);
      persist(); refresh(); return;
    }
    const property = input.dataset.workbookProperty;
    if (!["reference","name","type","quantity","costUnit","saleUnit","taxPercent","notes"].includes(property)) return;
    if (property === "costUnit" && row.recipeEnabled) return;
    row[property] = input.value;
    persist(); refresh();
  });
  root.addEventListener("change", event => {
    if (event.target.dataset.workbookRecipeEnabled) {
      const row = book.rows.find(r=>r.id===event.target.dataset.workbookRecipeEnabled);
      if (row) { row.recipeEnabled = event.target.checked; persist(); renderTable(); }
      return;
    }
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
    if (button.id === "profit-workbook-add") { addRows([blankRow(getCraft().taxPercent)], true); return; }
    if (button.dataset.workbookRecipe) {
      const id = button.dataset.workbookRecipe;
      if (expandedRecipes.has(id)) expandedRecipes.delete(id);
      else expandedRecipes.add(id);
      renderTable(); return;
    }
    if (button.dataset.workbookDuplicate) {
      const row = book.rows.find(r=>r.id===button.dataset.workbookDuplicate);
      if (row) addRows([{...row,ingredients:row.ingredients.map(i=>({...i})),
        reference:row.reference ? row.reference+" (copie)" : "",id:uid()}], row.recipeEnabled);
      return;
    }
    if (button.dataset.workbookDelete) {
      const index = book.rows.findIndex(r=>r.id===button.dataset.workbookDelete);
      if (index >= 0 && window.confirm("Supprimer cette ligne du tableau ?")) {
        expandedRecipes.delete(book.rows[index].id);
        book.rows.splice(index, 1); persist(); renderTable();
      }
      return;
    }
    if (button.id === "profit-workbook-clear") {
      if (book.rows.length && window.confirm("Effacer toutes les lignes du tableau ? Les fiches de craft restent sauvegardées.")) {
        book.rows = []; expandedRecipes.clear(); persist(); renderTable();
      }
      return;
    }
    if (button.id === "profit-workbook-add-craft") {
      const craft = getCraft(), calc = calculateCraft(craft);
      addRows([{reference:"",name:craft.product||"Objet fabriqué",type:"craft",
        quantity:craft.quantity, costUnit:calc.costPerCraft,
        saleUnit:craft.saleUnit, taxPercent:craft.taxPercent,
        recipeEnabled:true, ingredients:sanitizeIngredients(craft.ingredients),
        notes:""}], true);
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
        JSON.stringify({format:"ombre-profit-workbook",version:2,
          exportedAt:new Date().toISOString(),book,activeCraft:getCraft()},null,2),
        "application/json;charset=utf-8"); return;
    }
    if (button.id === "profit-workbook-export-csv") {
      const recipeHeaders = Array.from({length:INGREDIENT_LIMIT},(_,i)=>[
        "Ingrédient "+(i+1), "Quantité / craft "+(i+1),
        "Prix acheté / unité "+(i+1)+" (K)", "Coût / craft "+(i+1)+" (K)"]).flat();
      const headers = ["Référence","Objet","Catégorie","Quantité","Coût/unité (K)","Vente/unité (K)",
        "Taxe (%)","Coût total (K)","Ventes brutes (K)","Frais (K)","Bénéfice (K)",
        "Marge (%)","Calcul recette actif","Notes",...recipeHeaders];
      const lines = [headers, ...book.rows.map(r=>{
        const c = calculateWorkbookRow(r);
        const recipe = calculateRecipeCost(r.ingredients);
        return [r.reference,r.name,r.type,r.quantity,c.costUnit,r.saleUnit,r.taxPercent,
          c.costs,c.gross,c.fees,c.profit,c.margin,r.recipeEnabled ? "Oui" : "Non",r.notes,
          ...recipe.rows.flatMap(i=>[i.name,i.perCraft,i.costUnit,i.cost])];
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
      expandedRecipes.clear();
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
