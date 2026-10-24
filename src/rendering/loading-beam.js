// Presentation-only analytic beam; reuses the existing mist fullscreen draw.
export function loadingBeamEnabled(search=globalThis.location?.search??''){return new URLSearchParams(search).get('loadingBeam')==='oblique';}
export function patchLoadingBeam(original){
 const start=original.indexOf('float shaft='),end=original.indexOf('vec3 light=',start);
 if(start<0||end<0)throw Error('Loading beam anchors missing');
 const beam=`float beamAspect=uLoadingFocusSize.x/max(1.,uLoadingFocusSize.y);
 float beamY=clamp((vScreen.y+.5)/1.5,0.,1.);
 float beamCentre=-.12+.95*beamY;
 float beamWidth=mix(.55,.09,beamY);
 float beamEdge=abs(vScreen.x*beamAspect-beamCentre)/beamWidth;
 float beamCore=pow(max(0.,1.-beamEdge),1.6);
 float beamHalo=pow(max(0.,1.-beamEdge*.48),2.5);
 float shaft=(beamCore*.72+beamHalo*.28)*smoothstep(-.65,-.12,vScreen.y)*mix(.72,.58,uNight)*(1.-smoothstep(.2,.85,uForward.y));`;
 return original.slice(0,start)+beam+original.slice(end);
}
