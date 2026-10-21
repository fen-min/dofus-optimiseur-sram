/**
 * OMBRE — shared always-on-top Combat Assisté launcher.
 * Must be called directly by a user click in a TOP-LEVEL browser document.
 *
 * Use an independent same-origin iframe rather than moving the existing
 * interface DOM into Picture-in-Picture: moving the DOM left the opener blank.
 */
export function canPinAssist(host){
 return !!(host && host.isSecureContext!==false &&
  host.self===host.top && typeof host.documentPictureInPicture?.requestWindow==="function");
}
export const pinAssistUnsupported=
 "L’épinglage doit partir de la page OMBRE ou de la petite fenêtre indépendante, avec Chrome/Edge de bureau en HTTPS.";
export async function openAssistPin(host,buildId,onClose=()=>{}){
 if(!canPinAssist(host))throw new Error(pinAssistUnsupported);
 if(!buildId)throw new Error("Sélectionne un build avant d’épingler l’assistant.");
 // IMPORTANT: no await before requestWindow, required for user activation.
 const pip=await host.documentPictureInPicture.requestWindow({
  width:455,height:790,disallowReturnToOpener:true
 });
 try{
  const doc=pip.document;
  doc.title="OMBRE — Combat assisté 📌";
  doc.documentElement.lang="fr";
  doc.body.style.cssText="margin:0;padding:0;overflow:hidden;background:#171d2c;height:100vh";
  const frame=doc.createElement("iframe");
  const url=new URL("./combat-assiste.html",host.location.href);
  url.searchParams.set("build",buildId);
  url.searchParams.set("embedded","pip");
  frame.src=url.href;
  frame.title="Combat assisté au premier plan";
  frame.setAttribute("allow","fullscreen");
  frame.style.cssText="display:block;width:100%;height:100vh;border:0;background:#171d2c";
  doc.body.append(frame);
  let closed=false;
  pip.addEventListener("pagehide",()=>{
   if(closed)return;closed=true;
   onClose();
  },{once:true});
  return {window:pip,close(){pip.close();},frame};
 }catch(error){
  pip.close();throw error;
 }
}
