#version 300 es
precision highp float;in vec3 vNormal,vColor,vWorld;in vec4 vLight;in vec2 vUV;in vec4 vTangent;flat in float vVisibility;
uniform sampler2D uBaseMap,uNormalMap,uORMMap;uniform float uTextured,uNormalStrength,uRoughnessFactor,uMetallicFactor;uniform vec4 uBaseFactor;uniform vec3 uCamera;
uniform sampler2D uShadow;uniform vec3 uLightDir,uBackground;
uniform float uShadowOn,uTexel,uKind,uHighlight,uUnlit,uClip,uWaterScale,uNight,uNightLight,uSurfaceLava,uVolcanicGlow,uCanyon,uDesert;
uniform vec2 uDesertWind;
uniform vec4 uBounds;uniform vec2 uWorldOrigin;
out vec4 frag;

#define WATER_DERIVATIVES

uniform float uTime;          // Tiempo de animación integrado; no multiplicar otra vez por velocidad.
uniform float uAmplitude;     // Curvatura de las bandas, 0 .. 1.8.
uniform float uStrokeWidth;   // Grosor de los trazos, 0.25 .. 2.
uniform float uHandmade;      // Irregularidad del dibujo, 0 .. 1.
uniform float uPigment;       // 0 = cuatro tintas planas. >0 añade variación sutil.
uniform float uMotifs;        // 0 / 1: pequeños motivos concéntricos opcionales.
uniform vec2 uSeedOffset;     // Igual en TODOS los chunks del mismo cuerpo de agua.
uniform vec3 uInk0;
uniform vec3 uInk1;
uniform vec3 uInk2;
uniform vec3 uInk3;

const float TAU = 6.28318530718;

// Hash sin sin() ni grandes constantes: evita desbordamientos en mediump.
float waterHash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 19.19);
    return fract((q.x + q.y) * q.z);
}

float waterAA(float d, float pixelWorld) {
#ifdef WATER_DERIVATIVES
    // Limitar el AA evita líneas fantasma en discontinuidades de fract/mod.
    float px = max(pixelWorld, 0.00015);
    return clamp(fwidth(d) * 0.75, px * 0.50, px * 1.75);
#else
    return max(pixelWorld * 1.4, 0.0006);
#endif
}

float waterFill(float signedDistance, float pixelWorld) {
    float aa = waterAA(signedDistance, pixelWorld);
    return 1.0 - smoothstep(-aa, aa, signedDistance);
}

// Cápsula horizontal con extremos redondeados; dy puede seguir una curva.
float waterStroke(float x, float dy, float halfLength, float radius, float px) {
    vec2 q = vec2(max(abs(x) - halfLength, 0.0), dy);
    return waterFill(length(q) - radius, px);
}

