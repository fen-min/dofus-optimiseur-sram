import test from "node:test";
import assert from "node:assert/strict";
import {calculateCraft, calculateListing, calculateListings} from "../src/profit-core.js";

test("Mijoté Récréatif: 8 personnages et coût de trois ressources", () => {
  const result = calculateCraft({quantity:2544, saleUnit:1350, taxPercent:2, ingredients:[
    {name:"Viande Fraîche",perCraft:1,costUnit:210},
    {name:"Chanvre",perCraft:2,costUnit:400},
    {name:"Eau Potable",perCraft:1,costUnit:50}
  ]});
  assert.equal(result.costPerCraft, 1060);
  assert.equal(result.gross, 3434400);
  assert.equal(result.fees, 68688);
  assert.equal(result.costs, 2696640);
  assert.equal(result.profit, 669072);
  assert.equal(result.rawSaleNet, null);
});

test("Les huit ressources sont prises en compte, les suivantes ignorées", () => {
  const ingredients=Array.from({length:10},()=>({perCraft:1,costUnit:100}));
  assert.equal(calculateCraft({quantity:1,ingredients}).costPerCraft,800);
});

test("Comparaison craft et revente des ingrédients sans décalage sur cases vides", () => {
  const result=calculateCraft({quantity:2,saleUnit:30,taxPercent:0,ingredients:[
    {perCraft:0,resaleUnit:""}, {perCraft:1,costUnit:5,resaleUnit:10}]});
  assert.equal(result.rawSaleNet,20);
  assert.equal(result.differenceVsRawSale,40);
});

test("Prix par unité calculé pour un lot de 100", () => {
  const item=calculateListing({name:"Mijoté",lotSize:100,lotPrice:135000,units:1000,costUnit:1060},2);
  assert.equal(item.saleUnit,1350);
  assert.equal(item.fees,27000);
  assert.equal(item.profitUnit,263);
  assert.equal(item.profit,263000);
});

test("Suivi de 8 objets et valeurs invalides sans bénéfice inventé", () => {
  const items=Array.from({length:9},()=>({lotSize:10,lotPrice:100,units:10,costUnit:5}));
  const all=calculateListings(items,2);
  assert.equal(all.rows.length,8);
  assert.equal(all.units,80);
  assert.equal(all.gross,800);
  assert.equal(all.profit,384);
  const empty=calculateListing({lotSize:100,lotPrice:-1,units:-10,costUnit:"incorrect"},2);
  assert.equal(empty.profit,0);
});

test("La taxe de 100 % empêche une marge positive", () => {
  const result=calculateCraft({quantity:1,saleUnit:200,taxPercent:100,ingredients:[{perCraft:1,costUnit:100}]});
  assert.equal(result.profit,-100);
  assert.equal(result.breakEven,null);
});
