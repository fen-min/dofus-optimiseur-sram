/**
 * Portrait-ready cards for the Personnages & builds section.
 * Image slots deliberately use a placeholder until the user supplies portraits.
 * Keep the selection and build action data attributes used by src/app.js.
 */
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));

export function renderBuildCards(builds,activeId,classes){
 return builds.map(build=>{
  const cls=classes[build.classId];
  if(!cls)return "";
  const active=build.id===activeId;
  // Class colors are predefined by OMBRE; don't interpolate arbitrary CSS.
  const accent=/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(cls.color)?cls.color:"#a28bff";
  const id=escapeHtml(build.id),character=escapeHtml(build.character);
  const name=escapeHtml(build.name);
  const className=escapeHtml(cls.name),element=escapeHtml(build.element);
  const label=escapeHtml(build.character+" — "+build.name);
  return '<article class="build-card'+(active?' is-active':'')+'" style="--card-accent:'+accent+'">'+
   '<button type="button" class="build-card-select" data-open-build="'+id+'" aria-pressed="'+active+
    '" aria-label="Sélectionner '+label+'">'+
    '<span class="build-card-portrait" aria-hidden="true">'+
     '<span class="build-card-portrait-frame">'+
      '<span class="build-card-portrait-symbol">'+escapeHtml(cls.glyph)+'</span>'+
      '<span class="build-card-portrait-hint">Image à venir</span>'+
     '</span>'+
     (active?'<span class="build-card-current">✓ Build actif</span>':'')+
    '</span>'+
    '<span class="build-card-info">'+
     '<span class="build-card-class">'+className+' · Niv. '+escapeHtml(build.level)+'</span>'+
     '<span class="build-card-character">'+character+'</span>'+
     '<span class="build-card-name">'+name+'</span>'+
     '<span class="build-card-details">'+element+' · '+escapeHtml(build.ap)+' PA · '+escapeHtml(build.turns)+' tours</span>'+
    '</span>'+
   '</button>'+
   '<div class="build-card-actions">'+
    '<button type="button" data-clone-build="'+id+'" aria-label="Dupliquer '+label+'">⧉ Dupliquer</button>'+
    '<button type="button" data-rename-build="'+id+'" aria-label="Renommer '+label+'">Renommer</button>'+
   '</div>'+
  '</article>';
 }).join("");
}