vec3 paintedWater(vec2 worldXZ, float pixelWorld) {
#ifdef WATER_DERIVATIVES
    // Medir ANTES de fract/mod: estable también en una malla en perspectiva.
    pixelWorld = max(length(dFdx(worldXZ)), length(dFdy(worldXZ)));
#endif
    vec2 p = worldXZ + uSeedOffset;
    float t = uTime;
    // Movimiento en +X, con una segunda oscilación que deforma la curva.
    // No se traslada una textura: se evalúan las bandas de nuevo en cada píxel.
    float x = p.x - t * 0.19;
    float sway = 0.18 * sin(x * 2.35 + 0.28 * sin(p.y * 0.79))
               + 0.072 * sin(x * 4.70 + p.y * 0.72 + t * 0.23 + 0.9);
    float brush = uHandmade * (0.009 * sin(x * 25.0 + p.y * 1.9)
                            + 0.005 * sin(x * 42.0 - p.y * 2.3));
    float bandY = p.y + uAmplitude * sway + brush;
    float row = floor(bandY);
    float f = fract(bandY);
    // Estas variaciones sólo afectan a formas alejadas de f=0/1.
    // Por eso floor() no introduce cortes visibles entre las filas.
    float h = waterHash(vec2(row, 7.0));
    float wide = 0.024 * sin(x * 1.19 + row * 1.7);
    float low = 0.115 + wide;
    float high = 0.765 + 0.033 * sin(x * 1.65 + row * 1.4);
    float ribbon = waterFill(max(low - f, f - high), pixelWorld);
    vec3 col = mix(uInk0, uInk1, ribbon);

    // Lenguas largas de una tercera tinta, con una silueta cerrada y plana.
    float patchX = mod(x * 0.82 + h * 5.8 + row * 0.53, 5.3) - 2.65;
    float taper = clamp(1.0 - abs(patchX) / 2.30, 0.0, 1.0);
    float patchCenter = 0.39 + 0.028 * sin(x * 3.1 + row * 2.4);
    float patchHalf = 0.145 * taper;
    float patchD = max(abs(f - patchCenter) - patchHalf, abs(patchX) - 2.30);
    col = mix(col, uInk2, waterFill(patchD, pixelWorld));

    // Crestas de marfil: discontinuas y más largas que las ondas pequeñas.
    // La cápsula conserva extremos suaves SIN desenfocar el interior del color.
    float period = 3.9;
    float sx = mod(p.x - t * 0.115 + h * period + row * 0.61, period) - period * 0.5;
    float center = 0.705 + 0.027 * sin(x * 3.3 + h * TAU);
    float radius = 0.0195 * uStrokeWidth * (1.0 + uHandmade * 0.19 * sin(x * 15.0 + row));
    float line = waterStroke(sx, f - center, 0.72 + h * 0.18, radius, pixelWorld);
    col = mix(col, uInk3, line);

    // Un trazo compañero corto en algunas filas. Todo sigue siendo tinta plana.
    float sx2 = mod(p.x - t * 0.14 + h * 6.5 + 1.5, 6.5) - 3.25;
    float tiny = waterStroke(sx2, f - 0.855, 0.28 + h * 0.13,
                            0.012 * uStrokeWidth, pixelWorld);
    col = mix(col, uInk2, tiny * step(0.25, h));

    // Motivo opcional: anillos elípticos, no una simulación de ondas físicas.
    if (uMotifs > 0.5) {
        vec2 cellSize = vec2(5.8, 3.9);
        vec2 cp = p + vec2(t * -0.08, 0.0);
        vec2 cell = floor(cp / cellSize);
        vec2 q = mod(cp, cellSize) - cellSize * 0.5;
        float rnd = waterHash(cell + 13.0);
        q -= vec2((rnd - 0.5) * 1.5, (waterHash(cell + 3.0) - 0.5) * 0.6);
        q.y *= 2.0;
        float r = length(q);
        float pulse = 0.017 * sin(t * 0.8 + rnd * TAU);
        float rd = min(abs(r - (0.25 + pulse)), abs(r - (0.45 + pulse)));
        rd = min(rd, abs(r - (0.65 + pulse)));
        float rings = waterFill(rd - 0.012 * uStrokeWidth, pixelWorld * 2.0);
        // Interrupción del contorno para que parezca un signo pintado.
        rings *= step(0.64, rnd) * (1.0 - step(0.06, q.x) * step(-0.08, q.y));
        col = mix(col, uInk3, rings);
    }

    // Desactivado por defecto: no es necesario para conseguir el efecto.
    if (uPigment > 0.001) {
        float grain = waterHash(floor(p * 72.0));
        col *= 1.0 + (grain - 0.5) * uPigment * 0.12;
    }
    return col;
}

// Slow molten flow in world coordinates. Same phase in neighbouring chunks.
vec3 paintedLava(vec2 p){
 vec2 flow=p*.64+uSeedOffset+vec2(-uTime*.018,uTime*.008);
 flow+=vec2(sin(flow.y*.91+uTime*.034),sin(flow.x*.72-uTime*.029))*.19*uAmplitude;
 vec2 cell=floor(flow),q=fract(flow);float first=10.,second=10.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 o=vec2(float(x),float(y));
  vec2 jitter=vec2(waterHash(cell+o+7.1),waterHash(cell+o+31.7));
  vec2 d=o+.18+jitter*.64-q;float dist=dot(d,d);
  if(dist<first){second=first;first=dist;}else second=min(second,dist);
 }
 float gap=sqrt(second)-sqrt(first);
 float aa=max(fwidth(gap),.008);
 float edge=1.-smoothstep(.07-aa,.22+aa,gap);
 float core=1.-smoothstep(.016-aa*.35,.055+aa*.35,gap);
 float heat=.5+.5*sin(p.x*.38+p.y*.53-uTime*.08);
 vec3 crust=mix(uInk0,uInk1,.40+heat*.25);
 vec3 liquid=mix(crust,uInk2,edge*.90);
 liquid=mix(liquid,uInk3,core*.75);
 return clamp(liquid*(.96+.04*sin(uTime*.6+p.x*.21)),0.,1.);
}

