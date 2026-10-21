import {optimize} from "./engine.js?v=1.1";

// Calcul hors du fil principal pour préserver la fluidité de la page sur 10 tours.
self.onmessage = (event) => {
  try {
    const {settings,spells} = event.data || {};
    if (!settings || !Array.isArray(spells)) throw new Error("Paramètres de calcul manquants.");
    const result = optimize(settings, spells, (progress) => {
      self.postMessage({type:"progress",progress});
    });
    self.postMessage({type:"complete",result});
  } catch (error) {
    self.postMessage({type:"error",message:error?.message || String(error)});
  }
};