float shadow(vec3 N){
 vec3 p=vLight.xyz/vLight.w*.5+.5;
 if(uShadowOn<.5||p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 0.;
 float bias=max(.00022,.0009*(1.-dot(N,uLightDir))),s=0.;
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
  float d=texture(uShadow,p.xy+vec2(float(x),float(y))*uTexel).r;s+=(p.z-bias>d)?1.:0.;
 }return s/9.;
}
// Stable screen-space coverage, shared by all faces of an instance. This avoids
// transparency sorting, material clones and seeing the back of a hollow canopy.
float coverageThreshold(vec2 pixel){
 ivec2 p=ivec2(pixel)&7;int n=0;
 for(int bit=0;bit<3;bit++){int x=(p.x>>bit)&1,y=(p.y>>bit)&1;n=n*4+(2*(x^y)+y);} 
 return (float(n)+.5)/64.;
}
void legacyMain(){
 if(vVisibility<.999){if(vVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vVisibility)discard;}
 if(uClip>.5){bool within=vWorld.x>=uBounds.x&&vWorld.z>=uBounds.y&&vWorld.x<uBounds.z&&vWorld.z<uBounds.w;if((uClip<1.5&&!within)||(uClip>1.5&&within))discard;}
 vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
 vec4 texel=vec4(1.);float roughness=.9,metal=0.;
 if(uTextured>.5){
  texel=texture(uBaseMap,vUV)*uBaseFactor;if(texel.a<.35)discard;
  vec3 T=normalize(vTangent.xyz-N*dot(N,vTangent.xyz)),B=cross(N,T)*vTangent.w;
  vec3 mapN=texture(uNormalMap,vUV).rgb*2.-1.;mapN.xy*=uNormalStrength;
  N=normalize(mat3(T,B,N)*normalize(mapN));vec3 orm=texture(uORMMap,vUV).rgb;roughness=clamp(orm.g*uRoughnessFactor,.25,1.);metal=clamp(orm.b*uMetallicFactor,0.,1.);
 }
 float d=max(dot(N,uLightDir),0.),sh=shadow(N)*mix(1.,.56,uNight);
 vec3 surfaceColor=vColor*texel.rgb;
 if(uCanyon>.5&&uTextured<.5&&uKind<.5&&uUnlit<.5){
  vec2 worldXZ=vWorld.xz+uWorldOrigin;
  float height=vWorld.y-3.28+sin(worldXZ.y*.024)*.55;
  float phase=mod(height,5.6);
  float pale=smoothstep(3.85,4.05,phase)*(1.-smoothstep(4.7,4.92,phase));
  float thin=smoothstep(1.7,1.82,phase)*(1.-smoothstep(1.97,2.06,phase));
  float wall=smoothstep(1.4,4.0,height);
  vec3 sandstone=mix(vec3(.67,.29,.16),vec3(.84,.48,.27),.40+.07*sin(height*1.1));
  sandstone=mix(sandstone,vec3(.91,.66,.40),pale*.72+thin*.32);
  surfaceColor=mix(surfaceColor,sandstone,wall*.90);
 }
 if(uDesert>.5&&uTextured<.5&&uKind<.5&&uUnlit<.5){
  vec2 worldXZ=vWorld.xz+uWorldOrigin;
  float u=dot(worldXZ,uDesertWind),v=dot(worldXZ,vec2(-uDesertWind.y,uDesertWind.x));
  float phase=u*11.7+.82*sin(v*.24)+.36*sin(v*.69+u*.11);
  float aa=1.-smoothstep(.55,3.2,fwidth(phase));
  float ripple=sin(phase)*aa;
  surfaceColor*=1.+ripple*.024;
 }
 vec3 albedo=pow(clamp(surfaceColor,0.,1.),vec3(2.2));
 vec3 ambient=mix(vec3(.39,.31,.24),vec3(.83,.87,.72),N.y*.5+.5)*.54;
 vec3 warmSun=vec3(1.32,1.08,.72),coolShadow=vec3(.72,.77,.92);
 vec3 lit=albedo*(ambient+warmSun*d);
 lit*=mix(vec3(1.),coolShadow,sh*.52);
 lit+=albedo*vec3(.03,.035,.055)*sh;
 if(uTextured>.5){vec3 H=normalize(normalize(uCamera-vWorld)+uLightDir);float spec=pow(max(dot(N,H),0.),mix(48.,5.,roughness))*pow(1.-roughness,2.)*.15;lit+=mix(vec3(.04),albedo,metal)*spec*(1.-sh); }
 vec3 col=pow(max(lit,vec3(0.)),vec3(1./2.2));
 if(uKind>.5&&uKind<1.5){
  // Broader, calmer bands: slightly stretched mapping and softer palette.
  vec2 wp=(vWorld.zx+uWorldOrigin.yx)*vec2(.22,.45)*uWaterScale;
  col=uSurfaceLava>.5?paintedLava(wp*4.):paintedWater(wp,.001);
  if(uSurfaceLava<.5)col=mix(col,col*coolShadow+vec3(.018,.035,.05),sh*.18);
 }
 if(uHighlight>.5)col=mix(col,vec3(.8,.94,.32),.26);
 if(uUnlit>.5)col=vColor;
 if(uKind>1.5)col=uBackground*(1.-sh*.18);
 // Slightly brighter, bluer night grading for the landscape only.
 float luminance=dot(col,vec3(.2126,.7152,.0722));
 vec3 moonBase=mix(col,vec3(luminance),.36);
 vec3 moonColor=(moonBase*vec3(.46,.65,1.08)+vec3(.03,.055,.11))*uNightLight;
 if(!(uSurfaceLava>.5&&uKind>.5&&uKind<1.5))col=mix(col,clamp(moonColor,0.,1.),uNight*.92);
 // Optical emission on bright orange texels only; foliage and dark basalt stay lit normally.
 if(uVolcanicGlow>.5&&uTextured>.5&&uKind<.5){
  float hot=smoothstep(.65,.93,texel.r)*smoothstep(.12,.34,texel.r-texel.g)*(1.-smoothstep(.18,.35,texel.b));
  vec3 ember=clamp(texel.rgb*vec3(1.08,1.10,.95)*(1.+.06*sin(uTime*.7+vWorld.y*.4)),0.,1.);
  col=mix(col,ember,hot*.86);
 }
 frag=vec4(col,1.);
}
uniform float uEnhanced,uExposure,uBiome,uSurfaceType,uDetail,uContactOn,uEnvYaw;
uniform vec4 uSurfaceParams,uContactBounds;
uniform vec3 uLocalMin,uLocalSize;
uniform sampler2D uEnvDay,uEnvNight,uContactMap;
uniform highp sampler2DShadow uShadowFiltered;
in vec3 vLocal;
const float PI4=3.14159265359;
float detailHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float materialNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(detailHash(i),detailHash(i+vec3(1,0,0)),f.x),mix(detailHash(i+vec3(0,1,0)),detailHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(detailHash(i+vec3(0,0,1)),detailHash(i+vec3(1,0,1)),f.x),mix(detailHash(i+vec3(0,1,1)),detailHash(i+vec3(1)),f.x),f.y),f.z);}
vec3 toLinear4(vec3 c){return pow(max(c,vec3(0.)),vec3(2.2));}
vec3 filmic4(vec3 c){c=max(c*uExposure,vec3(0.));return pow(clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.),vec3(1./2.2));}
vec3 fresnel4(float cosine,vec3 f0){return f0+(1.-f0)*pow(1.-clamp(cosine,0.,1.),5.);}
vec3 environment4(vec3 d,float rough){d=normalize(d);vec2 uv=vec2(atan(d.z,d.x)/(2.*PI4)+.5+uEnvYaw,acos(clamp(d.y,-1.,1.))/PI4);
 vec3 day=textureLod(uEnvDay,uv,rough*7.).rgb*4.;
 vec3 night=textureLod(uEnvNight,uv,rough*7.).rgb*4.;
 return mix(day,night+vec3(.025,.045,.10),uNight);}
vec3 brdf4(vec3 N,vec3 V,vec3 L,vec3 base,float rough,float metal){
 vec3 H=normalize(V+L);float nv=max(dot(N,V),.015),nl=max(dot(N,L),0.),nh=max(dot(N,H),0.);
 float a=max(.045,rough*rough),a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/max(PI4*den*den,.0001);
 float k=(rough+1.)*(rough+1.)*.125;float G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));
 vec3 F=fresnel4(max(dot(H,V),0.),mix(vec3(.04),base,metal));
 return ((1.-F)*(1.-metal)*base/PI4+F*D*G/max(4.*nv*max(nl,.001),.001))*nl;
}
float contact4(){if(uContactOn<.5)return 1.;vec2 uv=(vWorld.xz+uWorldOrigin-uContactBounds.xy)/max(uContactBounds.zw,vec2(1.));
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return 1.;return texture(uContactMap,uv).r;}
float filteredShadow4(vec3 normal){
 vec3 p=vLight.xyz/vLight.w*.5+.5;
 if(uShadowOn<.5||p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.||p.z<0.)return 0.;
 vec2 ux=dFdx(p.xy),uy=dFdy(p.xy);float zx=dFdx(p.z),zy=dFdy(p.z),det=ux.x*uy.y-ux.y*uy.x;
 vec2 slope=abs(det)>.00000000001?vec2(uy.y*zx-ux.y*zy,ux.x*zy-uy.x*zx)/det:vec2(0.);
 slope=clamp(slope,vec2(-4.),vec2(4.));
 float bias=max(.00017,.0004*(1.-dot(normal,uLightDir)))+dot(abs(slope),vec2(uTexel))*.65,v=0.;
 // Receiver-plane depth compensation prevents the PCF kernel shadowing the ground itself.
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 o=vec2(float(x),float(y))*uTexel*1.15;v+=texture(uShadowFiltered,vec3(p.xy+o,p.z+dot(slope,o)-bias));}
 // Fade the shadow map edges to avoid a rectangular boundary in the distance.
 float edge=min(min(p.x,1.-p.x),min(p.y,1.-p.y));return (1.-v/9.)*smoothstep(.005,.045,edge);
}

float toonRamp4(float x,float levels){x=clamp(x,0.,1.);return floor(x*(levels-.0001))/max(levels-1.,1.);}
vec3 saturateGrade4(vec3 c,float amt){float l=dot(c,vec3(.299,.587,.114));return mix(vec3(l),c,amt);}
vec3 africanToon4(vec3 lit,vec3 albedo,vec3 N,vec3 V,vec3 sun,vec3 reflected,float rough,float visibility,float leaf,float wet,float metal,float nv,vec3 worldP){
 if(uKind>.5&&uKind<1.5){
  vec3 outC=filmic4(lit);
  outC=saturateGrade4(outC*vec3(.99,1.03,1.07),1.02);
  return outC;
 }
 if(uKind<.5&&uSurfaceType<.5&&wet>.60){
  vec3 outC=filmic4(lit);
  outC=saturateGrade4(outC*vec3(1.00,1.00,.99),1.01);
  return outC;
 }
 float nl=max(dot(N,uLightDir),0.);
 float band=toonRamp4(nl*visibility,4.);
 float fill=toonRamp4(clamp(N.y*.5+.5,0.,1.),3.);
 float spec=pow(max(dot(reflect(-uLightDir,N),V),0.),mix(18.,34.,1.-rough));
 float specBand=smoothstep(.62,.88,spec)*(1.-rough*.40);
 vec3 warmSun=mix(vec3(1.42,1.06,.62),vec3(.28,.36,.58)*uNightLight,uNight);
 vec3 coolShade=mix(vec3(.46,.36,.22),vec3(.10,.14,.24)*uNightLight,uNight);
 vec3 base=mix(coolShade*.46,warmSun,.24+.76*band);
 vec3 toon=albedo*base*(.76+.24*fill);
 toon+=albedo*leaf*warmSun*(.13+.28*band);
 toon+=reflected*(.03+.05*(1.-rough)+wet*.18);
 toon+=vec3(specBand)*mix(vec3(.92,.78,.46),vec3(.70,.78,.96),uNight)*(.16+.14*(1.-metal)+wet*.28);
 float wetSheen=smoothstep(.15,.75,wet)*(1.-rough*.35);
 toon+=reflected*wetSheen*.22;
 toon+=vec3(spec)*wetSheen*mix(vec3(.40,.28,.16),vec3(.26,.30,.38),uNight)*.18;
 float rim=smoothstep(.18,.72,1.-nv)*(.08+.12*(1.-rough));
 toon+=albedo*rim*mix(vec3(.44,.24,.10),vec3(.10,.16,.26),uNight);
 float edge=max(1.-smoothstep(.10,.36,nv),smoothstep(.26,.58,length(fwidth(N))*2.0));
 edge=max(edge,smoothstep(.30,.62,length(fwidth(albedo))*4.0)*.35);
 float brush=materialNoise(worldP*.85)*.42+materialNoise(worldP*2.2)*.22;
 vec3 pigment=mix(vec3(.98,.96,.92),vec3(1.03,.99,.92),brush*.30);
 toon*=pigment;
 vec3 outC=filmic4(toon);
 outC=saturateGrade4(outC,1.12);
 outC=mix(outC,vec3(.84,.76,.58),.025*brush);
 vec3 ink=mix(vec3(.28,.18,.07),vec3(.08,.09,.13),uNight);
 outC=mix(outC,ink,clamp(edge*.38,0.,.55));
 return outC;
}
void main(){
 if(uEnhanced<.5){legacyMain();return;}
 if(vVisibility<.999){if(vVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vVisibility)discard;}
 if(uClip>.5){bool inside=vWorld.x>=uBounds.x&&vWorld.z>=uBounds.y&&vWorld.x<uBounds.z&&vWorld.z<uBounds.w;if((uClip<1.5&&!inside)||(uClip>1.5&&inside))discard;}
 if(uUnlit>.5){frag=vec4(vColor,1.);return;}
 vec3 worldP=vec3(vWorld.x+uWorldOrigin.x,vWorld.y,vWorld.z+uWorldOrigin.y);
 vec3 Ng=normalize(vNormal);if(!gl_FrontFacing)Ng=-Ng;vec3 N=Ng;
 vec4 texel=vec4(1.);float rough=uSurfaceParams.x,metal=0.,leaf=0.,wet=uSurfaceParams.w;
 vec3 color=vColor;float objAO=1.;
 if(uTextured>.5){
  texel=texture(uBaseMap,vUV)*uBaseFactor;if(texel.a<.35)discard;color*=texel.rgb;
  vec3 tv=vTangent.xyz-N*dot(N,vTangent.xyz);vec3 T=dot(tv,tv)>.00001?normalize(tv):normalize(cross(N,abs(N.y)<.9?vec3(0,1,0):vec3(1,0,0)));
  vec3 B=cross(N,T)*vTangent.w;vec3 mapN=texture(uNormalMap,vUV).rgb*2.-1.;mapN.xy*=uNormalStrength;
  N=normalize(mat3(T,B,N)*normalize(mapN));vec3 mr=texture(uORMMap,vUV).rgb;
  rough=clamp(mix(rough,mr.g,.26),.24,.98);metal=clamp(mr.b*uSurfaceParams.y,0.,1.);
  leaf=smoothstep(.018,.13,texel.g-texel.r*.87)*smoothstep(.06,.20,texel.g)*uSurfaceParams.z;
  rough=mix(rough,.54,leaf);float relH=clamp((vLocal.y-uLocalMin.y)/max(uLocalSize.y,.05),0.,1.);
  objAO=mix(.80,1.,smoothstep(0.,.22,relH));
  wet*=1.-smoothstep(.04,.3,relH);rough=mix(rough,.38,wet*.68);color*=mix(vec3(1.),vec3(.63,.66,.54),wet*(1.-leaf*.5));
 }else if(uKind<.5){
  float greenery=smoothstep(.008,.10,color.g-color.r*.92);
  float coarse=materialNoise(worldP*.32),fine=materialNoise(worldP*2.6);
  float footprint=max(length(dFdx(worldP)),length(dFdy(worldP)));float detailAA=1.-smoothstep(.2,1.0,footprint);
  color*=.94+.10*coarse+.05*(fine-.5)*detailAA;
  rough=mix(.88,.97,greenery);
  if(uBiome>1.5&&uBiome<2.5){wet=.72*(1.-greenery*.35);rough=mix(.56,.36,coarse);color*=mix(vec3(.47,.43,.36),vec3(.52,.67,.38),greenery*.65);}
  else if(uBiome>.5&&uBiome<1.5){wet=.25*(1.-greenery);rough=mix(rough,.59,wet);}
  if(uCanyon>.5){
   float h=vWorld.y-3.28+sin(worldP.z*.024)*.55,phase=mod(h,5.6);
   float pale=smoothstep(3.85,4.05,phase)*(1.-smoothstep(4.7,4.92,phase)),thin=smoothstep(1.7,1.82,phase)*(1.-smoothstep(1.97,2.06,phase));
   vec3 stone=mix(vec3(.67,.29,.16),vec3(.84,.48,.27),.40+.07*sin(h*1.1));
   stone=mix(stone,vec3(.91,.66,.40),pale*.72+thin*.32);
   color=mix(color,stone,smoothstep(1.4,4.,h)*.90);rough=.91;
  }
  if(uDetail>.5){
   // Derivative normal perturbation: follows vertical cliffs as well as flat ground.
   vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld),R1=cross(dp2,N),R2=cross(N,dp1);
   float det=dot(dp1,R1);vec3 grad=sign(det)*(dFdx(fine)*R1+dFdy(fine)*R2);
   N=normalize(abs(det)*N-grad*.018*detailAA);
  }
  if(uDesert>.5){
   // Arena limpia: las dunas grandes ya las define la geometría. Evitamos el patrón
   // sinusoidal de micro-ripples (caro y repetitivo) y reutilizamos el ruido ya calculado.
   float sandGrain=(coarse-.5)*.018+(fine-.5)*.006*detailAA;
   color*=1.+sandGrain;
   rough=.97;
  }
  objAO=contact4();
 }
 vec3 V=normalize(uCamera-vWorld);float nv=max(dot(N,V),0.);
 float shadeFraction=filteredShadow4(Ng);float visibility=1.-shadeFraction*.93;
 vec3 albedo=toLinear4(clamp(color,0.,1.));
 vec3 sun=mix(vec3(3.35,2.90,2.28),vec3(.26,.40,.72)*uNightLight,uNight);
 vec3 skyFill=mix(vec3(.50,.64,.82),vec3(.11,.19,.36)*uNightLight,uNight);
 vec3 groundFill=mix(vec3(.24,.21,.16),vec3(.055,.08,.14)*uNightLight,uNight);
 vec3 ambient=mix(groundFill,skyFill,clamp(N.y*.5+.5,0.,1.));
 vec3 direct=brdf4(N,V,uLightDir,albedo,rough,metal)*sun*visibility;
 vec3 reflected=environment4(reflect(-V,N),rough);
 vec3 specAmbient=reflected*fresnel4(nv,mix(vec3(.04),albedo,metal))*(1.-rough*.65)*.55;
 vec3 lit=direct+albedo*ambient*objAO*(1.-metal)+specAmbient*objAO;
 float back=pow(max(dot(-uLightDir,V),0.),3.)*.32+max(dot(-N,uLightDir),0.)*.13;
 lit+=albedo*leaf*sun*back*.24*(.45+.55*visibility);
 if(uKind>.5&&uKind<1.5){
  vec2 wp=(vWorld.zx+uWorldOrigin.yx)*vec2(.22,.45)*uWaterScale;
  if(uSurfaceLava>.5){lit=toLinear4(paintedLava(wp*4.))*2.15;}
  else{
   vec3 wn=normalize(vec3(.040*sin(worldP.x*.43+worldP.z*.18+uTime*.40),1.,.040*cos(worldP.z*.37-worldP.x*.16-uTime*.32)));
   float f=.022+.978*pow(1.-max(dot(wn,V),0.),5.);
   vec3 reflection=environment4(reflect(-V,wn),.22);
   vec3 paint=paintedWater(wp,.001);vec3 base=mix(uInk1,paint,.42)*.72;
   lit=toLinear4(base)*mix(vec3(.82,.90,.92),vec3(.12,.22,.43)*uNightLight,uNight)*(.70+.30*visibility);
   lit=mix(lit,reflection*.75,clamp(f*.78,.03,.75));
   lit+=brdf4(wn,V,uLightDir,vec3(.004),.22,0.)*sun*visibility*.55;
  }
 }
 if(uVolcanicGlow>.5&&uTextured>.5&&uKind<.5){
  float hot=smoothstep(.65,.93,texel.r)*smoothstep(.12,.34,texel.r-texel.g)*(1.-smoothstep(.18,.35,texel.b));
  lit+=toLinear4(texel.rgb)*hot*1.65;
 }
 if(uKind>1.5)lit=toLinear4(uBackground)*(.55+.40*max(dot(N,uLightDir),0.))*(1.-shadeFraction*.45);
 vec3 outColor=uEnhanced>1.5?africanToon4(lit,albedo,N,V,sun,reflected,rough,visibility,leaf,wet,metal,nv,worldP):filmic4(lit);
 if(uHighlight>.5)outColor=mix(outColor,vec3(.8,.94,.32),uEnhanced>1.5?.18:.26);
 frag=vec4(outColor,1.);
}