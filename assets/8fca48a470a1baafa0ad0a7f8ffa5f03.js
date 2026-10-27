// Moteur 3D minimal (WebGL1) pour la Swift Sport — sans dépendance externe.
// Matières par pièce : 0 peinture, 1 pneu, 2 jante/métal, 3 vitre, 4 plastique noir, 5 boîtier de phare,
// 6 feu arrière, 7 chrome, 8 métal anodisé (couleur du site), 9 intérieur, 10 verre de phare, 11 étrier.
(function (G) {
  function b64(s) { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  const M4 = {
    persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]; },
    look(e, c, u) {
      let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let l = Math.hypot(...z); z = z.map((x) => x / l);
      let x = [u[1] * z[2] - u[2] * z[1], u[2] * z[0] - u[0] * z[2], u[0] * z[1] - u[1] * z[0]]; l = Math.hypot(...x); x = x.map((q) => q / l);
      const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
      return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1];
    },
    mul(a, b) { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; }
  };
  const VS = `attribute vec3 p;attribute vec3 n;uniform mat4 VP;uniform vec3 lo;uniform vec3 sc;uniform float mir;
  uniform vec3 pv;uniform float ang;uniform float xf;uniform float lift;varying vec3 vn;varying vec3 vp;varying vec3 vo;
  uniform float kind;uniform float drv;uniform float roll;uniform float pch;uniform float steer;uniform vec4 wdy;
  vec3 rotZ(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x-s*v.y,s*v.x+c*v.y,v.z);}
  vec3 rotX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}
  vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
  void main(){vec3 P=lo+p*sc;vec3 N=n/127.;vo=P;
    if((xf>0.5&&xf<1.5)||xf>3.5){P=pv+rotX(P-pv,ang);N=rotX(N,ang);}
    else if(xf>1.5){P=pv+rotY(P-pv,ang);N=rotY(N,ang);}
    if(drv>.5){                                   // roulage : roues indépendantes (braquage, débattement), caisse qui prend du roulis et du tangage
      vec3 wc=vec3(vo.x<0.?-.711:.711,.331,vo.z<.1?-1.067:1.319);
      bool wh=xf>3.5||(((kind>.5&&kind<2.5)||(kind>10.5&&kind<11.5))&&abs(vo.x)>.45&&length(vo.yz-wc.yz)<.34);
      if(wh){if(wc.z<0.){P=wc+rotY(P-wc,steer);N=rotY(N,steer);}
        float sx=step(0.,vo.x),sz=step(0.,vo.z);P.y+=mix(mix(wdy.x,wdy.y,sx),mix(wdy.z,wdy.w,sx),sz)-.03;}
      else{vec3 c=vec3(0.,.36,.12);P=c+rotX(rotZ(P-c,roll),pch);N=rotX(rotZ(N,roll),pch);P.y+=lift;}
    } else P.y+=lift;
    if(mir>0.5){P.y=-P.y;N.y=-N.y;}
    vn=N;vp=P;gl_Position=VP*vec4(P,1.);}`;
  const FS = `precision highp float;varying vec3 vn;varying vec3 vp;varying vec3 vo;uniform float clip;uniform vec3 eye;uniform vec3 col;uniform float kind;uniform float mir;uniform vec3 acc;uniform float alpha;uniform float lights;uniform float hl;uniform float time;uniform float f1;uniform float envm;uniform vec3 sunD;uniform float lsc;uniform float drive;uniform float brake;
  uniform vec3 uFog;uniform vec3 uTop;uniform vec4 uSw;uniform float uD;uniform sampler2D tlT;
  float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  float vn2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),f.x),f.y);}
  vec3 sunC(){return vec3(.80,.84,.90)*uSw.x+vec3(1.12,.98,.78)*uSw.y+vec3(1.10,.80,.52)*uSw.z+vec3(.88,.92,1.02)*uSw.w;}
  // roulage de jour : le vrai ciel, les nuages, les arbres et la route qui défilent se reflètent dans la carrosserie
  vec3 envD(vec3 d){float h=d.y;vec3 sky=mix(uFog,uTop,pow(max(h,0.),.5));float sd=max(dot(d,sunD),0.);
    sky+=vec3(1.,.82,.58)*(pow(sd,900.)*16.+pow(sd,14.)*.30+pow(sd,3.)*.10)*(1.-.6*uSw.w-.85*uSw.x)*sunC();
    if(h>0.){vec2 uv=d.xz/(h+.06)*.9+vec2(time*.003,0.);float cl=vn2(uv*1.3)*.55+vn2(uv*2.7)*.3+vn2(uv*5.5)*.15;
      cl=smoothstep(.50-.30*uSw.x+.10*uSw.y,.80-.25*uSw.x,cl)*smoothstep(0.,.22,h);sky=mix(sky,mix(vec3(.62,.62,.66),vec3(1.,.96,.90),.45+.55*sd),cl*.85);}
    vec3 c=sky;
    vec2 dh=normalize(d.xz+vec2(1e-5,0.));float R=30.;vec2 P=dh*R;float side=P.x+1.5;float cor=smoothstep(7.,14.,abs(side));
    float wz=P.y-uD;float H=(2.5+5.5*vn2(vec2(wz*.06,sign(side)*31.))+2.*vn2(vec2(wz*.23,sign(side)*7.)))*cor;
    if(h<(H-.6)/R&&h>-.03){vec3 lc=(vec3(.30,.50,.16)*uSw.x+vec3(.17,.33,.09)*uSw.y+vec3(.70,.42,.10)*uSw.z+vec3(.30,.27,.23)*uSw.w)*(.6+.5*vn2(vec2(wz*1.3,h*80.)));
      float lit=max(dot(normalize(vec3(-P.x,0.,-P.y)),sunD),0.);c=lc*(vec3(.42,.47,.55)+sunC()*.7*lit*(1.-.55*uSw.x));c=mix(c,uFog,.30);}
    if(h<0.){float t=-.62/min(h,-.002);vec2 g=d.xz*t;float gz=g.y-uD;float r=abs(g.x+1.5);vec3 gc;
      if(r<3.05){gc=vec3(.085,.084,.088)*(.9+.25*vn2(vec2(g.x,gz)*.5));float dash=step(mod(gz,12.),3.)*step(r,.065);float edge=step(abs(r-2.82),.065)*step(mod(gz,15.),11.);gc=mix(gc,vec3(.78),max(dash,edge));}
      else gc=(vec3(.36,.55,.18)*uSw.x+vec3(.50,.53,.25)*uSw.y+vec3(.42,.44,.19)*uSw.z+vec3(.80,.82,.86)*uSw.w)*(.8+.3*vn2(vec2(g.x,gz)*.2));
      gc*=vec3(.42,.47,.55)*.9+sunC()*.62*(1.-.55*uSw.x);c=mix(gc,uFog,1.-exp(-t*.012));}
    return c;}
  // roulage de nuit : forêt noire, route éclairée par les phares, lueur des feux arrière
  vec3 envN(vec3 d){float h=d.y;vec3 c=mix(vec3(.030,.036,.06),vec3(.006,.008,.016),smoothstep(0.,.7,h));
    c+=vec3(.9,.92,.86)*smoothstep(.9992,.9997,dot(d,normalize(vec3(.35,.42,-.84))))*3.;
    vec2 dh=normalize(d.xz+vec2(1e-5,0.));float R=10.;vec2 P=dh*R;float side=P.x+1.5;float cor=smoothstep(4.,6.5,abs(side));
    float wz=P.y-uD;float H=(8.+6.*vn2(vec2(wz*.15,sign(side)*31.)))*cor;if(h<(H-.6)/R&&h>-.03)c=vec3(.004,.006,.006);
    if(h<0.){float t=-.62/min(h,-.002);vec2 g=d.xz*t;float gz=g.y-uD;float r=abs(g.x+1.5);vec3 gc=r<3.05?vec3(.085,.084,.088):vec3(.05,.07,.035);
      if(r<3.05){float dash=step(mod(gz,12.),3.)*step(r,.065);float edge=step(abs(r-2.82),.065)*step(mod(gz,15.),11.);gc=mix(gc,vec3(.8),max(dash,edge));}
      float beam=smoothstep(-1.6,-4.,g.y)*exp(-g.x*g.x/(4.+abs(g.y)*.5))/(1.+g.y*g.y*.0016)*min(lights,1.);
      vec2 tq=(g-vec2(0.,2.6))*vec2(1.2,.9);c=gc*(.02+beam*2.2)+vec3(.6,.02,.02)*exp(-dot(tq,tq)*.9)*.15*(.3+brake);c=mix(c,vec3(.004,.005,.008),1.-exp(-t*.03));}
    return c*1.4;}
  vec3 env(vec3 d,float ka){
    if(envm>.5&&envm<1.5)return envD(d);
    if(envm>1.5)return envN(d);
    float h=d.y;vec3 c=mix(vec3(.035,.035,.04),vec3(.15,.15,.17),smoothstep(-.25,.6,h));
    c+=vec3(1.)*smoothstep(.80,.9,h)*1.5;
    float az=atan(d.x,d.z);
    float band=smoothstep(-.05,.22,h)*smoothstep(.72,.42,h);
    c+=vec3(.95,.97,1.)*smoothstep(.07,.0,abs(sin(az+.9)))*band*1.1;
    c+=vec3(.95,.97,1.)*smoothstep(.06,.0,abs(sin(az-.9)))*band*.75;
    c+=acc*smoothstep(.05,.0,abs(h+.02))*.7*ka;
    return c;}
  vec3 envS(vec3 d){
    float h=d.y;float az=atan(d.x,d.z);
    vec3 c=mix(vec3(.030,.030,.033),vec3(.010,.010,.012),smoothstep(.0,.7,h));
    c+=vec3(.20,.20,.21)*exp(-pow(h*14.,2.));
    vec2 t=d.xz/max(h,.02);
    float top=smoothstep(.0,.06,h)*(1.-smoothstep(1.,1.08,abs(t.x)/.9))*(1.-smoothstep(1.,1.05,abs(t.y)/2.));
    c+=vec3(2.6,2.55,2.5)*top;
    float s1=smoothstep(.16,.05,abs(sin((az-1.25)*.5)))*smoothstep(.02,.10,h)*smoothstep(.66,.50,h);
    float s2=smoothstep(.16,.05,abs(sin((az+1.25)*.5)))*smoothstep(.02,.10,h)*smoothstep(.66,.50,h);
    float s3=smoothstep(.06,.02,abs(sin((az-3.14159)*.5)))*smoothstep(.04,.12,h)*smoothstep(.5,.38,h);
    c+=vec3(3.0,2.97,2.92)*(s1+s2*.85)+vec3(1.6)*s3;
    c+=vec3(.16,.16,.17)*smoothstep(.0,.04,h)*smoothstep(.35,.08,h);
    c+=vec3(.06)*smoothstep(.2,.95,h);
    c=mix(c,vec3(.022,.021,.024)+vec3(.05)*exp(-pow((h+.05)*10.,2.)),smoothstep(.0,-.06,h));
    return c;}
  vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
  float ggx(float nh,float r){float a=r*r;float a2=a*a;float d=nh*nh*(a2-1.)+1.;return a2/(3.14159*d*d);}
  bool inDoor(vec3 o){float zf=o.y>1.03?-0.55+(o.y-1.03)*1.316:-0.585;return o.x<-0.60&&o.y>0.34&&o.y<1.395&&o.z<0.345&&o.z>zf;}
  void main(){
    if(clip>0.5){bool d=inDoor(vo);if(clip<1.5&&d)discard;if(clip>1.5&&!d)discard;}
    float kd=kind;
    if(kd>16.5&&kd<17.5)kd=(vo.y>.972&&abs(vo.x)>.685)?0.:4.;                                      // portières avant
    if(kd<.5&&vo.z>1.72&&abs(vo.x)<0.57&&vo.y<0.435-(abs(vo.x)>.545?.025-sqrt(max(0.,.000625-pow(abs(vo.x)-.545,2.))):0.))kd=4.;   // diffuseur noir mat, bord net
    if(kd<.5&&vo.z<-1.45){float ax=abs(vo.x);
      if(ax<.36&&vo.y>.32&&vo.y<.735&&vo.z>-1.80)kd=4.;                                   // fond de calandre noir
      if(ax>.40&&ax<.75&&vo.y>.31&&vo.y<.53){float y=vo.y;                              // cavité d'antibrouillard (profondeur / surface du bouclier)
        float zf=(-2.32941)+(2.73655)*ax+(-0.20543)*y+(-5.34326)*ax*ax+(0.76647)*ax*y+(0.16750)*y*y+(4.18039)*ax*ax*ax+(-0.94086)*ax*ax*y;
        if(vo.z-zf>.012)kd=4.;}
    }
    if(kd>3.5&&kd<4.5&&vo.z<-1.45&&vo.y>.33&&vo.y<.52){float ax=abs(vo.x);float d=length(vec2(ax-.62,vo.y-.41));   // antibrouillards
      if(d<.051)kd=14.;else if(d<.064)kd=16.;}
    vec3 N=normalize(vn);vec3 V=normalize(eye-vp);if(dot(N,V)<0.)N=-N;
    vec3 R=reflect(-V,N);float nv=max(dot(N,V),0.);
    vec3 L=envm>.5&&envm<1.5?sunD:normalize(vec3(.35,.9,.25));vec3 em=vec3(0.);float dif=max(dot(N,L),0.);float hemi=.5+.5*N.y;
    vec3 c;float a=1.;
    if((mir<.5||drive>.5)&&(kd<4.5||(kd>5.5&&kd<7.5)||(kd>12.5&&kd<13.5)||kd>15.5)){
      vec3 vpa=vec3(vp.x,abs(vp.y),vp.z);
      if(kd>17.5&&kd<18.5){vec2 g=vec2(vo.x,vo.y)*150.;vec2 f=fract(g)-.5;float dm=exp(-dot(f,f)*14.);N=normalize(N+vec3(f.x,f.y,0.)*dm*1.4);R=reflect(-V,N);nv=max(dot(N,V),0.);}
      bool st=envm<.5,dy=envm>.5&&envm<1.5;
      vec3 Ls=dy?sunD:normalize(vec3(.25,1.,.15));vec3 H=normalize(Ls+V);float nl=max(dot(N,Ls),0.);float nh=max(dot(N,H),0.);
      float ao=mix(.45,1.,smoothstep(.12,.62,vpa.y));
      vec3 wc=vec3(vpa.x<0.?-.711:.711,.331,vpa.z<.1?-1.067:1.319);float wd=length(vec2(vpa.y-wc.y,vpa.z-wc.z));
      ao*=mix(.55,1.,smoothstep(.30,.48,wd)+step(.82,abs(vpa.x)));
      vec3 irr=vec3(.06)+vec3(.62,.62,.64)*pow(smoothstep(-.35,1.,N.y),1.6)+vec3(.05)*max(-N.y,0.);
      if(dy){irr=vec3(.10,.11,.12)+vec3(.34,.40,.50)*smoothstep(-.4,1.,N.y)+vec3(.10,.09,.07)*max(-N.y,0.);nl*=1.25;}
      if(!st&&!dy){irr=vec3(.05,.065,.10)*(.55+.45*N.y);nl*=.05;}
      vec3 E=st?envS(R):env(R,1.)*(dy?.9:2.2);float F=.04+.96*pow(1.-nv,5.);
      float axm=abs(vo.x);int mg=0;
      if(kd<.5&&axm>.74&&vo.y>.95&&vo.z>-.45&&vo.z<-.30&&normalize(vn).z>.40){float se=pow(abs(axm-.858)/.090,4.)+pow(abs(vo.y-1.054)/.071,4.);float lb=vo.y-(.976+max(0.,axm-.83)*.35);
        if(se<1.&&lb>0.)mg=2;else if(se<1.28&&lb>-.009)mg=1;}
      if(mg==2){vec3 Rm=reflect(-V,normalize(N+vec3(axm-.858,vo.y-1.054,0.)*.35));vec3 Em=st?envS(Rm):env(Rm,1.)*(dy?.9:2.2);       // miroir : légèrement bombé, presque parfait
        c=Em*vec3(.82,.86,.92)+vec3(.004)+vec3(1.)*ggx(max(dot(N,H),0.),.04)*nl*.004;
      } else if(mg==1){
        c=vec3(.014,.014,.016)*(irr*1.2+nl*.6)*ao+E*(.012+F*.4)+vec3(.2)*ggx(nh,.45)*nl*.02;                                   // joint noir du miroir
      } else if(kd<.5){
        vec3 alb=col*.92;
        vec3 dif=alb*(irr*.9+vec3(1.,.98,.96)*nl*.62)*ao;
        vec3 sp=mix(vec3(1.),col,.5)*ggx(nh,.42)*nl*.06;
        vec3 Np=normalize(N+(vec3(vn2(vo.xy*60.),vn2(vo.yz*60.+3.),vn2(vo.zx*60.+7.))-.5)*.010);vec3 Rp=reflect(-V,Np);   // vernis : légère peau d'orange
        vec3 Ep=st?envS(Rp):env(Rp,1.)*(dy?.9:2.2);
        c=dif*(1.-F)*(st?1.:.93)+sp+Ep*(F*.95+(st?.03:.085))*mix(1.,ao,.6);
        if(dy)c+=sunC()*ggx(max(dot(Np,H),0.),.07)*nl*.006*(1.-.8*uSw.x);
      } else if(kd<1.5){
        c=vec3(.018)*(irr+nl*.5)*ao+E*(.015+.12*pow(1.-nv,4.))+vec3(.25)*ggx(nh,.6)*nl*.02;
      } else if(kd<2.5){
        vec3 m=col*vec3(.62,.63,.66);float Fm=.55+.45*pow(1.-nv,5.);
        c=m*(irr*.45+nl*.3)*ao+max(E,vec3(.07))*m*Fm*1.3+ggx(nh,.3)*nl*m*.1;
      } else if(kd<3.5){
        c=vec3(.004,.005,.007)+E*(F*.9+.02);a=mix(.86,.98,F);
      } else if(kd<4.5){
        c=vec3(.016,.016,.018)*(irr*1.2+nl*.6)*ao+E*(.012+F*.35)+vec3(.2)*ggx(nh,.55)*nl*.015;
      } else if(kd<6.5){
        float ax=abs(vo.x);vec2 q=vec2(clamp(vo.z-1.30,0.,.55)+max(0.,.775-ax),vo.y);
        vec3 Sd=mix(vec3(-sign(vo.x),0.,0.),vec3(0.,0.,1.),smoothstep(.70,.77,ax));
        float de=texture2D(tlT,vec2(q.x/.86,(q.y-.75)/.305)).r*72.25;                                  // distance au contour, en mm
        vec3 Dv=-V*(.020/max(nv,.35));vec2 qi=q+vec2(dot(Dv,Sd),Dv.y);                                   // on regarde « dans » le feu : parallaxe
        float di=texture2D(tlT,vec2(qi.x/.86,(qi.y-.75)/.305)).r*72.25;
        bool clr=qi.y<.848&&qi.x>.56;float dcam=length(eye-vp);float fine=1.-smoothstep(1.2,3.5,dcam);
        vec2 fg=qi*58.;vec2 ff=fract(fg)-.5;vec3 Nf=normalize(N+(Sd*ff.x+vec3(0.,ff.y,0.))*.35*fine+(vec3(vn2(qi*30.),0.,vn2(qi*30.+5.))-.5)*.25);
        vec3 inner=(st?envS(reflect(-V,Nf)):env(reflect(-V,Nf),1.)*(dy?.9:2.2))*.42*(.85+.15*hs(floor(fg)));         // réflecteur facetté
        inner*=1.-.45*smoothstep(.40,.49,max(abs(ff.x),abs(ff.y)))*fine;
        float r1=length(qi-vec2(.63,.945))/.050,r2=length(qi-vec2(.37,.925))/.036,r3=length(qi-vec2(.67,.822))/.030;
        vec2 cc=vec2(.63,.945);float rr=r1;if(r2<rr){rr=r2;cc=vec2(.37,.925);}if(r3<rr){rr=r3;cc=vec2(.67,.822);}
        float cup=0.;
        if(rr<1.){vec2 rd=normalize(qi-cc+vec2(1e-5,0.));vec3 Nc=normalize(N*.7-(Sd*rd.x+vec3(0.,rd.y,0.))*rr*1.1);
          vec3 Ec=st?envS(reflect(-V,Nc)):env(reflect(-V,Nc),1.)*(dy?.9:2.2);inner=Ec*.85*(.78+.22*sin(rr*40.));             // cuvette chromée, cercles concentriques
          if(rr<.26)inner=vec3(.6,.6,.57)*(irr*.4+nl*.3)+Ec*.45;                                                           // ampoule
          inner*=.35+.65*smoothstep(1.,.88,rr);cup=1.-smoothstep(.82,1.,rr);}
        float wall=smoothstep(10.,3.,di);inner=mix(inner,vec3(.018,.018,.02)*(irr+nl*.4),wall*.85);                         // parois sombres du boîtier
        inner*=clr?vec3(.90,.90,.93):vec3(.92,.045,.05);
        vec3 emi=clr?vec3(0.):vec3(1.,.06,.05)*(lights*(.22+1.2*cup*(rr<.26?1.7:1.))+brake*(1.0+1.8*cup))*(1.-wall*.6);
        float rib=sin(q.x*520.)*.5*fine;vec3 Nl=normalize(N+Sd*rib*.02);vec3 El=st?envS(reflect(-V,Nl)):env(reflect(-V,Nl),1.)*(dy?.9:2.2);
        float Fl=.04+.96*pow(1.-max(dot(Nl,V),0.),5.);
        c=inner*(1.-Fl)+El*(Fl*.95+.02)+vec3(1.)*ggx(max(dot(Nl,H),0.),.10)*nl*.05+emi;
        c=mix(c,vec3(.012,.012,.013)*(irr+nl*.5)+E*F*.3,smoothstep(4.5,2.5,de));                                          // joint noir au contour
      } else if(kd<7.5){
        float t=clamp((vo.z-1.755)/.135,0.,1.);float rad=length(vec2(abs(vo.x)-.437,vo.y-.363));
        vec3 ti=mix(vec3(.66,.55,.32),vec3(.50,.30,.66),smoothstep(.0,.30,t));ti=mix(ti,vec3(.18,.36,.86),smoothstep(.28,.70,t));      // titane brûlé : doré, violet, puis bleu métal
        float ang=atan(vo.y-.363,abs(vo.x)-.437);
        vec3 Nb=normalize(N+vec3(0.,0.,1.)*(vn2(vec2(ang*30.,vo.z*1400.))-.5)*.10);                                              // brossage circulaire
        vec3 Rb=reflect(-V,Nb);vec3 Eb=st?envS(Rb):env(Rb,1.)*(dy?.9:2.2);vec3 Fm=ti+(1.-ti)*pow(1.-max(dot(Nb,V),0.),5.);
        c=Eb*Fm*.92+ti*irr*.05+ggx(max(dot(Nb,H),0.),.16)*nl*ti*.5;
        if(rad<.0372)c*=mix(.10,.85,smoothstep(1.80,1.886,vo.z));                                                                 // intérieur noirci par la suie
      } else if(kd<13.5){
        c=vec3(.012)*(irr+nl*.5)+E*(.04+.8*F)+vec3(.01)*sin(vp.x*400.)*sin(vp.z*400.);
      } else if(kd>17.5&&kd<18.5){
        vec3 m=col;c=m*(irr*.55+nl*.45)*ao+E*m*(.25+.6*F)+ggx(nh,.35)*nl*.25;
      } else if(kd>18.5){
        c=col*(irr*.85+nl*.75)*ao+E*col*(.06+.45*F)+ggx(nh,.5)*nl*col*.35;
      } else {
        vec3 ch=vec3(.78,.79,.82);c=E*ch*(.75+.25*F)+ch*irr*.04;
      }
      c*=(st||dy)?lsc:1.;c=st?aces(c*1.15):aces(c*.62);if(envm>.5&&envm<1.5)c*=vec3(1.02,.99,.95);
      if(mir>.5)c*=1.-smoothstep(0.,1.25,-vp.y);
      gl_FragColor=vec4(pow(c,vec3(1./2.2)),a*alpha);return;
    }
    if(kd<.5){ float f=.04+.96*pow(1.-nv,5.);
      vec3 base=col*(.28+.42*hemi+.42*dif); base*=mix(vec3(1.),vec3(.97,.96,1.03),pow(1.-nv,2.));
      c=base*(1.-f*.55)+env(R,1.)*(.08+f*.85);
      c+=acc*pow(1.-nv,4.)*.35*smoothstep(.2,-.6,dot(N,normalize(vec3(eye.x,0.,eye.z)))); }
    else if(kd<1.5){ c=vec3(.022)*(.4+hemi)+env(R,1.)*.035*pow(1.-nv,2.); }
    else if(kd<2.5){ float f=.5+.5*pow(1.-nv,3.);c=col*(.42+.25*hemi+.35*dif)+max(env(R,0.),vec3(.12))*col*f*.7; }
    else if(kd<3.5){ float f=.08+.92*pow(1.-nv,4.);c=vec3(.01,.012,.016)*.5+env(R,1.)*f;a=mix(.55,.95,f);if(drive>.5){c=vec3(.010,.012,.016)+env(R,1.)*(.10+.8*f);a=1.;} }
    else if(kd<4.5){ float f=.03+.3*pow(1.-nv,4.);c=vec3(.02)*(.55+hemi)+env(R,0.)*f*.15; }
    else if(kd<5.5){ float f=.35+.65*pow(1.-nv,2.);c=vec3(.10,.105,.11)*(.4+dif)+env(R,1.)*f*.9; }
    else if(kd<6.5){ float f=.05+.9*pow(1.-nv,4.);c=vec3(.50,.02,.035)*(.35+.55*dif)+env(R,1.)*f*.55;em=vec3(.9,.05,.06)*lights*.9+vec3(1.4,.05,.06)*brake*1.3; }
    else if(kd<7.5){ float f=pow(1.-nv,1.5);vec3 ti=mix(vec3(.10,.17,.55),vec3(.30,.16,.50),f);c=ti*(.25+.35*dif)+max(env(R,0.),vec3(.06))*ti*.9; }
    else if(kd<8.5){ float f=.35+.65*pow(1.-nv,3.);c=acc*(.22+.5*dif)+env(R,1.)*acc*f*.9+acc*.1; }
    else if(kd<9.5){ c=col*(.25+.45*hemi+.35*dif)+env(R,1.)*.04*pow(1.-nv,3.); }
    else if(kd<10.5){ float f=.06+.94*pow(1.-nv,4.);c=env(R,1.)*f*.9;em=vec3(.95,.97,1.)*lights*1.4;a=mix(.25,.9,f);a=max(a,lights*.85); }
    else if(kd<11.5){ float f=.1+.5*pow(1.-nv,3.);c=vec3(.55,.04,.05)*(.3+.6*dif)+env(R,1.)*f*.5; }
    else if(kd<12.5){ em=col*(1.3+.25*sin(time*3.));if(col.r>.8&&col.g<.2)em*=f1>.5?step(.5,fract(time*1.6))*.95+.05:.45;c=vec3(0.); }      // lumière / écran
    else if(kd<13.5){ float f=.1+.9*pow(1.-nv,4.);c=vec3(.02)*(.5+hemi)+env(R,1.)*f*.7+vec3(.01)*sin(vp.x*400.)*sin(vp.z*400.); } // carbone
    else if(kd<14.5){ float rr=length(vec2(abs(vo.x)-.615,vo.y-.41));float f=.25+.75*pow(1.-nv,3.);c=vec3(.30,.31,.33)*(.35+.5*dif)*(.6+.4*smoothstep(.0,.05,rr))+env(R,0.)*f*1.1;em=vec3(1.,.96,.88)*lights*1.3*smoothstep(.05,.0,rr); } // optique antibrouillard
    else if(kd<15.5){ em=vec3(1.05,1.12,1.25)+vec3(.2)*lights;c=vec3(0.); } // LED de jour
    else { float f=.5+.5*pow(1.-nv,3.);vec3 ch=vec3(.78,.79,.82);c=ch*(.35+.25*hemi+.3*dif)+max(env(R,0.),vec3(.12))*ch*f*.9; } // cerclage chromé
    c=c*lsc+em;if(envm>.5&&envm<1.5)c*=vec3(1.03,.99,.93);
    if(mir>0.5){ c*=.2; }
    c=c/(1.+c*.15);
    gl_FragColor=vec4(pow(c,vec3(1./1.6)),a*alpha);}`;
  const BG_VS = `attribute vec2 p;varying vec2 q;void main(){q=p;gl_Position=vec4(p,.999,1.);}`;
  const BG_FS = `precision highp float;varying vec2 q;uniform vec3 acc;uniform float aspect;uniform float time;uniform vec3 cr;uniform vec3 cu;uniform vec3 cf;uniform float th;uniform float night;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float adist(float a,float b){return acos(clamp(cos(a-b),-1.,1.));}
    void main(){
      // fond calculé dans la direction du regard : continu quelle que soit la rotation de la caméra
      vec3 d=normalize(cf+q.x*aspect*th*cr+q.y*th*cu);float h=d.y;float az=atan(d.x,d.z);
      // studio photo : cyclorama gris neutre, lumière douce, très léger reflet de la couleur du site
      vec3 c=mix(vec3(.060,.060,.064),vec3(.010,.010,.012),smoothstep(-.02,.75,h));
      c+=vec3(.10,.10,.105)*exp(-pow(h*6.,2.))*(.75+.25*cos(az));
      c+=acc*.018*exp(-pow((h-.08)*4.,2.));
      c+=vec3(.9,.9,.95)*smoothstep(.6,1.,h)*.025;
      c=mix(c,vec3(.032,.032,.035)+vec3(.05)*exp(-pow(h*12.,2.)),smoothstep(.0,-.06,h));
      c*=1.-.70*night;c+=vec3(.003,.0045,.009)*night;
      float vg=smoothstep(1.8,.35,length(q*vec2(aspect*.5,1.)));c*=.6+.4*vg;
      c+=(hash(q*vec2(913.,577.)+fract(time))-.5)*.004;
      c=pow(c,vec3(.92));
      gl_FragColor=vec4(c,1.);}`;
  const FLOOR_VS = `attribute vec2 p;uniform mat4 VP;varying vec2 q;void main(){q=p;gl_Position=VP*vec4(p.x,0.,p.y,1.);}`;
  const FLOOR_FS = `precision highp float;varying vec2 q;uniform vec3 acc;uniform vec3 bg;uniform float night;uniform float lights;uniform float lift;uniform float time;
    void main(){float r=length(q*vec2(1.,.62));
      float sh=smoothstep(2.3,.3,length(q*vec2(1.22,.52)));
      // sol de studio satiné : gris sombre, flaque de lumière sous le softbox, ombre de contact douce
      vec3 c=vec3(.030,.030,.033)+vec3(.085,.085,.09)*exp(-r*r*.09);
      c=mix(c,c*.25,sh*.9);
      float cs=0.;for(int i=0;i<4;i++){vec2 wp=vec2(i<2?-.70:.70,(i==0||i==2)?-1.067:1.319);vec2 e=(q-wp)*vec2(4.2,2.6);cs+=exp(-dot(e,e));}
      c*=1.-.75*clamp(cs,0.,1.);
      vec2 body=q*vec2(1.25,.55);c*=1.-.55*exp(-dot(body,body)*1.6);
      c+=acc*.012*exp(-r*r*.05);
      c*=1.-.69*night;
      vec2 l1=(q-vec2(-.55,-3.4))*vec2(1.6,.45), l2=(q-vec2(.55,-3.4))*vec2(1.6,.45);
      c+=vec3(.9,.92,1.)*lights*(exp(-dot(l1,l1)*2.2)+exp(-dot(l2,l2)*2.2))*.55*smoothstep(-1.9,-2.6,q.y);
      vec2 tl=(q-vec2(0.,2.3))*vec2(.8,1.2); c+=vec3(.9,.05,.08)*lights*exp(-dot(tl,tl)*3.)*.25;
      float a=mix(.97,.90,smoothstep(5.,1.,r));
      a*=smoothstep(11.,6.,r);
      c=pow(c,vec3(.92));
      gl_FragColor=vec4(c,a);}`;
  const XS = `precision highp float;varying vec3 vn;varying vec3 vp;uniform vec3 eye;uniform vec3 acc;uniform float k;uniform float time;
    void main(){vec3 N=normalize(vn);vec3 V=normalize(eye-vp);float nv=abs(dot(N,V));
      float rim=pow(1.-nv,1.6);float pulse=.75+.25*sin(time*5.);
      vec3 c=acc*(.12+1.1*rim)*k*pulse+vec3(1.)*pow(rim,4.)*.25*k;
      gl_FragColor=vec4(c,1.);}`;
  // ================= MODE ROULAGE : décors qui défilent autour de la voiture =================
  // La voiture reste à l'origine (avant vers -z) ; le monde défile vers +z de D mètres.
  // Tout est périodique sur P = 4800 m pour que D puisse boucler sans couture.
  const ENV_COMMON = `
  uniform float D;uniform float mode;uniform float time;uniform vec3 eye;uniform vec3 sunD;uniform vec3 fogC;uniform float fogK;uniform float hlI;uniform float tlI;uniform float brake;
  uniform float cw0;uniform float dcw0;uniform float lift;uniform vec4 sw;   // poids des saisons : printemps, été, automne, hiver
  vec3 leafPal(float v){                                                    // feuillage selon la saison
    vec3 sp=(v>.70&&v<.80)?mix(vec3(.96,.80,.88),vec3(1.,.97,.94),fract(v*37.)):mix(vec3(.34,.58,.17),vec3(.50,.70,.23),v);
    vec3 su=mix(vec3(.15,.34,.09),vec3(.26,.46,.13),v);
    vec3 au=v<.5?mix(vec3(.78,.40,.08),vec3(.88,.66,.16),v*2.):(v<.85?mix(vec3(.62,.22,.07),vec3(.50,.36,.13),(v-.5)/.35):vec3(.36,.40,.13));
    vec3 wi=mix(vec3(.25,.21,.18),vec3(.33,.29,.25),v);
    return sp*sw.x+su*sw.y+au*sw.z+wi*sw.w;}
  vec3 grassPal(float n){return mix(vec3(.30,.50,.16),vec3(.40,.58,.20),n)*sw.x+mix(vec3(.46,.50,.22),vec3(.56,.56,.28),n)*sw.y+mix(vec3(.34,.40,.16),vec3(.46,.46,.20),n)*sw.z+mix(vec3(.34,.33,.24),vec3(.40,.38,.28),n)*sw.w;}
  vec3 snowy(vec3 c,float k){return mix(c,vec3(.90,.92,.97),clamp(k,0.,1.));}
  vec3 sunCol(){return vec3(.80,.84,.90)*sw.x+vec3(1.12,.98,.78)*sw.y+vec3(1.10,.80,.52)*sw.z+vec3(.88,.92,1.02)*sw.w;}     // lumière du soleil selon la saison
  vec3 ambCol(){return vec3(.50,.55,.62)*sw.x+vec3(.44,.52,.66)*sw.y+vec3(.46,.44,.48)*sw.z+vec3(.56,.62,.74)*sw.w;}
  vec3 grade(vec3 c){float l=dot(c,vec3(.3,.59,.11));                                                             // étalonnage : chaque saison a sa couleur
    float sat=1.05*sw.x+1.28*sw.y+1.22*sw.z+.62*sw.w;vec3 t=vec3(.94,1.02,1.0)*sw.x+vec3(1.06,1.02,.90)*sw.y+vec3(1.10,.95,.80)*sw.z+vec3(.92,.98,1.10)*sw.w;
    sat=mix(1.,sat,.45);t=mix(vec3(1.),t,.6);return max(mix(vec3(l),c,sat)*t,0.);}
  const float RC=-1.5;const float PER=4800.;const float F0=0.00130900;
  float cR(float w){float e=.5+.5*sin(F0*5.*w+.7);return 14.*sin(F0*24.*w)*e*e+30.*sin(F0*3.*w+2.);}
  float bendX(float wz,float z){return cR(wz)-cw0-dcw0*z;}            // la route tourne : le monde se courbe autour de la voiture
  float hsh(vec2 p){p=mod(p,vec2(1024.,4096.));return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  float vn(vec2 p,float per){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float y0=mod(i.y,per),y1=mod(i.y+1.,per);
    float a=hsh(vec2(i.x,y0)),b=hsh(vec2(i.x+1.,y0)),c=hsh(vec2(i.x,y1)),d=hsh(vec2(i.x+1.,y1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
  float hgt(float x,float wz){float r=abs(x-RC);
    float ditch=-.42*smoothstep(3.7,4.5,r)*(1.-smoothstep(5.0,6.4,r));
    if(mode>1.5){float A=smoothstep(6.,30.,r);return ditch+A*(sin(wz*F0*38.+x*.03)*1.3+sin(wz*F0*99.-x*.07)*.6+sin(x*.05)*.8);}
    float A=smoothstep(7.,95.,r);
    return ditch+A*(sin(wz*F0*8.+x*.006)*9.+sin(wz*F0*21.-x*.017+1.3)*4.+sin(x*.012+2.)*6.+sin(wz*F0*47.+x*.031)*1.5);}
  // phares (pleins phares, sur route de nuit) : deux projecteurs à l'avant de la voiture
  float hlRaw(vec3 p){float s=0.;for(int i=0;i<2;i++){vec3 L=vec3(i==0?-.56:.56,.66,-1.80);vec3 d=p-L;float r=length(d);
      float c=dot(d/r,normalize(vec3(i==0?-.03:.05,-.04,-1.)));s+=smoothstep(.83,.975,c)*(1.+.6*smoothstep(.96,.995,c))/(1.+r*r*.0016);}return s*hlI;}
  vec3 headl(vec3 p,vec3 n){vec3 a=vec3(0.);for(int i=0;i<2;i++){vec3 L=vec3(i==0?-.56:.56,.66,-1.80);vec3 d=p-L;float r=length(d);vec3 dn=d/r;
      float c=dot(dn,normalize(vec3(i==0?-.03:.05,-.04,-1.)));float lam=sqrt(max(dot(n,-dn),0.))*.7+.3;
      a+=vec3(1.,.94,.84)*smoothstep(.83,.975,c)*(1.+.6*smoothstep(.96,.995,c))*lam/(1.+r*r*.0016);}
    // feux arrière (et stop) sur la route derrière
    vec2 q=(p.xz-vec2(0.,2.4))*vec2(1.2,.9);float tr=exp(-dot(q,q)*.9)*(tlI*.05+brake*.45);a+=vec3(1.,.05,.03)*tr*max(n.y,0.);
    return a*hlI;}
  // brume éclairée par les phares : on échantillonne la lumière le long du rayon de vue
  vec3 scat(vec3 p,vec2 fc){if(mode<1.5||hlI<.01)return vec3(0.);vec3 d=p-eye;float L=min(length(d),55.);vec3 dir=normalize(d);float j=fract(52.9829189*fract(dot(fc,vec2(.06711056,.00583715))));float s=0.;
    for(int i=0;i<12;i++){float t=(float(i)+j)/12.*L;s+=hlRaw(eye+dir*t);}return vec3(1.,.95,.86)*s*L/12.*.0062;}
  vec3 fogit(vec3 c,float dist,vec3 p){float f=1.-exp(-dist*fogK);if(mode<1.5){f*=1.-.35*smoothstep(10.,60.,p.y);vec3 vd=normalize(p-eye);
      vec3 fc=fogC*mix(vec3(.96,.99,1.04),vec3(1.06,1.0,.92),pow(max(dot(vd,sunD),0.),3.))+sunCol()*pow(max(dot(vd,sunD),0.),12.)*.18;return mix(c,fc,f);}return mix(c,fogC,f)*.78;}   // nuit un peu plus noire
  vec3 skyC(vec3 d){float h=d.y;vec3 top=vec3(.42,.48,.56)*sw.x+vec3(.12,.36,.82)*sw.y+vec3(.34,.44,.66)*sw.z+vec3(.60,.65,.72)*sw.w;   // ciel simplifié, pour les reflets
    vec3 c=mix(fogC,top,pow(max(h,0.),.5));float sd=max(dot(d,sunD),0.);c+=vec3(1.,.82,.58)*(pow(sd,400.)*6.+pow(sd,14.)*.30+pow(sd,3.)*.10)*(1.-.6*sw.w-.85*sw.x)*sunCol();
    return mix(c,fogC*.55,smoothstep(.02,-.10,h));}
  vec3 tone(vec3 c){c*=.5;c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);return pow(c,vec3(1./2.2));}
  `;
  const TER_VS = `attribute vec2 g;uniform mat4 VP;uniform float cell;varying vec3 wp;varying vec3 nn;varying float wzv;varying float uu;` + ENV_COMMON + `
  void main(){float z=g.y+mod(D,cell);float wz=z-D;float y=hgt(g.x,wz);float e=.8;
    nn=normalize(vec3(hgt(g.x-e,wz)-hgt(g.x+e,wz),2.*e,hgt(g.x,wz-e)-hgt(g.x,wz+e)));
    wp=vec3(g.x+bendX(wz,z),y,z);uu=g.x;wzv=wz;gl_Position=VP*vec4(wp,1.);}`;
  const TER_FS = `precision highp float;varying vec3 wp;varying vec3 nn;varying float wzv;varying float uu;uniform float rfl;` + ENV_COMMON + `
  float FD;
  vec3 field(float x,float wz,float id){float t=hsh(vec2(id,7.));float u=x*.9;float w=wz;float va=hsh(vec2(id,3.));
    float g=vn(vec2(x,w)*.05,PER*.05);
    if(t<.26){float f=mix(.5+.5*sin(u*3.1+vn(vec2(x,w)*.08,PER*.08)*2.),.5,FD);vec3 au=mix(vec3(.25,.16,.10),vec3(.36,.25,.16),f)*(.85+.3*vn(vec2(x,w)*.03,PER*.03));   // labours
      return mix(au,vec3(.30,.42,.15),.3*step(.72,f))*sw.x+mix(vec3(.78,.64,.32),vec3(.86,.74,.42),f*.5+.5*g)*sw.y+au*(sw.z+sw.w);}
    if(t<.50){float f=mix(.5+.5*sin(u*2.4),.5,FD);vec3 au=mix(vec3(.66,.54,.30),vec3(.78,.66,.40),f*.6+.4*g);                       // céréales
      return mix(vec3(.30,.48,.14),vec3(.40,.57,.18),f*.5+.5*g)*sw.x+mix(vec3(.80,.66,.34),vec3(.90,.78,.46),f*.5+.5*g)*sw.y+au*sw.z+mix(au,vec3(.36,.30,.22),.5)*sw.w;}
    if(t<.68){float f=mix(.5+.5*sin(u*2.0),.5,FD);float n=vn(vec2(x,w)*.04,PER*.04);vec3 au=mix(vec3(.22,.34,.10),vec3(.33,.45,.14),f*.5+.5*n)*mix(1.,.7,step(.6,va));   // colza / blé / maïs
      vec3 sp=va>.45?mix(vec3(.86,.78,.10),vec3(.98,.90,.24),f*.4+.6*n):mix(vec3(.30,.50,.14),vec3(.42,.60,.18),f*.5+.5*n);
      return sp*sw.x+mix(vec3(.17,.31,.08),vec3(.26,.40,.11),f*.5+.5*n)*sw.y+au*(sw.z+sw.w);}
    if(t<.86){float m=vn(vec2(x,w)*.06,PER*.06);return grassPal(m)*(1.-sw.z)+mix(vec3(.36,.42,.17),vec3(.48,.47,.22),m)*sw.z;}                                   // prés
    float k=vn(vec2(x,w)*.09,PER*.09);vec3 au=mix(vec3(.48,.38,.22),vec3(.60,.50,.30),k);                                  // maïs
    return mix(vec3(.36,.26,.16),vec3(.30,.42,.14),.35*step(.6,.5+.5*sin(u*2.6)))*sw.x+mix(vec3(.18,.33,.08),vec3(.28,.42,.12),k)*sw.y+au*(sw.z+sw.w);}
  void main(){vec3 N=normalize(nn);float dist=length(eye-wp);float r=abs(uu-RC);float wz=mod(wzv,PER);vec3 col;float refl=0.;
    float n1=vn(vec2(uu,wz)*.35,PER*.35),n2=vn(vec2(uu,wz)*2.1,PER*2.1);
    if(r<3.05){ // enrobé, marquages de départementale
      float nf=1.-smoothstep(5.,30.,dist),nf2=1.-smoothstep(2.5,9.,dist);float agg=hsh(floor(vec2(uu,wz)*vec2(38.,38.)));float agg2=vn(vec2(uu,wz)*9.,PER*9.);
      col=vec3(.085,.084,.088)*(.86+.22*n2+.14*n1+(.30*agg2-.15)*mix(0.,1.,1.-smoothstep(4.,18.,dist))+(.22*step(.86,agg)-.04)*nf2);
      float lane=abs(abs(uu-RC)-1.5);float trk=smoothstep(.55,.85,lane)*(1.-smoothstep(.95,1.25,lane));col*=1.-.16*trk;   // traces de roues
      vec2 pc=vec2(uu-RC+3.,wz)/vec2(1.6,6.);vec2 pf=fract(pc);float pt=step(.94,hsh(floor(pc)+3.))*step(.08,pf.x)*step(pf.x,.9)*step(.1,pf.y)*step(pf.y,.75);
      col=mix(col,vec3(.06,.06,.065)*(.92+.16*n2),pt*.8);                                                              // rustines de goudron
      float crk=smoothstep(.012,.0,abs(vn(vec2(uu,wz)*1.7,PER*1.7)-.5))*smoothstep(.72,.85,n1)*nf;col*=1.-.35*crk;       // fines fissures
      float dash=step(mod(wz,12.),3.)*step(abs(uu-RC),.065);
      float edge=step(abs(r-2.82),.065)*step(mod(wz,15.),11.);
      float wear=.55+.45*smoothstep(.15,.6,vn(vec2(uu,wz)*4.,PER*4.));
      col=mix(col,vec3(.80,.80,.76),max(dash,edge)*wear*(.8+.2*n2));
      col=mix(col,vec3(.16,.15,.13),smoothstep(2.75,3.05,r)*.6);
      if(mode>1.5){float lv=step(.72,vn(vec2(uu,wz)*1.3,PER*1.3))*smoothstep(2.2,3.0,r);col=mix(col,vec3(.30,.15,.06),lv*.8*sw.z);}   // feuilles mortes au bord (automne)
      col=snowy(col,sw.w*(smoothstep(2.1,2.9,r)*.85+smoothstep(.5,1.4,abs(r-1.4))*.25*n1));                                  // neige tassée sur les bords
    } else if(r<3.6){float gr=hsh(floor(vec2(uu,wz)*24.));col=mix(vec3(.24,.22,.18),vec3(.36,.33,.27),n2*.6+gr*.4*(1.-smoothstep(2.5,9.,dist)));
      col=mix(col,grassPal(n1)*.9,smoothstep(3.3,3.6,r)*(.5+.5*n2));col=snowy(col,sw.w*.9);}
    else if(mode>1.5){col=mix(vec3(.11,.07,.04),vec3(.17,.10,.05),n1)*(.8+.4*n2);col=mix(col,vec3(.06,.09,.04),smoothstep(.55,.8,vn(vec2(uu,wz)*.12,PER*.12))*.7);   // sous-bois
      col=col*(sw.z+sw.w)+mix(vec3(.07,.11,.04),vec3(.12,.17,.06),n1)*(.8+.4*n2)*(sw.x+sw.y);col=snowy(col,sw.w*(.75+.25*n1));}
    else if(r<8.){float nf=1.-smoothstep(3.,16.,dist);float bl=vn(vec2(uu*11.,wz*2.),PER*2.);float tf=vn(vec2(uu,wz)*.6,PER*.6);
      col=grassPal(n1*.6+tf*.4)*(.82+.3*tf)*(1.+(bl-.5)*.45*nf);col=mix(col,col*vec3(1.1,1.05,.7),smoothstep(.62,.8,tf)*.5);
      col=mix(col,vec3(.55,.30,.08),step(.86,n2)*.5*sw.z);col*=mix(.82,1.,smoothstep(3.8,4.8,r)*(1.-smoothstep(5.,6.2,r))+smoothstep(6.2,7.5,r));col=snowy(col,sw.w*.95);}                                                  // accotement
    else { // parcelles en lanières, perpendiculaires et parallèles à la route
      float row=floor(wz/160.);float wdt=36.+hsh(vec2(row,1.))*70.;float xx=uu+hsh(vec2(row,2.))*200.;float cid=floor(xx/wdt);
      float id=mod(row,30.)*97.+cid;FD=smoothstep(60.,220.,dist);col=field(uu,wz,id)*(.88+.24*vn(vec2(uu,wz)*.02,PER*.02));
      float bd=min(min(mod(xx,wdt),wdt-mod(xx,wdt)),min(mod(wz,160.),160.-mod(wz,160.)));
      col=mix(grassPal(.3)*.85,col,smoothstep(.8,2.2,bd));
      col=mix(grassPal(.6),col,smoothstep(8.,14.,r));col=snowy(col,sw.w*(.82+.18*n2));}
    // ombre portée de la voiture
    vec2 sc=wp.xz-(mode<1.5?vec2(-sunD.x,-sunD.z)*.55:vec2(0.));float sh=1.-smoothstep(.45,1.1,length(sc/vec2(1.0,2.1)));
    float ao=1.-smoothstep(.2,1.,length(wp.xz/vec2(.95,2.05)));sh=max(sh*.85,ao);
    vec3 c;
    if(r<3.05)col*=1.-.38*sw.x;                                                     // route mouillée au printemps
    if(mode<1.5){float dif=max(dot(N,sunD),0.)*(1.-.55*sw.x);c=col*(ambCol()*(.55+.45*N.y)*.85+sunCol()*dif*1.15);c*=1.-.78*sh*(1.-.4*sw.x);
      if(r<3.05){vec3 Vd=normalize(eye-wp);vec3 Nr=N;
        float pud=smoothstep(.60,.70,vn(vec2(uu*.45,wz*.16),PER*.16))*smoothstep(2.9,2.2,r)*sw.x;                      // flaques (printemps)
        if(sw.x>.02&&dist<30.){vec2 rc=vec2(uu,wz)*2.2;vec2 ci=floor(rc);vec2 f=fract(rc)-.5-(vec2(hsh(ci+7.),hsh(ci+13.))-.5)*.5;   // ondes des gouttes
          float ph=fract(time*1.25+hsh(ci));float rr=length(f);float ring=sin((rr-ph*.45)*55.)*smoothstep(.06,.0,abs(rr-ph*.45))*(1.-ph);
          Nr=normalize(N+vec3(f.x,0.,f.y)/max(rr,.01)*ring*.35*sw.x*(1.-smoothstep(12.,30.,dist))*(.35+.65*pud));}
        float fr=pow(1.-max(dot(Vd,Nr),0.),5.);vec3 Rs=reflect(-Vd,Nr);vec3 sk=skyC(Rs);
        c=mix(c,c*.55,pud*.7);c+=sk*(fr*(.16+.6*sw.x)+.006+.014*sw.x+.30*pud);refl=rfl*(.35+.65*fr)*(1.+2.2*sw.x)+.45*pud;}
      if(r<3.05){vec3 Rv=reflect(normalize(wp-eye),N);c+=vec3(.9,.85,.75)*pow(max(dot(Rv,sunD),0.),40.)*(.25+.2*sw.y);c+=fogC*sw.x*.55*pow(1.-max(dot(-normalize(wp-eye),N),0.),3.);}   // reflets du ciel sur la route mouillée
      c=grade(c);}
    else{c=col*(vec3(.016,.022,.036)+headl(wp,N)*2.2);c*=1.-.5*sh;
      if(r<3.05){c+=vec3(1.,.95,.86)*hlRaw(wp)*pow(max(dot(reflect(normalize(wp-eye),N),normalize(vec3(0.,.66,-1.8)-wp)),0.),12.)*(.25+.9*sw.x);refl=rfl*.8*(1.+1.5*sw.x);}
      c=grade(c);}
    c=fogit(c,dist,wp)+scat(wp,gl_FragCoord.xy);refl=clamp(refl,0.,.7)*exp(-dist*.05);gl_FragColor=vec4(tone(c),1.-refl);}`;   // alpha < 1 : laisse passer le reflet de la voiture dessiné dessous
  const OBJ_VS = `attribute vec3 p;attribute vec3 n;attribute vec3 c;attribute vec4 b;uniform mat4 VP;uniform float L;uniform float zmin;
    varying vec3 wp;varying vec3 nn;varying vec3 vc0;varying float kd;varying float hy;varying vec3 lq;` + ENV_COMMON + `
  void main(){float zc=mod(b.y+D,L)+zmin;float wz=zc-D;vec3 lp=p;vec3 ln=n;float k=b.z;
    if(k>5.5&&k<6.5){float a=time*1.1+b.w*6.28;float cs=cos(a),sn=sin(a);lp.xy=vec2(cs*p.x-sn*p.y,sn*p.x+cs*p.y);ln.xy=vec2(cs*n.x-sn*n.y,sn*n.x+cs*n.y);lp.y+=84.5;lp.z-=7.2;}
    if(k>.5&&k<1.5){lp.x+=sin(time*1.3+b.w*20.)*.02*max(p.y-3.,0.);}
    wp=vec3(b.x+lp.x+bendX(wz,zc),hgt(b.x,wz)+lp.y,zc+lp.z);nn=ln;vc0=c;kd=k;hy=lp.y;lq=vec3(p.x+b.x,p.y,p.z+b.y);gl_Position=VP*vec4(wp,1.);}`;
  const OBJ_FS = `precision highp float;varying vec3 wp;varying vec3 nn;varying vec3 vc0;varying float kd;varying float hy;varying vec3 lq;` + ENV_COMMON + `
  void main(){vec3 N=normalize(nn);vec3 V=normalize(eye-wp);if(dot(N,V)<0.)N=-N;float dist=length(eye-wp);vec3 c;
    vec3 vc=vc0;if(vc0.z<-1.5)vc=mix(vec3(.06,.14,.08),vec3(.09,.19,.11),vc0.x)*vc0.y;else if(vc0.z<-.5)vc=leafPal(vc0.x)*vc0.y;
    float near=1.-smoothstep(8.,40.,dist),mid=1.-smoothstep(30.,120.,dist);bool glass=false;
    if(vc0.z<-.5){float lf=vn(vec2(lq.x*2.3+lq.y*1.7,lq.z*2.3-lq.y),1e4);float lf2=vn(vec2(lq.x*7.+lq.y*5.,lq.z*7.-lq.y*3.),1e4);float lf3=vn(vec2(lq.x*19.+lq.y*13.,lq.z*19.-lq.y*11.),1e4);
      lf2=mix(.5,lf2,mid);lf3=mix(.5,lf3,near);
      float cl=smoothstep(.35,.75,lf*.6+lf2*.4);vc*=.50+.55*cl+(.18*lf3-.09);vc*=.62+.38*smoothstep(-.4,.9,N.y);
      N=normalize(N+vec3(lf2-.5,lf3-.5,lf-.5)*.45*mid);}   // touffes de feuilles, attachées à l'arbre
    else if(kd>7.5&&kd<8.5){float rn=vn(vec2(lq.x+lq.z,lq.y)*3.,1e4);glass=vc0.r<.2&&abs(N.y)<.3;
      if(N.y>.25&&N.y<.97){float tl=fract(lq.y*4.2);float tc=fract((lq.x+lq.z)*3.3+floor(lq.y*4.2)*.5);vc*=.80+.2*mix(1.,smoothstep(0.,.18,tl),mid)-.1*step(tc,.06)*mid;vc*=.85+.3*vn(lq.xz*.6,1e4);}   // tuiles
      else if(abs(N.y)<.3){vc*=.92+.1*rn;vc=mix(vc*.72,vc,smoothstep(0.,.9,hy));}}   // enduit, salissures au pied
    float ao=kd>.5&&kd<1.5?mix(.55,1.,smoothstep(-.4,2.2,hy)):(kd>2.5&&kd<3.5||kd>6.5&&kd<8.5?mix(.6,1.,smoothstep(-.3,.7,hy)):1.);vc*=ao;
    if(kd<3.5||kd>6.5)vc=snowy(vc,sw.w*smoothstep(.2,.7,N.y)*(vc0.z<-.5?.95:.85));
    if(mode<1.5){float dif=max(dot(N,sunD),0.)*(1.-.55*sw.x);vec3 amb=mix(grassPal(.5)*.55,ambCol(),.5+.5*N.y);c=vc*(amb*(.62+.38*N.y)+sunCol()*dif*1.12);
      if(kd>.5&&kd<2.5)c+=vc*sunCol()*vec3(1.,.85,.45)*pow(max(dot(-V,sunD),0.),4.)*.75*(1.-.6*sw.x);
      if(kd>3.5&&kd<4.5)c=vc*(.5+.5*dif);
      vec3 Rr=reflect(-V,N);float fr=pow(1.-max(dot(N,V),0.),5.);vec3 Hs=normalize(sunD+V);float nh=max(dot(N,Hs),0.);
      if(glass)c=vc*.35+skyC(Rr)*(.10+.75*fr)+sunCol()*pow(nh,300.)*3.*(1.-sw.x);                         // vitres : le ciel s'y reflète
      else if(kd>4.5&&kd<6.5)c+=sunCol()*pow(nh,60.)*.35*(1.-.6*sw.x)+skyC(Rr)*fr*.25;                       // éoliennes laquées
      else if(kd>7.5&&kd<8.5&&N.y>.25)c+=sunCol()*pow(nh,24.)*.10*(1.-.6*sw.x)+skyC(Rr)*fr*.15;              // tuiles
      c=grade(c);}
    else{c=vc*(vec3(.016,.022,.036)*(.6+.4*N.y)+headl(wp,N)*2.2);
      if(kd>3.5&&kd<4.5)c=vc*(.02+hlRaw(wp)*16.);c=grade(c);if(kd>8.5&&kd<9.5)c=vc*1.5;}
    c=fogit(c,dist,wp)+scat(wp,gl_FragCoord.xy);gl_FragColor=vec4(tone(c),1.);}`;
  const SKY_FS = `precision highp float;varying vec2 q;uniform float aspect;uniform vec3 cr;uniform vec3 cu;uniform vec3 cf;uniform float th;` + ENV_COMMON + `
  float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p,1e4);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
  void main(){vec3 d=normalize(cf+q.x*aspect*th*cr+q.y*th*cu);float h=d.y;vec3 c;
    if(mode<1.5){vec3 top=vec3(.42,.48,.56)*sw.x+vec3(.12,.36,.82)*sw.y+vec3(.34,.44,.66)*sw.z+vec3(.60,.65,.72)*sw.w;c=mix(fogC,top,pow(max(h,0.),.5));
      float sd=max(dot(d,sunD),0.);c+=vec3(1.,.82,.58)*(pow(sd,900.)*9.+pow(sd,14.)*.30+pow(sd,3.)*.10)*(1.-.6*sw.w-.85*sw.x)*sunCol();
      if(h>0.){vec2 uv=d.xz/(h+.06)*.9+vec2(time*.003,0.);float cl=fbm(uv*1.3);cl=smoothstep(.50-.2*sw.w-.30*sw.x+.10*sw.y,.80-.12*sw.w-.25*sw.x,cl)*smoothstep(.0,.22,h);
        vec3 cc=mix(vec3(.58,.58,.62),vec3(1.,.96,.90),.45+.55*sd);cc=mix(cc,vec3(.42,.45,.50),sw.x*.8);cc=mix(cc,vec3(1.,.80,.62),sw.z*.25*sd);c=mix(c,cc,cl*.9);}
      c=mix(c,fogC,smoothstep(.06,-.02,h));}
    else{c=mix(vec3(.014,.020,.038),vec3(.002,.003,.008),smoothstep(0.,.7,h));
      vec2 sp=vec2(atan(d.x,d.z)*110.,asin(clamp(h,-1.,1.))*110.);vec2 ci=floor(sp);float r=hsh(ci);vec2 fr=fract(sp)-.5;
      c+=vec3(.85,.9,1.)*step(.985,r)*smoothstep(.25,.0,length(fr))*(.6+.4*sin(time*2.+r*50.))*smoothstep(.02,.2,h)*.9;
      vec3 md=normalize(vec3(.35,.42,-.84));float m=dot(d,md);c+=vec3(.92,.93,.86)*smoothstep(.99955,.9998,m)*1.6+vec3(.5,.55,.7)*pow(max(m,0.),180.)*.25;
      c=mix(c,fogC,smoothstep(.04,-.04,h));c+=scat(eye+d*60.,gl_FragCoord.xy);c*=.78;}
    gl_FragColor=vec4(tone(c),1.);}`;
  // ombres portées au sol (arbres, haies, maisons) : un ruban posé sur le terrain, forme calculée dans le shader
  const SH_VS = `attribute vec4 a0;attribute vec4 a1;uniform mat4 VP;uniform float L;uniform float zmin;uniform vec2 sdir;varying vec2 va;varying vec4 vp1;varying vec3 vw;` + ENV_COMMON + `
  void main(){float zc=mod(a0.y+D,L)+zmin;vec2 perp=vec2(-sdir.y,sdir.x);vec2 o=sdir*a0.z+perp*a0.w;float x=a0.x+o.x;float z=zc+o.y;float wz=z-D;
    vw=vec3(x+bendX(wz,z),hgt(x,wz)+.12,z);va=a0.zw;vp1=a1;gl_Position=VP*vec4(vw,1.);}`;
  const SH_FS = `precision highp float;varying vec2 va;varying vec4 vp1;varying vec3 vw;` + ENV_COMMON + `
  void main(){float a=va.x,c=va.y,r=vp1.x,hc=vp1.y,ty=vp1.z,sd=vp1.w;const float K=3.17;float d=0.;
    if(ty<.5||ty>2.5&&ty<3.5){float ac=hc*K;float ra=r*(ty<.5?3.3:2.4);float e=pow((a-ac)/ra,2.)+pow(c/r,2.);d=smoothstep(1.,.5,e);
      float dap=vn(vec2(a*.9+sd*91.,c*.9+sd*17.),1e4)*.6+vn(vec2(a*2.6+sd*33.,c*2.6),1e4)*.4;d*=mix(1.,.45+.75*smoothstep(.30,.62,dap),step(ty,.5));   // taches de lumière à travers le feuillage
      if(ty<.5)d=max(d,smoothstep(.16,.06,abs(c))*smoothstep(-.3,0.,a)*smoothstep(ac-ra*.4,ac-ra*.8,a)*.9);}   // tronc
    else if(ty<1.5){d=smoothstep(r*1.02,r*.82,abs(c))*smoothstep(-r*.7,-r*.45,a)*smoothstep(hc*K+r*.5,hc*K,a);}                                // maison
    else if(ty<2.5){float ac=hc*K;float w=r*clamp((a+.4)/(ac*.30),0.,1.)*clamp((ac-a)/(ac*.72),0.,1.);d=smoothstep(w+.35,w-.35,abs(c))*step(-.4,a);
      d=max(d,smoothstep(.14,.05,abs(c))*smoothstep(-.3,0.,a)*step(a,ac*.3));}                                                                // sapin
    else{float e=pow((a-hc*K*.45)/(r+hc*K*.55),2.)+pow(c/r,2.);d=smoothstep(1.,.45,e);}                                                    // buisson, botte, vache
    float k=.46*(1.-.65*sw.x)*(1.-.25*sw.w)*exp(-length(eye-vw)*fogK*1.3);
    gl_FragColor=vec4(vec3(1.-d*k),1.);}`;
  const BEAM_VS = `attribute vec3 p;attribute vec3 n;attribute float t;uniform mat4 VP;uniform float lift;varying vec3 wp;varying vec3 nn;varying float vt;
    void main(){wp=p+vec3(0.,lift,0.);nn=n;vt=t;gl_Position=VP*vec4(wp,1.);}`;
  const BEAM_FS = `precision highp float;varying vec3 wp;varying vec3 nn;varying float vt;uniform vec3 eye;uniform float time;uniform float hlI;
    float h2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec3 V=normalize(eye-wp);float f=pow(abs(dot(normalize(nn),V)),1.4);
      float dust=.75+.25*sin(vt*40.-time*6.+wp.x*3.)*sin(vt*17.+time*2.3);
      float a=(.15+.85*f*f)*pow(1.-vt,1.8)*smoothstep(0.,.03,vt)*.05*dust*hlI;
      gl_FragColor=vec4(vec3(1.,.95,.85)*a,1.);}`;

  // fumée d'échappement et feuilles mortes : quelques centaines de quads, tout est calculé dans le shader
  const PART_VS = `attribute vec4 q;uniform mat4 VP;uniform vec3 camR;uniform vec3 camU;uniform float spd;uniform vec3 eyeP;uniform float eyeOn;varying float va;varying vec3 vcol;varying vec2 vuv;varying vec3 vwp;varying float vty;` + ENV_COMMON + `
  void main(){float sd=q.x;vec2 cr=q.zw;vec3 c;float sz;float a;vec3 col;vty=q.y;
    if(q.y<.5){float side=sd<.5?-1.:1.;float age=fract(time/.9+sd*13.7);float vb=3.+spd*.3;
      c=vec3(side*(.435+age*.16)+sin(sd*90.+time*3.)*.05*age,.37+lift+age*.32,1.93+age*.9*vb);
      sz=.06+age*.5;a=pow(1.-age,2.)*smoothstep(0.,.08,age)*.10*(.35+.65*min(spd/25.,1.));col=vec3(.90,.90,.92);
      float ang=sd*30.+age*2.;cr=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*cr;}
    else if(q.y>1.5){float side=sd<.5?-1.:1.;                                        // yeux dans la forêt (nuit, rarement)
      c=vec3(eyeP.x+bendX(eyeP.z-D,eyeP.z),hgt(eyeP.x,eyeP.z-D)+eyeP.y,eyeP.z)+camR*side*.40;
      sz=.56;a=eyeOn;col=vec3(side,0.,0.);if(mode<1.5||eyeOn<.01)c=eye-camR*9999.;}
    else{float s1=hsh(vec2(sd*91.,1.)),s2=hsh(vec2(sd*91.,2.)),s3=hsh(vec2(sd*91.,3.));float span=80.;
      bool sn=sw.w>=max(sw.z,sw.x);vty=sn?1.25:1.;                                   // hiver : flocons ; printemps : pétales ; automne : feuilles
      float z=mod(s1*span+time*(spd*.97+1.5),span)-span*.6;float x=(s2-.5)*(sn?40.:18.)+sin(time*1.3+sd*40.)*.7;
      float y=sn?mod(s3*8.-time*(.9+s2*.5),8.)+.02:mod(s3*5.-time*(.3+s2*.3),5.)+.04;
      c=vec3(x+bendX(z-D,z),y,z);sz=sn?.035+s3*.02:.06+s3*.035;
      a=smoothstep(0.,8.,z+span*.6)*smoothstep(0.,8.,span*.4-z)*.95;
      col=mix(mix(vec3(.80,.42,.08),vec3(.88,.66,.16),s2),vec3(.55,.20,.06),step(.7,s3));
      if(sn){col=vec3(.95,.97,1.);a*=sw.w;}else if(sw.z>=sw.x){a*=sw.z;sz*=.8;if(sd>=1.||fract(sd*53.)>.45)a=0.;}
      else if(sd>=1.){vty=1.35;x=(s2-.5)*16.;float zz=mod(s1*42.+time*(spd*.97),42.)-26.;y=mod(s3*7.-time*14.,7.);   // pluie de printemps
        c=vec3(x+bendX(zz-D,zz),y,zz);sz=.16;col=vec3(.86,.90,.96);a=sw.x*smoothstep(0.,4.,zz+26.)*smoothstep(0.,4.,16.-zz)*smoothstep(1.5,4.,length(vec3(x,y,zz)-eye));}
      else{col=mix(vec3(.98,.80,.88),vec3(1.,.97,.95),s2);sz*=.7;a*=sw.x;}
      float ang=time*(2.+s1*4.)+sd*20.;if(vty>1.3){cr.x*=.05;cr.y*=2.6;}else{cr=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*cr;if(!sn)cr.y*=.35+.65*abs(sin(time*3.+sd*9.));}
      if(mode>1.5&&!sn&&vty<1.3)a=0.;}                                                            // la nuit : seulement la neige
    if(q.y>.5&&q.y<1.5){a*=smoothstep(2.,5.,length(c-eye));}
    vuv=q.zw;va=a;vcol=col;vec3 w=c+(camR*cr.x+camU*cr.y)*sz;vwp=w;gl_Position=VP*vec4(w,1.);}`;
  const PART_FS = `precision highp float;varying float va;varying vec3 vcol;varying vec2 vuv;varying vec3 vwp;varying float vty;uniform float eyeOpen;` + ENV_COMMON + `
  void main(){float a=va;vec3 c;
    if(vty>1.5){vec2 p=vuv*1.45;float side=vcol.x;p.y-=p.x*side*.32;                // œil de loup façon dessin animé : amande inclinée, pupille fendue
      float w=max(0.,1.-p.x*p.x);float hgt=.62*pow(w,.65)*eyeOpen;float e=smoothstep(.06,0.,abs(p.y)-hgt)*step(abs(p.x),1.);
      float pup=smoothstep(.05,0.,abs(p.x+side*.05)-.13*pow(w,.4))*e;
      float glow=exp(-dot(vuv,vuv)*3.2)*.55*(.4+.6*eyeOpen);
      vec3 core=mix(vec3(1.,.93,.35),vec3(.75,1.,.25),smoothstep(.0,.5,abs(p.y)/max(hgt,.01)));
      c=core*e*(1.-pup*.92)*2.2+vec3(.85,.95,.25)*glow;a*=max(e,glow*1.2);
      if(a<.003)discard;gl_FragColor=vec4(tone(c),a);return;}
    if(vty<.5){a*=smoothstep(1.,.15,length(vuv));
      if(mode<1.5)c=vcol*vec3(1.,.97,.92);else c=vcol*.02+vec3(1.,.08,.05)*(tlI*.35+brake*1.3)*exp(-max(vwp.z-1.9,0.)*.3);}
    else if(vty>1.3){a*=smoothstep(1.,.2,abs(vuv.x))*smoothstep(1.,.3,abs(vuv.y))*.85;                          // goutte de pluie
      if(mode<1.5)c=vcol;else{vec3 li=headl(vwp,vec3(0.,0.,1.))*2.6+vec3(1.,.95,.85)*hlRaw(vwp)*1.6;c=vcol*(vec3(.04,.05,.07)+li);a*=.2+.8*smoothstep(0.,.3,dot(li,vec3(.33)));}}
    else if(vty>1.1){a*=smoothstep(1.,.3,length(vuv));                               // flocon
      if(mode<1.5)c=vcol;else{vec3 li=headl(vwp,vec3(0.,0.,1.))*2.6+vec3(1.,.95,.85)*hlRaw(vwp)*1.4;c=vcol*(vec3(.05,.06,.09)+li);a*=.25+.75*smoothstep(0.,.3,dot(li,vec3(.33)));}}
    else{a*=smoothstep(1.,.8,length(vuv*vec2(1.,1.9)));
      if(mode<1.5)c=vcol*vec3(1.,.93,.82)*1.05;else{vec3 li=headl(vwp,vec3(0.,1.,0.))*2.2+vec3(1.,.95,.85)*hlRaw(vwp)*.8;c=vcol*(vec3(.015,.02,.03)+li);a*=.1+.9*smoothstep(0.,.25,dot(li,vec3(.33)));}}
    if(a<.003)discard;c=fogit(c,length(eye-vwp),vwp);gl_FragColor=vec4(tone(c),a);}`;
  // ---------- géométrie des décors (un seul gros tampon par ambiance) ----------
  function Scatter(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function WorldGeo() {
    const V = [], I = [], SV = [], SI = []; // p n c b  (13 floats) + indices : les sommets partagés ne sont calculés qu'une fois
    let B = [0, 0, 0, 0], nv = 0;
    const vtx = (p, n, c) => { V.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], B[0], B[1], B[2], B[3]); return nv++; };
    const nrm = (a, b, c) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n) || 1; return n.map((x) => x / l); };
    const tri = (a, b, c, col, n) => { const nn = n || nrm(a, b, c); I.push(vtx(a, nn, col), vtx(b, nn, col), vtx(c, nn, col)); };
    const quad4 = (a, b, c, d, col, n) => { const nn = n || nrm(a, b, c); const i0 = vtx(a, nn, col), i1 = vtx(b, nn, col), i2 = vtx(c, nn, col), i3 = vtx(d, nn, col); I.push(i0, i1, i2, i0, i2, i3); };
    const G = {
      at: Object.assign((x, z, kind, seed) => { B = [x, z, kind, seed]; }, { k: (kind) => { B = [B[0], B[1], kind, B[3]]; } }),
      _k: null,
      prism(r0, r1, y0, y1, sides, col, ox, oz) { ox = ox || 0; oz = oz || 0;
        for (let i = 0; i < sides; i++) { const a0 = i / sides * 6.2832, a1 = (i + 1) / sides * 6.2832;
          const p = (r, a, y) => [ox + Math.cos(a) * r, y, oz + Math.sin(a) * r];
          const na = [Math.cos((a0 + a1) / 2), (r0 - r1) / (y1 - y0 || 1) * .5, Math.sin((a0 + a1) / 2)];
          const A = p(r0, a0, y0), Bp = p(r0, a1, y0), C = p(r1, a1, y1), Dd = p(r1, a0, y1);
          if (r1 > 1e-4) quad4(A, Bp, C, Dd, col, na); else tri(A, Bp, C, col, na); } },
      blob(cx, cy, cz, rx, ry, rz, col, rnd, sub, dark) { // ellipsoïde bosselé (icosaèdre éventuellement subdivisé)
        const t = (1 + Math.sqrt(5)) / 2; let vs = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((v) => { const l = Math.hypot(...v); return v.map((x) => x / l); });
        let fs = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
        if (sub) { const mid = {}; const m = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (mid[k] == null) { const v = vs[a].map((x, i) => x + vs[b][i]); const l = Math.hypot(...v); vs.push(v.map((x) => x / l)); mid[k] = vs.length - 1; } return mid[k]; };
          const nf = []; fs.forEach(([a, b, c]) => { const ab = m(a, b), bc = m(b, c), ca = m(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }); fs = nf; }
        const j = vs.map(() => .9 + rnd() * .16);
        const P = vs.map((v, i) => [cx + v[0] * rx * j[i], cy + v[1] * ry * j[i], cz + v[2] * rz * j[i]]);
        const sh = (k) => { const y = vs[k][1]; const f = (dark || .62) + (1 - (dark || .62)) * (y * .5 + .5); return col[2] < 0 ? [col[0], col[1] * f, col[2]] : col.map((x) => x * f); };   // feuillage : [teinte, ombre, marqueur]
        const base = nv; vs.forEach((v, k) => vtx(P[k], v, sh(k)));
        fs.forEach(([a, b, c]) => I.push(base + a, base + b, base + c)); },
      box(cx, cy, cz, sx, sy, sz, col) { const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
        const q = (a, b, c, d, n) => quad4(a, b, c, d, col, n);
        q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]); q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
        q([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1]); q([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]);
        q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]); },
      quad(a, b, c, d, col) { tri(a, b, c, col); tri(a, c, d, col); },
      data() { return new Float32Array(V); }, index() { return new Uint32Array(I); },
      cast(r, hc, ty) { // ombre au sol : grille 7 × 3 orientée vers l'ombre
        const K = 3.17, a0 = -r * 1.3, a1 = hc * K + r * (ty === 0 ? 3.6 : ty === 1 ? .8 : 2.6) + 1, base = SV.length / 8, sd = (B[3] * 7.31) % 1;
        for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) SV.push(B[0], B[1], a0 + (a1 - a0) * i / 6, (j - 1) * r * 1.35, r, hc, ty, sd);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const q = base + i * 3 + j; SI.push(q, q + 3, q + 1, q + 1, q + 3, q + 4); } },
      shadows() { return { v: new Float32Array(SV), i: new Uint32Array(SI) }; }
    };
    return G;
  }
  const AUT = [[.78, .40, .08], [.85, .62, .14], [.62, .22, .07], [.50, .32, .12], [.36, .40, .13], [.72, .52, .10], [.55, .44, .16]];
  // feuillage : [variante, multiplicateur, -1] → la couleur est choisie dans le shader selon la saison
  const LEAF = (v, m) => [v, m, -1];
  function deciduous(G, rnd, s, vr, lowpoly, mul) {
    const col = LEAF(vr[0] + rnd() * (vr[1] - vr[0]), mul || 1);
    if (G.castOn) G.cast(2.5 * s, 5.4 * s, 0);
    G.prism(.16 * s, .09 * s, -.6, 3.4 * s, 5, [.24, .19, .15]);
    G.blob(0, 5.0 * s, 0, 2.2 * s, 2.3 * s, 2.2 * s, [col[0], col[1] * .82, -1], rnd, !lowpoly, .6);
    if (!lowpoly) { G.prism(.07 * s, .03 * s, 3.0 * s, 4.6 * s, 4, [.24, .19, .15], .5 * s, .2 * s); G.prism(.06 * s, .03 * s, 3.3 * s, 4.8 * s, 4, [.24, .19, .15], -.4 * s, -.3 * s); }
    const nc = lowpoly ? 2 : 5;
    for (let i = 0; i < nc; i++) { const a = i / nc * 6.2832 + rnd(), rr = (1.1 + rnd() * .6) * s, sz = (1.25 + rnd() * .55) * s;
      G.blob(Math.cos(a) * rr, (4.6 + rnd() * 2.0) * s, Math.sin(a) * rr, sz, sz * (.8 + rnd() * .25), sz, [col[0] + (rnd() - .5) * .06, col[1] * (.9 + rnd() * .25), -1], rnd, !lowpoly, .66); }
    G.blob((rnd() - .5) * .8 * s, 6.9 * s, (rnd() - .5) * .8 * s, 1.3 * s, 1.1 * s, 1.3 * s, [col[0], col[1] * 1.15, -1], rnd, !lowpoly, .75);
  }
  function conifer(G, rnd, s) {
    const g = [rnd(), 1, -2];   // sapin : vert toute l'année (neige l'hiver)
    if (G.castOn) G.cast(3.0 * s, 15 * s, 2);
    G.prism(.18 * s, .1 * s, -.6, 4 * s, 5, [.20, .15, .12]);
    [[3.0, 2.5, 11], [7.0, 1.9, 9], [10.5, 1.3, 7], [13.5, .7, 5]].forEach(([y, r, h], i) => G.prism(r * s, 0, y * s, (y + h * .55) * s, 7, [g[0], 1 + i * .12, -2]));
  }
  function post(G, side) { // balise J6 : poteau blanc, bande noire, catadioptre
    G.box(0, .55, 0, .1, 1.1, .1, [.85, .85, .82]); G.box(0, 1.0, 0, .102, .16, .102, [.03, .03, .03]);
  }
  // maisons lorraines : longères crépies, toits de tuiles rouges à faible pente, fenêtres sombres (allumées la nuit)
  const WALLS = [[.86, .82, .74], [.90, .86, .78], [.82, .74, .62], [.78, .80, .78], [.88, .80, .66]], ROOFS = [[.62, .24, .14], [.55, .22, .14], [.68, .32, .18], [.42, .20, .14], [.36, .34, .34]];
  function house(G, rnd, w, d, h, ox, lit) {   // w : long du pignon, d : profondeur (le long de la route)
    const wc = WALLS[Math.floor(rnd() * WALLS.length)], rc = ROOFS[Math.floor(rnd() * ROOFS.length)], rh = h * (.42 + rnd() * .2);
    ox = ox || 0; if (G.castOn) G.cast(Math.max(w, d) * .5, h + rh * .5, 1); G.box(ox, h / 2 - .3, 0, w, h + .6, d, wc);
    const x0 = ox - w / 2 - .25, x1 = ox + w / 2 + .25, z0 = -d / 2 - .3, z1 = d / 2 + .3, y = h, yt = h + rh;
    G.quad([x0, y, z0], [ox, yt, z0], [ox, yt, z1], [x0, y, z1], rc); G.quad([ox, yt, z0], [x1, y, z0], [x1, y, z1], [ox, yt, z1], rc.map((v) => v * .86));
    G.quad([x0, y, z1], [ox, yt, z1], [ox, yt, z0], [x0, y, z0], rc); G.quad([ox, yt, z1], [x1, y, z1], [x1, y, z0], [ox, yt, z0], rc.map((v) => v * .86));
    [-1, 1].forEach((s) => { const zz = s * d / 2; const p = [[ox - w / 2, y, zz], [ox + w / 2, y, zz], [ox, yt - .05, zz]]; G.quad(p[0], p[1], p[2], p[2], wc.map((v) => v * .94)); G.quad(p[2], p[1], p[0], p[0], wc.map((v) => v * .94)); });
    if (rnd() < .7) G.box(ox + w * (rnd() - .5) * .5, yt - .1, d * (rnd() - .5) * .6, .5, rh * .9, .5, [.45, .28, .22]);   // cheminée
    const nw = Math.max(2, Math.floor(d / 2.6));
    [-1, 1].forEach((s) => { for (let i = 0; i < nw; i++) { const zz = -d / 2 + (i + .5) * d / nw; const on = lit && rnd() < .45;
      G.at.k(on ? 9 : 8); G.box(ox + s * (w / 2 + .03), h * .6, zz, .06, 1.0, .75, on ? [1, .72, .36] : [.12, .13, .15]); G.at.k(8); } });
    if (rnd() < .5) { G.box(ox + w / 2 + .03, .8, d * .25, .07, 2.0, 1.1, [.36, .24, .16]); }   // porte de grange
  }
  function church(G, rnd) { const wc = [.88, .84, .76]; G.box(0, 3.5, 0, 7, 8, 14, wc); G.quad([-3.8, 7.5, -7.3], [0, 11, -7.3], [0, 11, 7.3], [-3.8, 7.5, 7.3], [.56, .23, .14]); G.quad([0, 11, -7.3], [3.8, 7.5, -7.3], [3.8, 7.5, 7.3], [0, 11, 7.3], [.48, .20, .12]);
    G.quad([-3.8, 7.5, 7.3], [0, 11, 7.3], [0, 11, -7.3], [-3.8, 7.5, -7.3], [.56, .23, .14]); G.quad([0, 11, 7.3], [3.8, 7.5, 7.3], [3.8, 7.5, -7.3], [0, 11, -7.3], [.48, .20, .12]);
    G.box(0, 8, -8.5, 4, 17, 4, wc); G.prism(2.9, 0, 16.5, 25, 4, [.28, .30, .34], 0, -8.5); G.box(0, 26, -8.5, .12, 2.2, .12, [.3, .3, .3]); G.box(0, 26.3, -8.5, .9, .12, .12, [.3, .3, .3]); }
  function village(G, rnd, cx, cz, n, L, lit, withChurch) {   // village-rue lorrain : maisons accolées le long d'une rue
    let z = 0; const side = cx > -1.5 ? 1 : -1;
    for (let i = 0; i < n; i++) { const d = 7 + rnd() * 6, w = 8 + rnd() * 3, h = 4.5 + rnd() * 2.5; const row = (i % 2) ? 1 : -1;
      G.at((cx + row * 9 + (rnd() - .5)), ((cz + z) % L + L) % L, 8, rnd()); house(G, rnd, w, d, h, 0, lit); z += d + (rnd() < .3 ? 4 + rnd() * 8 : .2);
      if (rnd() < .4) { G.at(cx + row * 18, ((cz + z - d / 2) % L + L) % L, 2, rnd()); G.blob(0, 1.1, 0, 2.4, 1.6, 2.4, LEAF(.9 + rnd() * .09, .9), rnd, false, .8); } }
    if (withChurch) { G.at(cx, ((cz + z * .45) % L + L) % L, 8, rnd()); church(G, rnd); }
  }
  function cow(G, rnd) { const c = rnd() < .5 ? [.92, .90, .86] : [.42, .28, .20]; if (G.castOn) G.cast(.7, 1.0, 3); G.box(0, .95, 0, .6, .65, 1.5, c); G.box(0, 1.15, -.9, .38, .4, .45, c); [[-.2, -.5], [.2, -.5], [-.2, .5], [.2, .5]].forEach(([x, z]) => G.box(x, .35, z, .14, .7, .14, c.map((v) => v * .8))); }
  function buildDay() {
    const G = WorldGeo(); G.castOn = true; const rnd = Scatter(7), L = 480;
    // balises tous les 50 m de chaque côté
    for (let z = 0; z < L; z += 50) [[-1.5 - 3.95, 0], [-1.5 + 3.95, 25]].forEach(([x, dz]) => { G.at(x, z + dz, 3, rnd()); post(G); G.at(x, z + dz, 4, rnd()); G.box(0, 1.0, x > -1.5 ? .052 : .052, .06, .1, .01, x > -1.5 ? [1, .35, .05] : [1, 1, .95]); G.box(0, 1.0, -.052, .06, .1, .01, x > -1.5 ? [1, .35, .05] : [1, 1, .95]); });
    // alignement d'arbres le long de la route sur une portion
    for (let z = 40; z < 170; z += 11) [-1.5 - 7.5, -1.5 + 7.5].forEach((x) => { G.at(x + (rnd() - .5), z + rnd() * 2, 1, rnd()); deciduous(G, rnd, 1.05 + rnd() * .25, [.28, .5]); });
    // haies et bosquets entre les parcelles
    for (let h = 0; h < 14; h++) { const side = rnd() < .5 ? -1 : 1; const x0 = -1.5 + side * (18 + rnd() * 140); const z0 = rnd() * L; const len = 40 + rnd() * 110; const along = rnd() < .6;
      const hv = .86 + rnd() * .13;
      for (let k = 0; k < len; k += 1.5) { const x = along ? x0 + (rnd() - .5) * .6 : x0 + side * k; const z = along ? z0 + k : z0 + (rnd() - .5) * .6;
        const hh = 1.0 + .45 * Math.sin(k * .21 + h) + rnd() * .35;
        G.at(x, z % L, 2, rnd()); if ((k / 1.5) % 2 < 1) G.cast(1.5, hh * 1.2, 3); const c = LEAF(rnd() < .2 ? rnd() * .85 : hv + (rnd() - .5) * .04, .78 + rnd() * .22); G.blob(0, hh * .95, 0, along ? 1.15 + rnd() * .3 : 1.9, hh, along ? 1.9 : 1.15 + rnd() * .3, c, rnd, false, .6);
        if (rnd() < .12) { G.at(x, z % L, 1, rnd()); deciduous(G, rnd, .9 + rnd() * .5, [0, 1], true); } } }
    // arbres isolés dans les champs
    for (let i = 0; i < 26; i++) { const side = rnd() < .5 ? -1 : 1; G.at(-1.5 + side * (14 + rnd() * 160), rnd() * L, 1, rnd()); deciduous(G, rnd, 1.1 + rnd() * .5, [0, 1], rnd() < .4); }
    // bosquets et lisières de forêt sur les crêtes
    for (let g = 0; g < 9; g++) { const side = rnd() < .5 ? -1 : 1; const cx = -1.5 + side * (110 + rnd() * 190), cz = rnd() * L; const n = 18 + Math.floor(rnd() * 22);
      for (let i = 0; i < n; i++) { G.at(cx + (rnd() - .5) * 60, (cz + (rnd() - .5) * 70 + L) % L, 1, rnd()); if (rnd() < .25) conifer(G, rnd, .8 + rnd() * .4); else deciduous(G, rnd, 1.2 + rnd() * .6, [0, 1], true); } }
    // bottes de foin rondes
    for (let f = 0; f < 4; f++) { const side = rnd() < .5 ? -1 : 1; const cx = -1.5 + side * (24 + rnd() * 70), cz = rnd() * L;
      for (let i = 0; i < 9; i++) { G.at(cx + (rnd() - .5) * 40, (cz + (rnd() - .5) * 50 + L) % L, 7, rnd()); G.cast(.85, .9, 3); G.prism(.8, .8, -.75, .65, 12, [.70, .58, .31]); G.prism(.8, 0, .65, .66, 12, [.80, .68, .40]); } }
    // villages-rues, fermes isolées, maisons au bord de la route, vaches et calvaires
    village(G, rnd, -1.5 + 70, 60, 9, L, false, true); village(G, rnd, -1.5 - 160, 250, 12, L, false, true); village(G, rnd, -1.5 + 240, 330, 7, L, false, false);
    [[-24, 140], [28, 215], [-38, 300], [19, 420], [-95, 40], [120, 180], [-210, 420], [60, 465]].forEach(([dx, z]) => { G.at(-1.5 + dx, z, 8, rnd()); house(G, rnd, 8 + rnd() * 3, 9 + rnd() * 8, 4.5 + rnd() * 2, 0, false);
      if (rnd() < .6) { G.at(-1.5 + dx + Math.sign(dx) * 13, z + (rnd() - .5) * 6, 8, rnd()); house(G, rnd, 10, 14 + rnd() * 6, 5.5, 0, false); } });   // ferme + grange
    for (let p = 0; p < 4; p++) { const side = rnd() < .5 ? -1 : 1; const cx = -1.5 + side * (22 + rnd() * 50), cz = rnd() * L;
      for (let i = 0; i < 5 + Math.floor(rnd() * 5); i++) { G.at(cx + (rnd() - .5) * 26, (cz + (rnd() - .5) * 30 + L) % L, 8, rnd()); cow(G, rnd); }
      for (let k = 0; k < 14; k++) { G.at(cx - side * 14, (cz - 21 + k * 3 + L) % L, 8, rnd()); G.box(0, .5, 0, .1, 1.0, .1, [.42, .32, .22]); G.box(0, .75, 1.5, .05, .06, 3, [.48, .36, .24]); } }   // clôture du pré
    [[-11.5, 275]].forEach(([dx, z]) => { G.at(-1.5 + dx, z, 8, rnd()); G.box(0, .3, 0, .9, .6, .9, [.70, .66, .58]); G.box(0, 1.8, 0, .16, 2.6, .16, [.30, .28, .26]); G.box(0, 2.5, 0, .9, .16, .16, [.30, .28, .26]); });   // calvaires
    // éoliennes sur les crêtes au loin (très lorrain)
    [[230, 30], [262, 120], [-250, 200], [-290, 300], [300, 380], [205, 430]].forEach(([dx, z]) => { const x = -1.5 + dx;
      G.at(x, z, 5, rnd()); G.prism(2.2, 1.2, -2, 84, 10, [.88, .89, .9]); G.box(0, 84.5, -1.5, 3, 3, 9, [.9, .9, .91]); G.box(0, 84.5, -6.2, 1.6, 1.6, 1.4, [.92, .92, .93]);
      G.at(x, z, 6, rnd()); for (let b = 0; b < 3; b++) { const a = b / 3 * 6.2832; const c = Math.cos(a), s = Math.sin(a); const w0 = 1.6, w1 = .4, Lb = 42;
        const P = (r, w) => [c * r - s * w, s * r + c * w, 0]; G.quad(P(1, -w0), P(Lb, -w1), P(Lb, w1), P(1, w0), [.93, .93, .94]); } });
    return { data: G.data(), idx: G.index(), sh: G.shadows(), L, zmin: -(L - 70) };
  }
  function buildNight() {
    const G = WorldGeo(); const rnd = Scatter(11), L = 480;
    for (let z = 0; z < L; z += 50) [[-1.5 - 3.95, 0], [-1.5 + 3.95, 25]].forEach(([x, dz]) => { G.at(x, z + dz, 3, rnd()); post(G); G.at(x, z + dz, 4, rnd()); G.box(0, 1.0, .052, .06, .1, .01, x > -1.5 ? [1, .35, .05] : [1, 1, .95]); G.box(0, 1.0, -.052, .06, .1, .01, x > -1.5 ? [1, .35, .05] : [1, 1, .95]); });
    for (let i = 0; i < 1150; i++) { const side = rnd() < .5 ? -1 : 1; const d = 5.2 + Math.pow(rnd(), 1.6) * 75; const x = -1.5 + side * d; G.at(x, rnd() * L, 1, rnd());
      if (rnd() < .58) conifer(G, rnd, 1.25 + rnd() * .7); else deciduous(G, rnd, 1.3 + rnd() * .6, [.45, .99], d > 30, .78); }
    [[-14, 80], [16, 230], [-20, 350], [24, 440]].forEach(([dx, z]) => { G.at(-1.5 + dx, z, 8, rnd()); house(G, rnd, 7 + rnd() * 2, 8 + rnd() * 4, 4, 0, true); });   // maisons forestières, fenêtres allumées
    for (let i = 0; i < 380; i++) { const side = rnd() < .5 ? -1 : 1; const x = -1.5 + side * (4.6 + rnd() * 22); G.at(x, rnd() * L, 2, rnd()); G.blob(0, .35, 0, .7 + rnd() * .6, .45 + rnd() * .3, .7 + rnd() * .6, LEAF(.86 + rnd() * .13, (.7 + rnd() * .6) * .6), rnd, false, .45); }
    return { data: G.data(), idx: G.index(), L, zmin: -(L - 70) };
  }
  function beamGeo() { // cônes de lumière des phares (brume)
    const P = [], N = [], T = []; const len = 44, R = 7.5, seg = 18;
    [-.56, .56].forEach((x) => { const o = [x, .66, -1.86]; const dir = [x < 0 ? -.03 : .05, -.04, -1]; const l = Math.hypot(...dir); const w = dir.map((v) => v / l);
      const u = [1, 0, 0], v = [0, 1, 0];
      for (let i = 0; i < seg; i++) for (let j = 0; j < 10; j++) {
        const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, t0 = j / 10, t1 = (j + 1) / 10;
        const pt = (a, t) => { const r = .08 + R * t; return [o[0] + w[0] * len * t + (Math.cos(a) * u[0] + Math.sin(a) * v[0]) * r, o[1] + w[1] * len * t + (Math.cos(a) * u[1] + Math.sin(a) * v[1]) * r * .55, o[2] + w[2] * len * t]; };
        const nn = (a) => [Math.cos(a), Math.sin(a) * .55, .1];
        [[a0, t0], [a1, t0], [a1, t1], [a0, t0], [a1, t1], [a0, t1]].forEach(([a, t]) => { P.push(...pt(a, t)); N.push(...nn(a)); T.push(t); });
      } });
    return { p: new Float32Array(P), n: new Float32Array(N), t: new Float32Array(T) };
  }
  const RF0 = 2 * Math.PI / 4800;
  const roadC = (w) => { const e = .5 + .5 * Math.sin(RF0 * 5 * w + .7); return 14 * Math.sin(RF0 * 24 * w) * e * e + 30 * Math.sin(RF0 * 3 * w + 2); };
  const roadK = (w) => (roadC(w + 1) - 2 * roadC(w) + roadC(w - 1));      // courbure (dérivée seconde)
  const roadB = (w, s) => .009 * Math.sin(w * 1.31 + s * 1.7) * Math.sin(w * .173 + s) + .0045 * Math.sin(w * 3.7 + s * 2.1) + .003 * Math.sin(w * 7.9 + s);  // bosses
  function World(gl, prog, U, mk) {
    const PART = prog(PART_VS, PART_FS); const pq = []; const quadC = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    for (let k = 0; k < 2; k++) quadC.forEach(([x, y]) => pq.push(k, 2, x, y));
    for (let i = 0; i < 320; i++) { const s = 1 + i / 320; quadC.forEach(([x, y]) => pq.push(s, 1, x, y)); }   // flocons supplémentaires (hiver)
    for (let i = 0; i < 260; i++) { const leaf = i >= 70 ? 1 : 0; const sd = leaf ? (i - 70) / 190 + .0007 : (i % 2 ? .75 : .25) + (i / 70) * .2 - .1 + (i % 2 ? 0 : 0); const s = leaf ? sd : (i % 2 ? .5 + (i / 140) : (i / 140)); quadC.forEach(([x, y]) => pq.push(s, leaf, x, y)); }
    const pb = mk(gl.ARRAY_BUFFER, new Float32Array(pq)), pn = pq.length / 4;
    const SHP = prog(SH_VS, SH_FS);
    const TER = prog(TER_VS, TER_FS), OBJ = prog(OBJ_VS, OBJ_FS), SKY = prog(BG_VS, SKY_FS), BEAM = prog(BEAM_VS, BEAM_FS);
    // grille du terrain : dense près de la route, lâche au loin ; pas constant en z pour défiler sans « nager »
    const offs = [0, 1.5, 3.05, 3.6, 4.2, 4.6, 5.0, 5.6, 6.4, 7.5, 9, 11, 14, 18, 23, 29, 36, 45, 56, 70, 86, 105, 128, 155, 186, 222, 264, 312, 370];
    const xs = []; offs.slice().reverse().forEach((o) => xs.push(-1.5 - o)); offs.forEach((o, i) => { if (i) xs.push(-1.5 + o); });
    const CELL = 4, Z0 = -470, Z1 = 70; const nz = Math.round((Z1 - Z0) / CELL) + 1; const nx = xs.length;
    const gv = new Float32Array(nx * nz * 2); let k = 0; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { gv[k++] = xs[i]; gv[k++] = Z0 + j * CELL; }
    const gi = []; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; gi.push(a, c, b, b, c, d); }
    const tb = mk(gl.ARRAY_BUFFER, gv), ti = mk(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(gi)), tn = gi.length;
    const sets = {}; const getSet = (m) => { if (!sets[m]) { const s = m === 2 ? buildNight() : buildDay(); sets[m] = { buf: mk(gl.ARRAY_BUFFER, s.data), ib: mk(gl.ELEMENT_ARRAY_BUFFER, s.idx), n: s.idx.length, L: s.L, zmin: s.zmin };
      if (s.sh && s.sh.i.length) { sets[m].sb = mk(gl.ARRAY_BUFFER, s.sh.v); sets[m].si = mk(gl.ELEMENT_ARRAY_BUFFER, s.sh.i); sets[m].sn = s.sh.i.length; } } return sets[m]; };
    const bg = beamGeo(); const bb = { p: mk(gl.ARRAY_BUFFER, bg.p), n: mk(gl.ARRAY_BUFFER, bg.n), t: mk(gl.ARRAY_BUFFER, bg.t), n_: bg.t.length };
    const SUN = (() => { const v = [-.62, .30, .72]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
    const FOGD = [[.62, .66, .70], [.80, .84, .86], [.86, .76, .62], [.88, .90, .93]], FOGN = [[.010, .013, .020], [.010, .013, .024], [.012, .011, .016], [.018, .021, .030]];
    const look = (m, w) => { const F = m === 2 ? FOGN : FOGD; const fog = [0, 1, 2].map((j) => F.reduce((s, c, k) => s + c[j] * w[k], 0));
      return m === 2 ? { fog, fogK: .021 + .004 * w[3] + .006 * w[0], hl: 1 } : { fog, fogK: .0034 + .0026 * w[3] + .0033 * w[0] - .0018 * w[1] + .0008 * w[2], hl: 0 }; };
    const seasonW = (s) => [0, 1, 2, 3].map((k) => { let d = Math.abs(s - k); d = Math.min(d, 4 - d); return Math.max(0, 1 - d); });
    function common(p, S, eye, time) {
      const w = seasonW(S.season || 0); const lk = look(S.scene, w); gl.uniform4fv(U(p, 'sw'), w);
      gl.uniform1f(U(p, 'D'), S.D); gl.uniform1f(U(p, 'mode'), S.scene); gl.uniform1f(U(p, 'time'), time); gl.uniform3fv(U(p, 'eye'), eye);
      gl.uniform3fv(U(p, 'sunD'), SUN); gl.uniform3fv(U(p, 'fogC'), lk.fog); gl.uniform1f(U(p, 'fogK'), lk.fogK); gl.uniform1f(U(p, 'hlI'), lk.hl * Math.min(1, S.lights));
      gl.uniform1f(U(p, 'tlI'), S.lights); gl.uniform1f(U(p, 'brake'), S.brake || 0);
      gl.uniform1f(U(p, 'cw0'), S.cw0 || 0); gl.uniform1f(U(p, 'dcw0'), S.dcw0 || 0); gl.uniform1f(U(p, 'lift'), S.ride);
    }
    const dis = () => { for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i); };
    return {
      SUN, ensure(m) { getSet(m); },
      carEnv(p, S) { const w = seasonW(S.season || 0); const lk = look(S.scene, w); gl.uniform4fv(U(p, 'uSw'), w); gl.uniform3fv(U(p, 'uFog'), lk.fog); gl.uniform1f(U(p, 'uD'), S.D);
        gl.uniform3fv(U(p, 'uTop'), [0, 1, 2].map((j) => [[.42, .48, .56], [.12, .36, .82], [.34, .44, .66], [.60, .65, .72]].reduce((a, c, k) => a + c[j] * w[k], 0))); return w; },
      sky(S, eye, time, basis, aspect) {
        gl.useProgram(SKY); common(SKY, S, eye, time);
        const a = gl.getAttribLocation(SKY, 'p'); gl.bindBuffer(gl.ARRAY_BUFFER, basis.bq); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        gl.uniform3fv(U(SKY, 'cf'), basis.f); gl.uniform3fv(U(SKY, 'cr'), basis.r); gl.uniform3fv(U(SKY, 'cu'), basis.u); gl.uniform1f(U(SKY, 'th'), basis.th); gl.uniform1f(U(SKY, 'aspect'), aspect);
        gl.drawArrays(gl.TRIANGLES, 0, 3); dis();
      },
      ground(S, VP, eye, time) {
        gl.useProgram(TER); common(TER, S, eye, time); gl.uniformMatrix4fv(U(TER, 'VP'), false, VP); gl.uniform1f(U(TER, 'cell'), CELL);
        const a = gl.getAttribLocation(TER, 'g'); gl.bindBuffer(gl.ARRAY_BUFFER, tb); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(U(TER, 'rfl'), S.scene === 2 ? .10 : .11);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ti); gl.drawElements(gl.TRIANGLES, tn, gl.UNSIGNED_SHORT, 0); gl.disable(gl.BLEND);
        const st = getSet(S.scene);
        if (st.sb) {                                     // ombres portées : multipliées sur le sol, avant les objets
          gl.useProgram(SHP); common(SHP, S, eye, time); gl.uniformMatrix4fv(U(SHP, 'VP'), false, VP); gl.uniform1f(U(SHP, 'L'), st.L); gl.uniform1f(U(SHP, 'zmin'), st.zmin);
          const sl = Math.hypot(SUN[0], SUN[2]); gl.uniform2f(U(SHP, 'sdir'), -SUN[0] / sl, -SUN[2] / sl);
          gl.bindBuffer(gl.ARRAY_BUFFER, st.sb); const l0 = gl.getAttribLocation(SHP, 'a0'), l1 = gl.getAttribLocation(SHP, 'a1');
          gl.enableVertexAttribArray(l0); gl.vertexAttribPointer(l0, 4, gl.FLOAT, false, 32, 0); gl.enableVertexAttribArray(l1); gl.vertexAttribPointer(l1, 4, gl.FLOAT, false, 32, 16);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, st.si);
          gl.enable(gl.BLEND); gl.blendFunc(gl.DST_COLOR, gl.ZERO); gl.depthMask(false); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -8);
          gl.drawElements(gl.TRIANGLES, st.sn, gl.UNSIGNED_INT, 0);
          gl.disable(gl.POLYGON_OFFSET_FILL); gl.depthMask(true); gl.disable(gl.BLEND); dis();
        }
        gl.useProgram(OBJ); common(OBJ, S, eye, time); gl.uniformMatrix4fv(U(OBJ, 'VP'), false, VP); gl.uniform1f(U(OBJ, 'L'), st.L); gl.uniform1f(U(OBJ, 'zmin'), st.zmin);
        gl.bindBuffer(gl.ARRAY_BUFFER, st.buf);
        [['p', 3, 0], ['n', 3, 3], ['c', 3, 6], ['b', 4, 9]].forEach(([nm, sz, off]) => { const l = gl.getAttribLocation(OBJ, nm); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, sz, gl.FLOAT, false, 52, off * 4); });
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, st.ib); gl.drawElements(gl.TRIANGLES, st.n, gl.UNSIGNED_INT, 0);
        dis();
      },
      particles(S, VP, eye, time, basis) {
        gl.useProgram(PART); common(PART, S, eye, time); gl.uniformMatrix4fv(U(PART, 'VP'), false, VP); gl.uniform3fv(U(PART, 'camR'), basis.r); gl.uniform3fv(U(PART, 'camU'), basis.u); gl.uniform1f(U(PART, 'spd'), S.speed); gl.uniform3fv(U(PART, 'eyeP'), S.eyeP || [0, 0, 0]); gl.uniform1f(U(PART, 'eyeOn'), S.eyeOn || 0); gl.uniform1f(U(PART, 'eyeOpen'), S.eyeOpen == null ? 1 : S.eyeOpen);
        const l = gl.getAttribLocation(PART, 'q'); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 0, 0);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES, 0, pn); gl.depthMask(true); gl.disable(gl.BLEND); dis();
      },
      beams(S, VP, eye, time) {
        if (true) return;
        gl.useProgram(BEAM); gl.uniformMatrix4fv(U(BEAM, 'VP'), false, VP); gl.uniform3fv(U(BEAM, 'eye'), eye); gl.uniform1f(U(BEAM, 'time'), time); gl.uniform1f(U(BEAM, 'hlI'), Math.min(1, S.lights)); gl.uniform1f(U(BEAM, 'lift'), S.ride + .03);
        [['p', bb.p, 3], ['n', bb.n, 3], ['t', bb.t, 1]].forEach(([nm, b, sz]) => { const l = gl.getAttribLocation(BEAM, nm); if (l < 0) return; gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, sz, gl.FLOAT, false, 0, 0); });
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES, 0, bb.n_);
        gl.depthMask(true); gl.disable(gl.BLEND); dis();
      }
    };
  }
  // ---------- géométrie procédurale ----------
  // Une "pièce" = liste de maillages { k: matière, col, tag, xf, p, n }.
  function Builder(tag, xf) {
    const K = {};
    const add = (key, p, n) => { const o = (K[key] = K[key] || { p: [], n: [] }); for (let i = 0; i < p.length; i++) { o.p.push(p[i]); o.n.push(n[i]); } };
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], addv = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mulv = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm = (a) => { const l = Math.hypot(...a) || 1; return mulv(a, 1 / l); };
    const tri = (k, a, b, c) => { let nn = norm(cross(sub(b, a), sub(c, a))); nn = mulv(nn, 127); add(k, [...a, ...b, ...c], [...nn, ...nn, ...nn]); };
    const quad = (k, a, b, c, d) => { tri(k, a, b, c); tri(k, a, c, d); };
    const B = {
      sub, addv, mulv, cross, norm, quad, tri,
      box(k, cx, cy, cz, sx, sy, sz) {
        const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
        quad(k, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]); quad(k, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
        quad(k, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]); quad(k, [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]);
        quad(k, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]); quad(k, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
      },
      // poutre de a à b, section w (le long de `side`) × h
      beam(k, a, b, w, h, side) {
        const d = norm(sub(b, a)); let s = norm(side || [1, 0, 0]); s = norm(sub(s, mulv(d, s[0] * d[0] + s[1] * d[1] + s[2] * d[2]))); const u = cross(d, s);
        const c = (p, i, j) => addv(addv(p, mulv(s, i * w / 2)), mulv(u, j * h / 2));
        const A = [c(a, -1, -1), c(a, 1, -1), c(a, 1, 1), c(a, -1, 1)], Bq = [c(b, -1, -1), c(b, 1, -1), c(b, 1, 1), c(b, -1, 1)];
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(k, A[i], A[j], Bq[j], Bq[i]); }
        quad(k, A[3], A[2], A[1], A[0]); quad(k, Bq[0], Bq[1], Bq[2], Bq[3]);
      },
      cyl(k, a, b, r, seg, r2, caps) {
        seg = seg || 18; r2 = r2 == null ? r : r2; const w = norm(sub(b, a));
        let u = Math.abs(w[1]) < .9 ? [0, 1, 0] : [1, 0, 0]; const v = norm(cross(w, u)); u = cross(v, w);
        for (let i = 0; i < seg; i++) {
          const t0 = i / seg * 6.2832, t1 = (i + 1) / seg * 6.2832;
          const o0 = addv(mulv(u, Math.cos(t0)), mulv(v, Math.sin(t0))), o1 = addv(mulv(u, Math.cos(t1)), mulv(v, Math.sin(t1)));
          const p00 = addv(a, mulv(o0, r)), p01 = addv(b, mulv(o0, r2)), p10 = addv(a, mulv(o1, r)), p11 = addv(b, mulv(o1, r2));
          const n0 = mulv(o0, 127), n1 = mulv(o1, 127);
          add(k, [...p00, ...p10, ...p11, ...p00, ...p11, ...p01], [...n0, ...n1, ...n1, ...n0, ...n1, ...n0]);
          if (caps !== false) { const wn = mulv(w, 127), wm = mulv(w, -127); add(k, [...b, ...p01, ...p11], [...wn, ...wn, ...wn]); add(k, [...a, ...p10, ...p00], [...wm, ...wm, ...wm]); }
        }
      },
      disc(k, c, nrm, r, seg, r0) {
        seg = seg || 28; const w = norm(nrm); let u = Math.abs(w[1]) < .9 ? [0, 1, 0] : [1, 0, 0]; const v = norm(cross(w, u)); u = cross(v, w); const wn = mulv(w, 127);
        for (let i = 0; i < seg; i++) {
          const t0 = i / seg * 6.2832, t1 = (i + 1) / seg * 6.2832;
          const e0 = addv(mulv(u, Math.cos(t0)), mulv(v, Math.sin(t0))), e1 = addv(mulv(u, Math.cos(t1)), mulv(v, Math.sin(t1)));
          if (r0) { const a = addv(c, mulv(e0, r0)), b = addv(c, mulv(e1, r0)), cc = addv(c, mulv(e1, r)), d = addv(c, mulv(e0, r)); add(k, [...a, ...b, ...cc, ...a, ...cc, ...d], [...wn, ...wn, ...wn, ...wn, ...wn, ...wn]); }
          else add(k, [...c, ...addv(c, mulv(e0, r)), ...addv(c, mulv(e1, r))], [...wn, ...wn, ...wn]);
        }
      },
      panel(k, c, nrm, upv, w, h) {
        const n = norm(nrm); const r = norm(cross(upv, n)); const u = cross(n, r);
        const P = (sx, sy) => addv(addv(c, mulv(r, sx * w / 2)), mulv(u, sy * h / 2));
        const nn = mulv(n, 127); add(k, [...P(-1, -1), ...P(1, -1), ...P(1, 1), ...P(-1, -1), ...P(1, 1), ...P(-1, 1)], [...nn, ...nn, ...nn, ...nn, ...nn, ...nn]);
      },
      // surface lissée : grille [stations][points d'anneau fermé], normales par différences centrales
      loft(k, G, caps) {
        const ns = G.length, nr = G[0].length; const NR = G.map((ring, i) => ring.map((p, j) => {
          const a = sub(ring[(j + 1) % nr], ring[(j - 1 + nr) % nr]), c = sub(G[Math.min(ns - 1, i + 1)][j], G[Math.max(0, i - 1)][j]);
          return mulv(norm(cross(a, c)), 127); }));
        for (let i = 0; i < ns - 1; i++) for (let j = 0; j < nr; j++) { const j2 = (j + 1) % nr;
          const p = [G[i][j], G[i][j2], G[i + 1][j2], G[i + 1][j]], n = [NR[i][j], NR[i][j2], NR[i + 1][j2], NR[i + 1][j]];
          add(k, [...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]], [...n[0], ...n[1], ...n[2], ...n[0], ...n[2], ...n[3]]); }
        if (caps !== false) [0, ns - 1].forEach((i) => { const ring = G[i]; const c = mulv(ring.reduce((s, p) => addv(s, p), [0, 0, 0]), 1 / nr);
          const nn = mulv(norm(cross(sub(ring[1], ring[0]), sub(ring[2], ring[0]))), 127);
          for (let j = 0; j < nr; j++) add(k, [...c, ...ring[j], ...ring[(j + 1) % nr]], [...nn, ...nn, ...nn]); });
      },
      sphere(k, c, r, seg) { seg = seg || 20; const G = []; for (let i = 0; i <= seg / 2; i++) { const t = Math.PI * i / (seg / 2); const ring = [];
          for (let j = 0; j < seg; j++) { const a = j / seg * 6.2832; ring.push([c[0] + r * Math.sin(t) * Math.cos(a), c[1] + r * Math.cos(t), c[2] + r * Math.sin(t) * Math.sin(a)]); } G.push(ring); }
        B.loft(k, G, false); },
      tube(k, pts, r, seg) { for (let i = 0; i < pts.length - 1; i++) B.cyl(k, pts[i], pts[i + 1], r, seg || 12, r, i === 0 || i === pts.length - 2); },
      helix(k, a, b, R, turns, r) { const w = norm(sub(b, a)); let u = Math.abs(w[1]) < .9 ? [0, 1, 0] : [1, 0, 0]; const v = norm(cross(w, u)); u = cross(v, w); const L = Math.hypot(...sub(b, a)); const n = Math.round(turns * 14); const pts = [];
        for (let i = 0; i <= n; i++) { const t = i / n, th = t * turns * 6.2832; pts.push(addv(addv(a, mulv(w, t * L)), addv(mulv(u, Math.cos(th) * R), mulv(v, Math.sin(th) * R)))); } B.tube(k, pts, r, 8); },
      out() { return Object.keys(K).map((key) => { const [k, col] = key.split('|'); return { k: +k, acc: col === 'ACC', col: col && col !== 'ACC' ? col.split(',').map(Number) : null, tag, xf: xf || 0, p: new Float32Array(K[key].p), n: new Float32Array(K[key].n) }; }); }
    };
    return B;
  }
  const RED = '11', CARB = '13', ALU = '2|.78,.79,.82', GUN = '2|.30,.31,.33', BLK = '4';
  const WHEELS = [[-1, -1.067], [1, -1.067], [-1, 1.319], [1, 1.319]];
  const WY = .331, WX = .711;
  function rpf1(B, side, z) { // Enkei RPF1 17" : 6 paires de rayons jumeaux, voile concave, lèvre plate usinée, moyeu 5 trous
    const c = [side * WX, WY, z], ax = [side, 0, 0];
    const P = (r, th, d) => [c[0] + side * d, c[1] + Math.cos(th) * r, c[2] + Math.sin(th) * r];
    const SIL = '2|.60,.61,.64', LIP = '2|.74,.75,.78', DARK = '2|.20,.21,.23';
    // point dans le repère du rayon : r radial, l latéral, d profondeur (vers l'extérieur)
    const Q = (th, r, l, d) => [c[0] + side * d, c[1] + Math.cos(th) * r - Math.sin(th) * l, c[2] + Math.sin(th) * r + Math.cos(th) * l];
    const prism = (k, th, r0, r1, l0, l1, w0, w1, d0, d1, t) => {
      const f = (r, l, w, d, s, back) => Q(th, r, l + s * w / 2, d - (back ? t : 0));
      const A = [f(r0, l0, w0, d0, -1, 0), f(r0, l0, w0, d0, 1, 0), f(r1, l1, w1, d1, 1, 0), f(r1, l1, w1, d1, -1, 0)];
      const Bk = [f(r0, l0, w0 * 1.15, d0, -1, 1), f(r0, l0, w0 * 1.15, d0, 1, 1), f(r1, l1, w1 * 1.15, d1, 1, 1), f(r1, l1, w1 * 1.15, d1, -1, 1)];
      B.quad(k, A[0], A[1], A[2], A[3]); B.quad(k, Bk[3], Bk[2], Bk[1], Bk[0]);
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; B.quad(k, A[i], Bk[i], Bk[j], A[j]); }
    };
    B.cyl(DARK, P(0, 0, -.100), P(0, 0, .088), .236, 48, .236, false);                    // fût sombre (profondeur)
    B.disc(LIP, P(0, 0, .104), ax, .246, 72, .221);                                        // lèvre plate usinée
    B.cyl(LIP, P(0, 0, .104), P(0, 0, .096), .246, 72, .246, false);
    B.cyl('2|.48,.49,.52', P(0, 0, .104), P(0, 0, .084), .221, 72, .219, false);           // marche de lèvre
    B.disc(DARK, P(0, 0, .0845), ax, .222, 72, .205);                                      // fond de jante
    for (let i = 0; i < 6; i++) {
      const th = i / 6 * 6.2832 + .26;
      prism(SIL, th, .066, .118, 0, 0, .052, .050, .060, .067, .024);                    // racine commune
      [-1, 1].forEach((s) => prism(SIL, th, .104, .222, s * .0105, s * .0225, .022, .030, .066, .088, .028));
      prism(SIL, th, .104, .140, 0, 0, .014, .004, .067, .071, .022);                       // pont entre jumeaux
    }
    B.cyl(SIL, P(0, 0, .040), P(0, 0, .062), .082, 48, .078);                              // moyeu
    B.disc(SIL, P(0, 0, .0625), ax, .078, 48, .030);
    B.cyl(DARK, P(0, 0, .0626), P(0, 0, .050), .030, 24, .030, false);                     // alésage
    B.disc('4|.04,.04,.045', P(0, 0, .051), ax, .030, 24);
    for (let i = 0; i < 5; i++) {
      const th = i / 5 * 6.2832 + .26 + .628;
      B.disc('4|.03,.03,.035', P(.052, th, .0628), ax, .0115, 14);                         // logement d'écrou
      B.cyl('2|.82,.83,.86', P(.052, th, .048), P(.052, th, .060), .0072, 6);               // écrou
    }
  }
  function coilover(B, bot, top, R) { // combiné fileté BC Racing
    const d = B.norm(B.sub(top, bot)); const L = Math.hypot(...B.sub(top, bot));
    B.cyl(GUN, bot, B.addv(bot, B.mulv(d, L * .55)), .028, 16);                         // corps
    B.cyl('2|.75,.76,.8', B.addv(bot, B.mulv(d, L * .5)), top, .012, 10);               // tige
    B.cyl(RED, B.addv(bot, B.mulv(d, L * .42)), B.addv(bot, B.mulv(d, L * .46)), R + .008, 20); // coupelle
    B.helix(RED, B.addv(bot, B.mulv(d, L * .46)), B.addv(bot, B.mulv(d, L * .92)), R, 6, .009);
    B.cyl(GUN, B.addv(bot, B.mulv(d, L * .92)), top, .04, 18);                          // platine
  }
  function staticParts() {
    const out = [];
    WHEELS.forEach(([s, z]) => { const B = Builder('rims', 4); rpf1(B, s, z); out.push(...B.out().map((m) => Object.assign(m, { pv: [s * WX, WY, z] }))); });   // une jante par roue : elles tournent en roulage
    { const B = Builder('coil');
      [-1, 1].forEach((s) => { coilover(B, [s * .64, .40, -1.07], [s * .585, .92, -1.08], .052); coilover(B, [s * .58, .34, 1.30], [s * .56, .74, 1.24], .0); });
      out.push(...B.out()); }
    { const B = Builder('grillback'); B.box('4|.02,.02,.022', 0, .53, -1.655, .74, .42, .012); out.push(...B.out()); }   // fond noir derrière la calandre
    { const B = Builder('trains'); const PF = '2|.46,.20,.72';                      // trains roulants + silent-blocs Powerflex (violets)
      [-1, 1].forEach((s) => {
        B.beam(GUN, [s * .30, .30, -.98], [s * .63, .27, -1.07], .035, .022, [0, 1, 0]); B.beam(GUN, [s * .30, .30, -1.24], [s * .63, .27, -1.07], .035, .022, [0, 1, 0]);   // triangle avant
        B.cyl(PF, [s * .30, .30, -.95], [s * .30, .30, -1.01], .026, 14); B.cyl(PF, [s * .30, .30, -1.21], [s * .30, .30, -1.27], .026, 14);
        B.cyl(GUN, [s * .63, .255, -1.07], [s * .63, .29, -1.07], .022, 12);                                                    // rotule
        B.beam(GUN, [s * .56, .36, .80], [s * .62, .32, 1.32], .05, .06, [1, 0, 0]);                                             // bras tiré arrière
        B.cyl(PF, [s * .52, .36, .80], [s * .60, .36, .80], .036, 16);
      });
      B.beam(GUN, [-.40, .31, -1.11], [.40, .31, -1.11], .06, .05, [0, 0, 1]);                                                // berceau avant
      B.beam(GUN, [-.58, .30, 1.16], [.58, .30, 1.16], .07, .05, [0, 0, 1]);                                                  // essieu de torsion
      out.push(...B.out()); }
    { const B = Builder('rearbar'); B.beam(RED, [-.55, .30, 1.05], [.55, .30, 1.05], .05, .03, [0, 0, 1]); B.box(RED, -.55, .30, 1.05, .1, .04, .12); B.box(RED, .55, .30, 1.05, .1, .04, .12); out.push(...B.out()); }
    { const B = Builder('diffx'); const pts = [[-.34, .44], [-.17, .365], [.17, .365], [.34, .44]];
      for (let i = 0; i < 3; i++) B.beam('2|.22,.22,.24', [pts[i][0], pts[i][1], 1.905], [pts[i + 1][0], pts[i + 1][1], 1.905], .018, .012, [0, 0, 1]);
      out.push(...B.out()); }
    { const B = Builder('echap');                                                       // sorties titane : double paroi, lèvre roulée, 72 facettes
      [-1, 1].forEach((sx) => { const x = sx * .437, y = .363, T = '7', S = 72;
        const ring = (r0, z0, r1, z1, k) => B.cyl(k || T, [x, y, z0], [x, y, z1], r0, S, r1, false);
        ring(.0395, 1.752, .0425, 1.80); ring(.0425, 1.80, .0430, 1.880);                 // corps légèrement conique
        ring(.0430, 1.880, .0440, 1.886); ring(.0440, 1.886, .0436, 1.891); ring(.0436, 1.891, .0410, 1.8935); ring(.0410, 1.8935, .0382, 1.892); ring(.0382, 1.892, .0370, 1.887);   // lèvre roulée
        ring(.0370, 1.887, .0370, 1.83);                                                 // paroi intérieure
        B.disc(T, [x, y, 1.8930], [0, 0, 1], .0438, S, .0372);                            // face de la lèvre
        B.disc('4|.012,.012,.013', [x, y, 1.752], [0, 0, 1], .078, 48); B.box('4|.012,.012,.013', x, .335, 1.735, .20, .17, .012); B.cyl('4|.012,.012,.013', [x, y, 1.70], [x, y, 1.752], .078, 48, .078, false);   // fond noir derrière l'embout
        ring(.0300, 1.84, .0300, 1.70, '4|.02,.02,.02'); B.disc('4|.01,.01,.01', [x, y, 1.80], [0, 0, 1], .037, 36);   // tube et fond, noircis
      });
      out.push(...B.out()); }
    { const B = Builder('f1'); B.box(BLK, 0, .31, 1.885, .14, .055, .03); B.box('12|1,.05,.07', 0, .31, 1.902, .12, .04, .005); out.push(...B.out()); }
    return out;
  }
  function engineParts() {
    const out = []; const arc = (c, rad, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([c[0], c[1] + Math.sin(a) * rad, c[2] - Math.cos(a) * rad * .8]); } return o; };
    const rr = (x, cy, cz, h, w, r, n) => { const P = []; const cs = [[w / 2 - r, h / 2 - r], [-(w / 2 - r), h / 2 - r], [-(w / 2 - r), -(h / 2 - r)], [w / 2 - r, -(h / 2 - r)]];
      for (let q = 0; q < 4; q++) for (let i = 0; i <= n; i++) { const a = (q + i / n) * Math.PI / 2; P.push([x, cy + cs[q][1] + Math.sin(a) * r, cz + cs[q][0] + Math.cos(a) * r]); } return P; };
    const CAST = '19|.56,.57,.58', CASTD = '19|.34,.35,.36', PLA = '4|.035,.035,.038', RUB = '4|.018,.018,.02';
    { const B = Builder('bay'); // structure du compartiment : passages de roue et dômes couleur carrosserie, fond noir
      B.box(BLK, 0, .47, -1.30, 1.30, .02, .74); B.box(BLK, 0, .74, -.92, 1.30, .40, .02); B.box('9', 0, .965, -.9, 1.36, .03, .06);
      [-1, 1].forEach((s) => {
        B.cyl('0', [s * .58, .60, -1.08], [s * .58, .90, -1.08], .105, 28, .085);                    // dôme d'amortisseur (couleur caisse)
        B.disc('0', [s * .58, .90, -1.08], [0, 1, 0], .085, 28);
        B.box('0', s * .645, .74, -1.30, .016, .24, .46);                                            // passage de roue intérieur
        for (let i = 0; i < 3; i++) B.cyl('2|.55,.56,.58', [s * .58 + (i - 1) * .045, .90, -1.08 + (i % 2 ? .04 : -.035)], [s * .58 + (i - 1) * .045, .915, -1.08 + (i % 2 ? .04 : -.035)], .009, 6);   // écrous de dôme
      });
      out.push(...B.out()); }
    { const B = Builder('block');                                                                    // M16A : bloc, culasse, couvre-culasse alu, 4 bobines
      B.box(CASTD, .05, .58, -1.30, .62, .24, .30);                                                  // bloc
      for (let i = 0; i < 5; i++) B.box(CASTD, -.20 + i * .125, .58, -1.452, .025, .20, .012);       // nervures du bloc
      B.box(CAST, .05, .745, -1.30, .60, .09, .29);                                                  // culasse
      const G = []; for (let i = 0; i <= 14; i++) { const t = i / 14, x = -.25 + .58 * t; const e = Math.min(1, Math.min(t, 1 - t) * 9); G.push(rr(x, .835, -1.30, .08 * (.7 + .3 * e), .27 * (.92 + .08 * e), .028, 4)); }
      B.loft(CAST, G);                                                                               // couvre-culasse arrondi
      B.box(CAST, .04, .878, -1.30, .54, .016, .11);                                                 // dos central
      for (let i = 0; i < 6; i++) B.box(CAST, -.21 + i * .1, .835, -1.437, .012, .05, .012);          // nervures avant
      for (let i = 0; i < 4; i++) { const x = -.18 + i * .155;                                       // bobines crayon
        B.cyl(RUB, [x, .86, -1.30], [x, .90, -1.30], .026, 18);
        B.box(PLA, x, .905, -1.30, .062, .03, .075); B.box(PLA, x, .905, -1.255, .034, .022, .03);      // tête + connecteur
        B.cyl(CAST, [x + .04, .884, -1.34], [x + .04, .896, -1.34], .008, 8); }                      // vis
      B.tube(RUB, [[-.24, .925, -1.255], [.04, .93, -1.24], [.32, .925, -1.255]], .007, 6);            // faisceau des bobines
      B.cyl(PLA, [.27, .862, -1.40], [.27, .892, -1.40], .036, 24); B.cyl(PLA, [.27, .892, -1.40], [.27, .902, -1.40], .028, 20);   // bouchon d'huile
      B.tube('9|.95,.72,.06', [[.21, .76, -1.17], [.21, .86, -1.17], [.21, .92, -1.17]], .006, 6);      // jauge à huile jaune
      B.tube('9|.95,.72,.06', [[.21, .92, -1.17], [.235, .945, -1.17], [.21, .965, -1.17], [.185, .945, -1.17], [.21, .92, -1.17]], .008, 8);
      for (let i = 0; i < 4; i++) { const x = -.18 + i * .155;                                       // collecteur d'admission noir à pipes galbées
        B.tube(PLA, [[x, .74, -1.165], [x, .80, -1.165], [x, .865, -1.12], [x, .87, -1.05], [x, .82, -1.005], [x, .76, -1.0]], .028, 14); }
      B.cyl(PLA, [-.30, .76, -.99], [.30, .76, -.99], .06, 22);                                       // plénum
      B.box(PLA, 0, .735, -1.165, .62, .04, .03);                                                    // bride
      B.cyl(CAST, [.30, .80, -1.02], [.38, .84, -1.02], .052, 22);                                    // boîtier papillon
      [[.37, .48, -1.36, .075], [.37, .70, -1.42, .058], [.37, .52, -1.50, .05]].forEach(([x, y, z, r]) => { B.cyl(PLA, [x, y, z], [x + .03, y, z], r, 28); B.cyl(CAST, [x + .03, y, z], [x + .035, y, z], r * .45, 18); });   // poulies
      B.beam(RUB, [.39, .55, -1.36], [.39, .69, -1.45], .022, .006, [1, 0, 0]); B.beam(RUB, [.39, .41, -1.37], [.39, .48, -1.54], .022, .006, [1, 0, 0]);   // courroie
      B.box(CAST, .35, .62, -1.28, .03, .30, .26);                                                   // carter de distribution
      out.push(...B.out()); }
    { const B = Builder('airbox');
      B.box(CARB, .47, .76, -1.47, .26, .16, .26); B.cyl(CARB, [.47, .84, -1.47], [.47, .86, -1.47], .11, 28);            // côté passager sur la version européenne
      B.tube(CARB, [[.38, .84, -1.02], [.45, .835, -1.12], [.485, .80, -1.27], [.48, .80, -1.36]], .045, 16);
      out.push(...B.out()); }
    { const B = Builder('manifold');                                                                // collecteur sous écran thermique gaufré
      for (let i = 0; i < 4; i++) { const x = -.18 + i * .155; B.tube('2|.42,.40,.38', [[x, .70, -1.46], [x, .64, -1.52], [x * .5 + .02, .54, -1.56]], .022, 10); }
      const Z = (x, y) => -1.485 - .035 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x + .24) / .54))) * Math.sin(Math.PI * Math.min(1, Math.max(0, (y - .48) / .28)));
      const nx = 12, ny = 7; for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const x0 = -.24 + .54 * i / nx, x1 = -.24 + .54 * (i + 1) / nx, y0 = .48 + .28 * j / ny, y1 = .48 + .28 * (j + 1) / ny;
        B.quad('18|.80,.80,.82', [x0, y0, Z(x0, y0)], [x1, y0, Z(x1, y0)], [x1, y1, Z(x1, y1)], [x0, y1, Z(x0, y1)]); }
      B.cyl('2|.62,.63,.66', [-.05, .62, -1.53], [-.05, .62, -1.50], .028, 14);                        // sonde lambda
      out.push(...B.out()); }
    { const B = Builder('battery');                                                                 // batterie et bac
      const X = -.47, Y = .53, Z = -1.45;
      B.box(PLA, X, Y - .005, Z, .25, .03, .31); B.box(PLA, X, Y + .03, Z - .15, .25, .05, .012); B.box(PLA, X, Y + .03, Z + .15, .25, .05, .012);   // bac
      B.box('4|.03,.03,.033', X, Y + .1, Z, .20, .17, .27);                                           // caisse
      for (let i = 0; i < 6; i++) B.box('4|.04,.04,.044', X - .1005, Y + .1, Z - .11 + i * .044, .003, .15, .018);   // nervures
      B.box('9|.16,.16,.17', X, Y + .19, Z, .205, .016, .275);                                        // couvercle
      B.box('9|.85,.74,.12', X + .04, Y + .199, Z + .06, .09, .002, .08);                             // étiquette
      B.box('9|.82,.07,.09', X + .05, Y + .205, Z - .095, .07, .028, .06); B.box('9|.82,.07,.09', X + .05, Y + .222, Z - .095, .05, .01, .04);   // cache cosse +
      B.cyl(CAST, [X - .06, Y + .198, Z - .10], [X - .06, Y + .22, Z - .10], .013, 12);               // cosse -
      B.beam(PLA, [X - .1, Y + .21, Z + .02], [X + .1, Y + .21, Z + .02], .022, .012, [0, 0, 1]);     // bride de maintien
      [-1, 1].forEach((s) => B.cyl(CAST, [X + s * .105, Y + .03, Z + .02], [X + s * .105, Y + .21, Z + .02], .004, 6));
      B.tube('9|.75,.06,.08', [[X + .05, Y + .23, Z - .095], [X + .12, Y + .22, Z - .05], [X + .20, Y + .16, Z + .02]], .011, 8);   // câble +
      B.tube(RUB, [[X - .06, Y + .22, Z - .10], [X - .10, Y + .14, Z - .17], [X - .12, Y + .04, Z - .20]], .010, 8);
      B.box(PLA, -.50, .73, -1.17, .13, .07, .16); B.box('4|.05,.05,.055', -.50, .768, -1.17, .135, .008, .165);   // boîte à fusibles
      out.push(...B.out()); }
    { const B = Builder('ecu'); B.box(ALU, -.52, .74, -1.04, .16, .04, .18); B.box(BLK, -.52, .765, -1.04, .14, .012, .16); B.box(BLK, -.44, .74, -1.04, .03, .03, .12); out.push(...B.out()); }
    { const B = Builder('radiator');
      B.box('2|.35,.36,.38', 0, .60, -1.62, 1.0, .28, .04); 
      B.cyl(BLK, [-.25, .60, -1.58], [-.25, .60, -1.55], .11, 24); B.cyl(BLK, [.25, .60, -1.58], [.25, .60, -1.55], .11, 24);
      B.tube(RED, [[.33, .78, -1.40], [.40, .72, -1.52], [.32, .66, -1.60]], .026, 14); B.tube(RED, [[-.10, .60, -1.46], [-.25, .55, -1.52], [-.32, .58, -1.60]], .024, 14);
      B.tube(RED, [[.56, .70, -1.0], [.45, .66, -1.1], [.38, .70, -1.25]], .016, 12);
      B.cyl('0|.85,.85,.82', [.56, .66, -1.00], [.56, .80, -1.00], .055, 18); B.cyl(RED, [.56, .80, -1.00], [.56, .83, -1.00], .032, 16);
      out.push(...B.out()); }
    { const B = Builder('oil');
      B.cyl(RED, [.31, .87, -1.20], [.31, .90, -1.20], .032, 18);                      // bouchon d'huile
      B.cyl('8', [.20, .52, -1.46], [.20, .52, -1.53], .045, 20);                      // filtre HKS
      B.cyl(ALU, [.20, .52, -1.44], [.20, .52, -1.46], .05, 20);                       // plaque sandwich
      B.box(ALU, .05, .46, -1.30, .50, .06, .26); B.cyl(RED, [.05, .425, -1.30], [.05, .41, -1.30], .016, 10); // carter + bouchon de vidange
      B.cyl('0|.85,.85,.82', [-.36, .82, -.96], [-.36, .90, -.96], .035, 16); B.cyl(BLK, [-.36, .90, -.96], [-.36, .92, -.96], .025, 14);
      out.push(...B.out()); }
    { const B = Builder('gearbox');
      B.cyl(ALU, [-.26, .56, -1.28], [-.36, .56, -1.28], .15, 28);                     // carter d'embrayage
      B.box(ALU, -.47, .52, -1.26, .22, .22, .28); B.cyl(ALU, [-.47, .40, -1.17], [-.47, .40, -1.10], .08, 20); // boîte + différentiel
      B.cyl('2|.4,.4,.42', [-.47, .40, -1.12], [-.68, .34, -1.07], .022, 10); B.cyl('2|.4,.4,.42', [-.40, .40, -1.12], [.68, .34, -1.07], .022, 10);
      out.push(...B.out()); }
    { const B = Builder('strut'); B.cyl('8', [-.58, .94, -1.08], [.58, .94, -1.08], .02, 16); B.box('8', -.58, .935, -1.08, .14, .015, .14); B.box('8', .58, .935, -1.08, .14, .015, .14); out.push(...B.out()); }
    return out;
  }
  function cabinParts() {
    const out = []; const eye = [-.33, 1.16, .30]; const to = (p) => [eye[0] - p[0], eye[1] - p[1], eye[2] - p[2]];
    const dial = (B, p, r, ang, ring) => { const n = B.norm(to(p)); const off = (k) => B.addv(p, B.mulv(n, k));
      B.cyl(GUN, B.addv(p, B.mulv(n, -.025)), p, r + .006, 28); B.disc(ring || '12|ACC', off(.001), n, r, 32, r * .9); B.disc('12|.05,.05,.06', off(.0015), n, r * .9, 32);
      for (let i = 0; i <= 8; i++) { const a = 3.93 - i * .98; const rt = B.norm(B.cross([0, 1, 0], n)); const up = B.cross(n, rt); const dir = B.addv(B.mulv(rt, Math.cos(a)), B.mulv(up, Math.sin(a))); B.panel('12|.8,.8,.82', B.addv(off(.002), B.mulv(dir, r * .78)), n, dir, r * .03, r * .14); }
      const rt = B.norm(B.cross([0, 1, 0], n)); const up = B.cross(n, rt); const dir = B.addv(B.mulv(rt, Math.cos(ang)), B.mulv(up, Math.sin(ang)));
      B.panel('12|1,.35,.08', B.addv(off(.003), B.mulv(dir, r * .36)), n, dir, r * .07, r * .72); B.disc('12|.8,.8,.8', off(.004), n, r * .1, 12); };
    { const B = Builder('casq'); B.box(BLK, 0, 1.03, -.625, .30, .07, .075); [[-.095, 2.2], [0, 1.4], [.095, .7]].forEach(([x, a]) => dial(B, [x, 1.05, -.566], .029, a)); out.push(...B.out()); }
    { const B = Builder('gauge'); const p = [-.515, 1.112, -.418]; B.beam(BLK, [-.585, 1.10, -.475], p, .02, .02, [0, 1, 0]); dial(B, p, .033, 2.6); out.push(...B.out()); }
    { const B = Builder('sp'); const c = [-.10, .70, -.30]; const n = B.norm(B.mulv(B.sub(to(c), [0, to(c)[1], 0]), 1)); const side = B.norm(B.cross([0, 1, 0], n));
      B.beam(BLK, B.addv(c, B.mulv(n, -.022)), B.addv(c, B.mulv(n, .022)), .085, .062, side); B.box(GUN, c[0], .665, c[2], .03, .01, .03);
      B.panel('12|ACC', B.addv(c, B.mulv(n, .0232)), n, [0, 1, 0], .055, .04); out.push(...B.out()); }
    { const B = Builder('media'); const n = B.norm([0, .6, .8]); const p = [0, .885, -.405];
      B.panel(BLK, B.addv(p, B.mulv(n, .004)), n, [0, 1, 0], .205, .125); B.panel('12|.20,.48,1', B.addv(p, B.mulv(n, .0055)), n, [0, 1, 0], .185, .105);
      B.panel('12|.9,.9,.95', B.addv(B.addv(p, B.mulv(n, .006)), [0, .035, 0]), n, [0, 1, 0], .05, .008); out.push(...B.out()); }
    { const B = Builder('cluster'); // compteurs derrière le volant
      const fw = (p, k) => B.addv(p, B.mulv(B.norm(to(p)), k));                 // avancés devant le bloc compteur d'origine
      dial(B, fw([-.40, .955, -.512], .024), .043, 2.2, '12|.85,.85,.9'); dial(B, fw([-.268, .955, -.512], .024), .043, 1.1, '12|.85,.85,.9');
      const p = fw([-.334, .95, -.515], .022); B.panel('12|.15,.35,.6', p, to(p), [0, 1, 0], .05, .06); out.push(...B.out()); }
    { const B = Builder('levier'); B.cyl(BLK, [0, .60, -.10], [0, .685, -.122], .011, 12); B.cyl('2|.75,.76,.8', [0, .675, -.119], [0, .688, -.123], .016, 18, .013); B.sphere('9|.93,.93,.92', [0, .712, -.126], .029, 28); out.push(...B.out()); }
    { const B = Builder('pedals'); [-.43, -.35, -.26].forEach((x, i) => { B.beam(GUN, [x, .56, -.80], [x, .40, -.74], .012, .012, [1, 0, 0]); B.box(ALU, x, .385, -.735, i === 2 ? .05 : .065, .07, .012); }); B.box(ALU, -.53, .37, -.70, .06, .10, .012); out.push(...B.out()); }
    { const B = Builder('speakers'); B.disc(GUN, [.607, .50, -.45], [-1, 0, 0], .068, 32); B.disc('2|.5,.5,.53', [.605, .50, -.45], [-1, 0, 0], .028, 24); B.disc(ALU, [.6055, .50, -.45], [-1, 0, 0], .07, 32, .064); out.push(...B.out()); }
    { const B = Builder('armrest');                                            // accoudoir : coussin cuir sur coffre, style accessoire
      const rr = (cy, w, h, r, z, n) => { const pts = []; const cx = [w / 2 - r, -(w / 2 - r), -(w / 2 - r), w / 2 - r], cyy = [h / 2 - r, h / 2 - r, -(h / 2 - r), -(h / 2 - r)];
        for (let q = 0; q < 4; q++) for (let s = 0; s <= n; s++) { const a = (q + s / n) * Math.PI / 2; pts.push([cx[q] + Math.cos(a) * r, cy + cyy[q] + Math.sin(a) * r, z]); } return pts; };
      const body = (z0, z1, prof, R, ns) => { const G = []; for (let i = 0; i <= ns; i++) { const t = i / ns, z = z0 + (z1 - z0) * t;
          const dz = Math.min(z - z0, z1 - z); const e = dz >= R ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((R - dz) / R, 2)));
          const [cy, w, h, r] = prof(t); const sh = R * (1 - e); G.push(rr(cy, Math.max(.01, w - 2 * sh), Math.max(.006, h - 2 * sh * .8), Math.max(.002, Math.min(r, (w - 2 * sh) / 2 - .001, (h - 2 * sh * .8) / 2 - .001)), z, 5)); } return G; };
      // coffre : plus large en haut, face avant arrondie
      B.loft('4|.03,.03,.033', body(.0, .27, (t) => [.600, .150, .080, .02], .035, 18));
      B.box(BLK, 0, .535, .14, .09, .06, .17);                                  // pied
      B.loft('4|.015,.015,.017', body(-.008, .272, () => [.646, .158, .012, .005], .02, 14));   // joint du couvercle
      // coussin bombé en simili cuir
      B.loft('9|.085,.085,.09', body(-.035, .275, (t) => [.676 + .006 * Math.sin(t * Math.PI), .170, .052, .022], .045, 24));
      // surpiqûre discrète en bordure
      [-1, 1].forEach((s) => B.beam('9|.16,.16,.17', [s * .079, .695, -.005], [s * .079, .695, .245], .0018, .0018, [0, 1, 0]));
      out.push(...B.out()); }
    { const B = Builder('leds'); B.box('12|ACC', -.38, .72, -.52, .30, .006, .01); B.box('12|ACC', .38, .72, -.52, .30, .006, .01); out.push(...B.out()); }
    { const B = Builder('style');                                              // finitions de la cabine (d'après les photos)
      const wc = [-.334, .92, -.225], up = B.norm([0, .34, -.19]), nw = B.norm([0, .19, .34]), rt = [1, 0, 0];
      const onW = (r, a, off) => B.addv(B.addv(wc, B.mulv(nw, off)), B.addv(B.mulv(rt, Math.cos(a) * r), B.mulv(up, Math.sin(a) * r)));
            // surpiqûres rouges
      B.cyl(BLK, [0, .55, -.08], [0, .64, -.115], .07, 20, .02); const st = []; for (let i = 0; i <= 10; i++) st.push([0, .55 + i * .009, -.08 - i * .0035 + .0]); // soufflet
      [-1, 1].forEach((s) => { const L = []; for (let i = 0; i <= 10; i++) { const k = i / 10, r = .07 + (.02 - .07) * k; L.push([s * r * .72, .55 + k * .09, -.08 - k * .035 + r * .7 * 0]); } B.tube(RED, L, .0022, 5); });
      /*fr*/ const fr0 = (cx, cy, cz, w, h) => { const n = [0, .2, 1]; const T = .0045; const pts = [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2], [cx - w / 2, cy - h / 2]]; for (let i = 0; i < 4; i++) B.beam(ALU, [pts[i][0], pts[i][1], cz], [pts[i + 1][0], pts[i + 1][1], cz], T, T, n); };
      out.push(...B.out()); }
    { const B = Builder('trim'); B.box(ALU, -.38, .865, -.565, .22, .008, .006); B.box(ALU, .38, .865, -.565, .22, .008, .006); B.cyl(ALU, [-.08, .86, -.555], [-.08, .86, -.545], .02, 16); B.cyl(ALU, [.08, .86, -.555], [.08, .86, -.545], .02, 16); out.push(...B.out()); }
    return out;
  }

  function Swift3D(canvas, data) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL indisponible');
    gl.getExtension('OES_element_index_uint');
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); return p; };
    const P = prog(VS, FS), X = prog(VS, XS), F = prog(FLOOR_VS, FLOOR_FS), BG = prog(BG_VS, BG_FS);
    const UL = new Map(); const U = (p, n) => { let m = UL.get(p); if (!m) UL.set(p, (m = {})); return m[n] !== undefined ? m[n] : (m[n] = gl.getUniformLocation(p, n)); };
    const mk = (target, d, dyn) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, d, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); return b; };
    const bp = mk(gl.ARRAY_BUFFER, data._pos), bn = mk(gl.ARRAY_BUFFER, data._nrm), bi = mk(gl.ELEMENT_ARRAY_BUFFER, data._idx);
    const bf = mk(gl.ARRAY_BUFFER, new Float32Array([-12, -12, 12, -12, -12, 12, 12, 12])), bq = mk(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]));
    const lo = data.lo, sc = data.hi.map((h, i) => (h - lo[i]) / 65535);
    const hinge = data.hinge, dh = data.doorHinge;
    const toGL = (list) => list.map((m) => ({ k: m.k, col: m.col, acc: m.acc, tag: m.tag, xf: m.xf, pv: m.pv, bp: mk(gl.ARRAY_BUFFER, m.p), bn: mk(gl.ARRAY_BUFFER, m.n), n: m.p.length / 3 }));
    const stat = toGL(staticParts()), eng = toGL(engineParts()), cab = toGL(cabinParts());
    // contour exact des feux arrière : carte de distance (en mm) calculée depuis le maillage, pour le joint et le boîtier
    (() => {
      const W = 512, H = 192, m = new Uint8Array(W * H), g = data.groups[6] || [];
      const P3 = (k) => [lo[0] + data._pos[k * 3] * sc[0], lo[1] + data._pos[k * 3 + 1] * sc[1], lo[2] + data._pos[k * 3 + 2] * sc[2]];
      const map = (p) => { const ax = Math.abs(p[0]); return [(Math.min(.55, Math.max(0, p[2] - 1.30)) + Math.max(0, .775 - ax)) / .86 * W, (p[1] - .75) / .305 * H]; };
      for (let q = 0; q + 1 < g.length; q += 2) { const s0 = g[q], cnt = g[q + 1];
        for (let i = s0; i < s0 + cnt; i += 3) { const A = map(P3(data._idx[i])), B = map(P3(data._idx[i + 1])), C = map(P3(data._idx[i + 2]));
          const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0]))), y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
          const e = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x + .5, py = y + .5, w0 = e(B, C, px, py), w1 = e(C, A, px, py), w2 = e(A, B, px, py);
            if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) m[y * W + x] = 1; } } }
      const d = new Float32Array(W * H); for (let i = 0; i < W * H; i++) d[i] = m[i] ? 1e9 : 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i];
        if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); } d[i] = v; }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i];
        if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); } d[i] = v; }
      const out = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) out[i] = d[i] ? Math.min(255, Math.round(Math.max(0, d[i] - .5) * 1.66 / 72.25 * 255)) : 0;
      const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, W, H, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, out);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    })();
    const world = World(gl, prog, U, mk); const FADE = prog(BG_VS, `precision mediump float;varying vec2 q;uniform float a;void main(){gl_FragColor=vec4(0.,0.,0.,a);}`);
    let drv = { t: 0, acc: 0 };
    const strutP = mk(gl.ARRAY_BUFFER, new Float32Array(864), true), strutN = mk(gl.ARRAY_BUFFER, new Float32Array(864), true);
    const S = { yaw: .75, pitch: .16, dist: 7.2, tx: 0, ty: .62, tz: .1, fov: .62, hood: 0, door: 0, lights: 0, shift: 0, f1: 0, ride: -.03, acc: [1, .16, .24], bg: [.04, .035, .045], paint: [.93, .92, .89], hl: null, noMirror: false, ambient: true, scene: 0, D: 0, wheel: 0, brake: 0, night: 0, fade: 0, speed: 0, season: 2, seasonT: 2, seasonAuto: true, cw0: 0, dcw0: 0, steer: 0, roll: 0, pch: 0, wdy: [0, 0, 0, 0] };
    const COL = { 1: [.03, .03, .03], 2: [.62, .63, .66], 9: [.075, .075, .08], 4: [0, 0, 0] };
    let anim = null, canim = null, queue = [], raf = 0, dirty = true, spin = false, last = 0, t0 = performance.now(), onFrame = null, VPm = null, vw = 1, vh = 1;
    const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
    const ease = (k) => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const eyeOf = (o) => [o.tx + o.dist * Math.cos(o.pitch) * Math.sin(o.yaw), o.ty + o.dist * Math.sin(o.pitch), o.tz + o.dist * Math.cos(o.pitch) * Math.cos(o.yaw)];
    const lookFrom = (e, t) => { const d = [e[0] - t[0], e[1] - t[1], e[2] - t[2]]; const dist = Math.hypot(...d) || 1e-4; return { tx: t[0], ty: t[1], tz: t[2], dist, pitch: Math.asin(Math.max(-1, Math.min(1, d[1] / dist))), yaw: Math.atan2(d[0], d[2]) }; };
    const inside = (e) => Math.abs(e[0]) < .74 && e[1] > .3 && e[1] < 1.45 && Math.abs(e[2]) < 1.55;
    function step(now) {
      if (!anim && queue.length) { anim = queue.shift(); anim.start(); anim.t0 = now; }
      if (!anim) return;
      const k = Math.min(1, (now - anim.t0) / anim.dur), e = (anim.ease || ease)(k);
      for (const key in anim.to) { const a = anim.from[key], b = anim.to[key]; S[key] = Array.isArray(a) ? a.map((x, i) => x + (b[i] - x) * e) : a + (b - a) * e; }
      if (anim.cart) { const C = anim.cart.c; const E = C ? anim.cart.e0.map((x, i) => (1 - e) * (1 - e) * x + 2 * e * (1 - e) * C[i] + e * e * anim.cart.e1[i]) : anim.cart.e0.map((x, i) => x + (anim.cart.e1[i] - x) * e), T = anim.cart.t0.map((x, i) => x + (anim.cart.t1[i] - x) * e); Object.assign(S, lookFrom(E, T)); }
      if (k >= 1) { const cb = anim.cb; anim = null; if (cb) cb(); }
    }
    let active = true;                                   // inactif = rien n'est dessiné (vue cachée, autre onglet)
    // résolution adaptative : si l'appareil peine, on baisse un peu la définition interne, et on la remonte dès que ça respire
    const qMax = () => Math.min(3, window.devicePixelRatio || 1), qMin = () => Math.min(qMax(), 1.1);
    let q = qMax(), ema = 16, qT = 0, lastDraw = 0;
    function adapt(now, dt) {
      if (!(dt > 4 && dt < 120)) return; ema += (dt - ema) * .08; if (now < qT) return;
      if (ema > 23 && q > qMin() + .01) { q = Math.max(qMin(), q * .84); qT = now + 900; ema = 18; resize(); }
      else if (ema < 13.5 && q < qMax() - .01) { q = Math.min(qMax(), q * 1.08); qT = now + 3000; resize(); }
    }
    function frame(now) {
      raf = 0; if (!active) { last = 0; return; }
      const busy = S.scene || anim || queue.length || canim || spin || S.hl || S.lights > .01 || S.hood > .02 || S.f1 > .5 || S.door > .01;
      if (anim || queue.length) { step(now); dirty = true; }
      if (canim) { const k = Math.min(1, (now - canim.t0) / canim.dur); const e = k * k * (3 - 2 * k); for (const key in canim.to) S[key] = canim.from[key].map((x, i) => x + (canim.to[key][i] - x) * e); if (k >= 1) canim = null; dirty = true; }
      if (spin && !anim && !queue.length) { const dt = last ? Math.min(50, now - last) : 16; S.yaw = wrapA(S.yaw + dt * (S.scene ? 0.00006 : 0.00010)); dirty = true; }
      if (S.scene) {                                   // roulage : le décor défile, les roues tournent, freinages de temps en temps
        const dt = Math.max(.001, last ? Math.min(.05, (now - last) / 1000) : .016); drv.t += dt;
        // pilotage façon roulage circuit : pleine charge en ligne droite, gros freinage avant les virages
        const night = S.scene === 2, vmax = night ? 33 : 41, alat = night ? 8.5 : 10.5, w0 = -S.D;
        let need = vmax; for (let s = 6; s <= 150; s += 12) { const k = Math.abs(roadK(w0 - s)); if (k > 1e-5) { const vc = Math.sqrt(alat / k); const vb = Math.sqrt(vc * vc + 2 * 10.5 * Math.max(0, s - 8)); need = Math.min(need, vb); } }
        const dv = need - S.speed; const acc = dv > 0 ? Math.min(dv / dt, 5.2 * (1 - S.speed / (vmax + 12))) : Math.max(dv / dt, -11);
        S.speed = Math.max(4, Math.min(60, S.speed + (isFinite(acc) ? acc : 0) * dt)); if (!isFinite(S.D)) S.D = 0; drv.acc += (acc - drv.acc) * Math.min(1, dt * 6);
        S.brake += ((drv.acc < -2.2 ? 1 : 0) - S.brake) * Math.min(1, dt * 14);
        S.D = (S.D + S.speed * dt) % 4800; S.wheel = (S.wheel + Math.min(S.speed / .305, 21) * dt) % 6.2832;
        if (night) {                                   // de temps en temps, deux yeux s'allument dans les bois
          if (drv.eyeNext == null) drv.eyeNext = drv.t + 14 + Math.random() * 14;
          if (!drv.eye && drv.t > drv.eyeNext) { const sd = Math.random() < .5 ? -1 : 1; drv.eye = { t0: drv.t, u: -1.5 + sd * (12 + Math.random() * 7), z: -(16 + Math.random() * 16), y: .55 + Math.random() * .35, ph: Math.random() * 6 }; }
          if (drv.eye) { const k = drv.t - drv.eye.t0, dur = 4.6; if (k > dur) { drv.eye = null; S.eyeOn = 0; drv.eyeNext = drv.t + 28 + Math.random() * 40; }
            else { const E = drv.eye; S.eyeOn = Math.min(1, k / .7) * Math.min(1, (dur - k) / .5); S.eyeP = [E.u + Math.sin(k * .6 + E.ph) * .6, E.y, E.z + Math.sin(k * .4) * 1.2];
              const bl = (t0) => Math.max(0, 1 - Math.abs(k - t0) / .09); S.eyeOpen = Math.max(.04, 1 - Math.max(bl(1.5), bl(3.1), bl(3.35))); } }
        } else { S.eyeOn = 0; drv.eye = null; }
        if (S.seasonAuto) { drv.st = (drv.st || 0) + dt; if (drv.st > 20) { drv.st = 0; S.seasonT = (Math.round(S.seasonT) + 1) % 4; } }   // les saisons défilent toutes seules
        { let d = S.seasonT - S.season; if (d > 2) d -= 4; if (d < -2) d += 4; if (Math.abs(d) > 1e-4) { S.season = (S.season + Math.sign(d) * Math.min(Math.abs(d), dt / 2.6) + 4) % 4; } }
        const W = -S.D; S.cw0 = roadC(W); S.dcw0 = (roadC(W + .5) - roadC(W - .5));
        const k0 = roadK(W), lat = S.speed * S.speed * k0;
        S.steer += (-Math.max(-.2, Math.min(.2, Math.atan(2.386 * k0) * 3.2)) - S.steer) * Math.min(1, dt * 8);
        S.roll += (Math.max(-.065, Math.min(.065, lat * .0055)) - S.roll) * Math.min(1, dt * 5);
        S.pch += (Math.max(-.045, Math.min(.03, drv.acc * .0042)) - S.pch) * Math.min(1, dt * 6);
        const wf = W - 1.067, wr = W + 1.319; S.wdy = [roadB(wf, 0), roadB(wf, 1), roadB(wr, 0), roadB(wr, 1)];
        S.ride = -.03 + (S.wdy[0] + S.wdy[1] + S.wdy[2] + S.wdy[3]) * .14 + .0012 * Math.sin(drv.t * 13.); dirty = true;
      }
      last = now;
      const live = (S.ambient && !document.hidden) || S.scene || anim || queue.length || canim || spin || S.hl || S.lights > .01 || S.hood > .02 || S.f1 > .5 || S.door > .01;
      draw(now); dirty = false; lastDraw = now;
      if (onFrame) onFrame();
      if (live) raf = requestAnimationFrame(frame); else last = 0;
    }
    function kick() { dirty = true; if (!raf && active) raf = requestAnimationFrame(frame); }
    function resize() { const r = canvas.getBoundingClientRect(); q = qMax(); const d = q; const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d)); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } vw = r.width; vh = r.height; kick(); }
    function setXf(p, xf) {
      gl.uniform1f(U(p, 'xf'), xf);
      if (xf === 1) { gl.uniform3f(U(p, 'pv'), 0, hinge[0], hinge[1]); gl.uniform1f(U(p, 'ang'), S.hood); }
      else if (xf === 2 || xf === 3) { gl.uniform3f(U(p, 'pv'), dh[0], 0, dh[1]); gl.uniform1f(U(p, 'ang'), -S.door); }
    }
    function bindCar(p) {
      const aP = gl.getAttribLocation(p, 'p'), aN = gl.getAttribLocation(p, 'n');
      gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.UNSIGNED_SHORT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.enableVertexAttribArray(aN); gl.vertexAttribPointer(aN, 3, gl.BYTE, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi);
      gl.uniform3fv(U(p, 'lo'), lo); gl.uniform3fv(U(p, 'sc'), sc); gl.uniform1f(U(p, 'lift'), S.ride);
    }
    const range = (s, c) => { if (c) gl.drawElements(gl.TRIANGLES, c, gl.UNSIGNED_INT, s * 4); };
    function drawGroup(k) {
      const g = data.groups[k]; if (!g) return;
      gl.uniform3fv(U(P, 'col'), (k === 0 || k === 17) ? S.paint : (COL[k] || [0, 0, 0])); gl.uniform1f(U(P, 'kind'), k);
      setXf(P, 0); range(g[0], g[1]); if (S.hood < .02) range(g[2], g[3]);
      if (g[5]) { setXf(P, 1); range(g[4], g[5]); }
      if (g[7]) { setXf(P, S.door < .004 ? 0 : 2); range(g[6], g[7]); setXf(P, 0); }
      if (g[9]) {
        if (S.door < .004) range(g[8], g[9]);
        else { gl.uniform1f(U(P, 'clip'), 1); range(g[8], g[9]); setXf(P, 2); gl.uniform1f(U(P, 'clip'), 2); range(g[8], g[9]); gl.uniform1f(U(P, 'clip'), 0); }
      }
      setXf(P, 0);
    }
    function drawMeshes(p, list, pick) {
      const aP = gl.getAttribLocation(p, 'p'), aN = gl.getAttribLocation(p, 'n');
      gl.uniform3f(U(p, 'lo'), 0, 0, 0); gl.uniform3f(U(p, 'sc'), 1, 1, 1); gl.uniform1f(U(p, 'lift'), S.ride);
      list.forEach((m) => {
        if (pick && !pick(m)) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, m.bp); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.bn); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0);
        setXf(p, m.xf); if (m.xf === 4) { gl.uniform3fv(U(p, 'pv'), m.pv); gl.uniform1f(U(p, 'ang'), -S.wheel); }
        if (p === P) { gl.uniform3fv(U(P, 'col'), m.acc ? S.acc : m.col || (m.k === 0 ? S.paint : COL[m.k] || [0, 0, 0])); gl.uniform1f(U(P, 'kind'), m.k); }
        gl.drawArrays(gl.TRIANGLES, 0, m.n);
      });
      setXf(p, 0);
    }
    function rotHood(p) { const a = S.hood, c = Math.cos(a), s = Math.sin(a), y = p[1] - hinge[0], z = p[2] - hinge[1]; return [p[0], hinge[0] + c * y - s * z, hinge[1] + s * y + c * z]; }
    function drawStruts(p) {
      if (S.hood < 0.05) return;
      const P2 = [], N2 = [];
      const cyl = (a, b, r, seg) => {                                         // cylindre plein de a à b
        const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const L = Math.hypot(...d) || 1; const w = d.map((x) => x / L);
        let u = Math.abs(w[0]) < .9 ? [1, 0, 0] : [0, 1, 0]; let v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]]; const l = Math.hypot(...v) || 1; v = v.map((x) => x / l);
        u = [v[1] * w[2] - v[2] * w[1], v[2] * w[0] - v[0] * w[2], v[0] * w[1] - v[1] * w[0]];
        for (let i = 0; i < seg; i++) {
          const t0 = i / seg * 6.2832, t1 = (i + 1) / seg * 6.2832;
          const o0 = [0, 1, 2].map((j) => Math.cos(t0) * u[j] + Math.sin(t0) * v[j]), o1 = [0, 1, 2].map((j) => Math.cos(t1) * u[j] + Math.sin(t1) * v[j]);
          const q = (pp, o) => [0, 1, 2].map((j) => pp[j] + o[j] * r);
          P2.push(...q(a, o0), ...q(a, o1), ...q(b, o1), ...q(a, o0), ...q(b, o1), ...q(b, o0));
          const n0 = o0.map((x) => x * 127), n1 = o1.map((x) => x * 127); N2.push(...n0, ...n1, ...n1, ...n0, ...n1, ...n0);
          const wn = w.map((x) => x * 127), wm = w.map((x) => -x * 127);
          P2.push(...b, ...q(b, o0), ...q(b, o1), ...a, ...q(a, o1), ...q(a, o0)); N2.push(...wn, ...wn, ...wn, ...wm, ...wm, ...wm);
        }
      };
      [-1, 1].forEach((sx) => {
        const a = [sx * .585, .885, -1.0];                                     // rotule côté caisse (bord d'aile)
        const b = rotHood([sx * .50, .922, -1.30]);                           // rotule sous le capot : suit le capot
        const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const L = Math.hypot(...d); const w = d.map((x) => x / L);
        const at = (k) => [a[0] + w[0] * k, a[1] + w[1] * k, a[2] + w[2] * k];
        const TUBE = Math.min(.25, L - .03);                                  // corps du vérin, longueur fixe : la tige rentre à la fermeture
        cyl(at(.012), at(TUBE), .0115, 14);                                   // corps
        cyl(at(TUBE - .02), at(L - .012), .0052, 10);                         // tige
        cyl([a[0] - sx * .012, a[1], a[2]], [a[0] + sx * .012, a[1], a[2]], .011, 10);   // chape basse
        cyl([b[0] - sx * .012, b[1], b[2]], [b[0] + sx * .012, b[1], b[2]], .011, 10);   // chape haute
        const hb = [sx * .50, .934, -1.30], hb2 = rotHood(hb);                 // patte fixée au capot
        cyl(b, hb2, .014, 10);
      });
      const aP = gl.getAttribLocation(p, 'p'), aN = gl.getAttribLocation(p, 'n');
      gl.uniform3f(U(p, 'lo'), 0, 0, 0); gl.uniform3f(U(p, 'sc'), 1, 1, 1); setXf(p, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, strutP); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P2), gl.DYNAMIC_DRAW); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, strutN); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(N2), gl.DYNAMIC_DRAW); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0);
      if (p === P) { gl.uniform3fv(U(P, 'col'), [0, 0, 0]); gl.uniform1f(U(P, 'kind'), 13); }
      gl.drawArrays(gl.TRIANGLES, 0, P2.length / 3);
    }
    function scene(mir) {
      gl.uniform1f(U(P, 'mir'), mir);
      bindCar(P); (S.scene ? [0, 1, 2, 4, 5, 6, 11, 17] : [0, 1, 2, 4, 5, 6, 9, 11, 17]).forEach(drawGroup);   // les anciennes sorties (groupe 7) sont remplacées par les embouts détaillés   // en roulage : pas d'habitacle (vitres teintées)
      drawMeshes(P, stat);
      if (S.hood >= 0.02 && !S.scene) { drawMeshes(P, eng); drawStruts(P); }
      if (!mir && !S.scene) drawMeshes(P, cab);
    }
    // surlignage façon menu de préparation : la pièce brille à travers la carrosserie
    function xray(VP, eye, time) {
      const tags = S.hl; if (!tags || !tags.length) return;
      gl.useProgram(X); gl.uniformMatrix4fv(U(X, 'VP'), false, VP); gl.uniform3fv(U(X, 'eye'), eye); gl.uniform3fv(U(X, 'acc'), S.acc); gl.uniform1f(U(X, 'time'), time); gl.uniform1f(U(X, 'mir'), 0);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
      [[false, .55], [true, .65]].forEach(([depth, k]) => {
        if (depth) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); } else gl.disable(gl.DEPTH_TEST);
        gl.uniform1f(U(X, 'k'), k);
        const segs = []; tags.forEach((t) => { if (data.hl[t]) segs.push(...data.hl[t]); });
        if (segs.length) { bindCar(X); segs.forEach(([s, c, fl]) => { setXf(X, fl === 2 ? 1 : fl >= 3 ? 2 : 0); range(s, c); }); setXf(X, 0); }
        if (tags.indexOf('paint') >= 0) { const g = data.groups[0]; gl.uniform1f(U(X, 'k'), k * .28); bindCar(X); setXf(X, 0); range(g[0], g[1]); setXf(X, 1); range(g[4], g[5]); setXf(X, 2); range(g[6], g[7]); range(g[8], g[9]); setXf(X, 0); gl.uniform1f(U(X, 'k'), k); }
        const pick = (m) => tags.indexOf(m.tag) >= 0;
        drawMeshes(X, stat, pick); drawMeshes(X, eng, pick); drawMeshes(X, cab, pick);
      });
      gl.depthFunc(gl.LESS); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    }
    function draw(now) {
      const time = ((now || performance.now()) - t0) / 1000;
      const w = canvas.width, h = canvas.height; gl.viewport(0, 0, w, h);
      const tgt = [S.tx, S.ty, S.tz], eye = eyeOf(S);
      const proj = S.scene ? M4.persp(S.fov, w / h, .1, 1400) : M4.persp(S.fov, w / h, .03, 80), view = M4.look(eye, tgt, [0, 1, 0]); proj[8] = S.shift || 0;
      VPm = M4.mul(proj, view); const VP = new Float32Array(VPm);
      const basis = (() => { const f = [tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]]; const fl = Math.hypot(...f); const ff = f.map((x) => x / fl); let rr = [-ff[2], 0, ff[0]]; const rl = Math.hypot(...rr) || 1; rr = rr.map((x) => x / rl);
        return { f: ff, r: rr, u: [rr[1] * ff[2] - rr[2] * ff[1], rr[2] * ff[0] - rr[0] * ff[2], rr[0] * ff[1] - rr[1] * ff[0]], th: Math.tan(S.fov / 2), bq }; })();
      gl.useProgram(P); gl.uniform1f(U(P, 'drv'), S.scene ? 1 : 0); gl.uniform1f(U(P, 'roll'), S.roll); gl.uniform1f(U(P, 'pch'), S.pch); gl.uniform1f(U(P, 'steer'), S.steer); gl.uniform4fv(U(P, 'wdy'), S.wdy); gl.uniform1f(U(P, 'envm'), S.scene); gl.uniform3fv(U(P, 'sunD'), world.SUN); gl.uniform1f(U(P, 'drive'), S.scene ? 1 : 0); gl.uniform1f(U(P, 'brake'), S.brake);
      gl.uniform1f(U(P, 'lsc'), S.scene === 2 ? .07 : S.scene === 1 ? 1 : 1 - .57 * S.night);
      if (S.scene) {
        // 1. reflet de la voiture dans l'enrobé (sur fond noir), 2. route qui le laisse transparaître, 3. ciel derrière le reste
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
        gl.useProgram(P); gl.uniformMatrix4fv(U(P, 'VP'), false, VP); gl.uniform3fv(U(P, 'eye'), eye); gl.uniform3fv(U(P, 'acc'), S.acc);
        gl.uniform1f(U(P, 'alpha'), 1); gl.uniform1f(U(P, 'lights'), S.lights); gl.uniform1f(U(P, 'time'), time); gl.uniform1f(U(P, 'f1'), 0); world.carEnv(P, S);
        scene(1);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        world.ground(S, VP, eye, time);
        gl.depthFunc(gl.LEQUAL); gl.depthMask(false); gl.disable(gl.BLEND); world.sky(S, eye, time, basis, w / h); gl.depthMask(true); gl.depthFunc(gl.LESS);
        gl.useProgram(P); gl.uniformMatrix4fv(U(P, 'VP'), false, VP); gl.uniform3fv(U(P, 'eye'), eye); gl.uniform3fv(U(P, 'acc'), S.acc);
        gl.uniform1f(U(P, 'alpha'), 1); gl.uniform1f(U(P, 'lights'), S.lights); gl.uniform1f(U(P, 'time'), time); gl.uniform1f(U(P, 'f1'), 0); world.carEnv(P, S);
        scene(0);
        bindCar(P); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        gl.uniform1f(U(P, 'mir'), 0); drawGroup(10); gl.depthMask(true); drawGroup(3); gl.disable(gl.BLEND);
        world.particles(S, VP, eye, time, basis);
        fade(); return;
      }
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      const hz = (() => { const c = M4.mul(VPm, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -30, 1]); return Math.max(-.8, Math.min(.9, c[13] / c[15])); })();
      gl.useProgram(BG); const aB = gl.getAttribLocation(BG, 'p'); gl.bindBuffer(gl.ARRAY_BUFFER, bq); gl.enableVertexAttribArray(aB); gl.vertexAttribPointer(aB, 2, gl.FLOAT, false, 0, 0);
      gl.uniform3fv(U(BG, 'acc'), S.acc); gl.uniform3fv(U(BG, 'bg'), S.bg); gl.uniform1f(U(BG, 'horizon'), hz); gl.uniform1f(U(BG, 'aspect'), w / h); gl.uniform1f(U(BG, 'time'), time); gl.uniform1f(U(BG, 'night'), S.night); { const f = [tgt[0] - eye[0], tgt[1] - eye[1], tgt[2] - eye[2]]; const fl = Math.hypot(...f); const ff = f.map((x) => x / fl); let rr = [-ff[2], 0, ff[0]]; const rl = Math.hypot(...rr) || 1; rr = rr.map((x) => x / rl);
        const uu = [rr[1] * ff[2] - rr[2] * ff[1], rr[2] * ff[0] - rr[0] * ff[2], rr[0] * ff[1] - rr[1] * ff[0]];
        gl.uniform3fv(U(BG, 'cf'), ff); gl.uniform3fv(U(BG, 'cr'), rr); gl.uniform3fv(U(BG, 'cu'), uu); gl.uniform1f(U(BG, 'th'), Math.tan(S.fov / 2)); }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(P); gl.uniformMatrix4fv(U(P, 'VP'), false, VP); gl.uniform3fv(U(P, 'eye'), eye); gl.uniform3fv(U(P, 'acc'), S.acc);
      gl.uniform1f(U(P, 'alpha'), 1); gl.uniform1f(U(P, 'lights'), S.lights); gl.uniform1f(U(P, 'time'), time); gl.uniform1f(U(P, 'f1'), S.f1 > .5 ? 1 : 0);
      const out = !inside(eye) && eye[1] > .02;
      if (out && !S.noMirror) scene(1);
      gl.useProgram(F); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      const aF = gl.getAttribLocation(F, 'p'); gl.bindBuffer(gl.ARRAY_BUFFER, bf); gl.enableVertexAttribArray(aF); gl.vertexAttribPointer(aF, 2, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(U(F, 'VP'), false, VP); gl.uniform3fv(U(F, 'acc'), S.acc); gl.uniform3fv(U(F, 'bg'), S.bg); gl.uniform1f(U(F, 'lights'), S.lights); gl.uniform1f(U(F, 'time'), time); gl.uniform1f(U(F, 'night'), S.night);
      gl.depthMask(false); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.depthMask(true); gl.disable(gl.BLEND);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(P); scene(0);
      bindCar(P); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      gl.uniform1f(U(P, 'mir'), 0); drawGroup(10); drawGroup(3);
      gl.depthMask(true); gl.disable(gl.BLEND);
      xray(VP, eye, time);
      fade();
    }
    function fade() {
      if (S.fade < .003) return;
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(FADE);
      const a = gl.getAttribLocation(FADE, 'p'); gl.bindBuffer(gl.ARRAY_BUFFER, bq); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(U(FADE, 'a'), Math.min(1, S.fade)); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST);
    }
    function push(o, dur, cb, cart, ez) {
      const a = { to: {}, from: {}, dur, cb, ease: ez };
      a.start = () => {
        const tgt = Object.assign({}, o);
        if (cart) { a.cart = { e0: eyeOf(S), t0: [S.tx, S.ty, S.tz], e1: cart.e, t1: cart.t, c: cart.c }; ['yaw', 'pitch', 'dist', 'tx', 'ty', 'tz'].forEach((k) => delete tgt[k]); }
        if ('yaw' in tgt) { S.yaw = wrapA(S.yaw); tgt.yaw = S.yaw + wrapA(tgt.yaw - S.yaw); }
        for (const k in tgt) { a.from[k] = Array.isArray(S[k]) ? S[k].slice() : S[k]; a.to[k] = tgt[k]; }
      };
      queue.push(a); kick();
    }
    const DOOR_E = [-2.0, 1.28, .05], DOOR_T = [-.40, 1.0, -.15];
    const api = {
      state: S,
      set(o) { Object.assign(S, o); if ('yaw' in o) S.yaw = wrapA(S.yaw); kick(); },
      to(o, dur, cb) { api.stop(); push(o, dur || 900, cb); },
      color(o, dur) { const from = {}; for (const k in o) from[k] = S[k].slice(); canim = { from, to: o, t0: performance.now(), dur: dur || 700 }; kick(); },
      // déplacement intelligent : chemin le plus court, portière animée pour entrer ou sortir de l'habitacle
      go(cam, extra, cb) {
        if (typeof extra === 'function') { cb = extra; extra = null; }
        api.stop(); spin = false;
        const tgtO = Object.assign({}, cam, extra || {}); const e1 = eyeOf(tgtO), t1 = [tgtO.tx, tgtO.ty, tgtO.tz];
        const fromIn = inside(eyeOf(S)), toIn = inside(e1);
        const rest = {}; for (const k in tgtO) if (['yaw', 'pitch', 'dist', 'tx', 'ty', 'tz'].indexOf(k) < 0) rest[k] = tgtO[k];
        if (!fromIn && toIn) {                       // entrée : on s'approche, la portière s'ouvre, on s'assoit, elle se referme
          const sm = (k) => k * k * (3 - 2 * k), outE = (k) => 1 - Math.pow(1 - k, 3);
          push({ door: 1.15, hood: 0, lights: 0, f1: 0, fov: .8, shift: 0 }, 760, null, { e: DOOR_E, t: DOOR_T }, sm);
          push(Object.assign({}, rest, { door: 1.15 }), 980, null, { e: e1, t: t1, c: [-1.05, 1.26, .16] }, outE);
          push({ door: 0 }, 520, cb, null, sm);
        } else if (fromIn && !toIn) {                // sortie : même chemin à l'envers
          const sm = (k) => k * k * (3 - 2 * k), inE = (k) => k * k * k;
          push({ door: 1.15, shift: 0 }, 420, null, null, sm);
          push({ fov: .8 }, 820, null, { e: DOOR_E, t: DOOR_T, c: [-1.05, 1.26, .16] }, inE);
          push(Object.assign({}, tgtO, { door: 0 }), 950, cb);
        } else if (fromIn && toIn) push(rest, 750, cb, { e: e1, t: t1 });
        else push(tgtO, 1000, cb);
      },
      // roulage : m = 0 vitrine, 1 jour dans les champs, 2 nuit en forêt. cam = caméra à prendre une fois le fondu au noir fait
      drive(m, cam, cb, cine) {
        api.stop(); spin = false;
        if (m && !S.scene && cine && cam) {             // entrée en roulage façon cinématique : plan bas sur l'avant, phares, noir, travelling depuis la roue arrière
          const io = (k) => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          push({ yaw: 2.62, pitch: .05, dist: 4.4, tx: 0, ty: .5, tz: -.3, fov: .52, lights: 1, hood: 0, door: 0, shift: 0, night: 0 }, 950, null, null, io);
          push({ dist: 3.95, fov: .48, ty: .52 }, 1000, null, null, (k) => k * (2 - k));   // on reste sur le phare : la voiture va partir
          push({ fade: 1 }, 300, () => { world.ensure(m); S.scene = m; S.speed = m === 2 ? 22 : 28; drv = { t: 0, acc: 0 }; S.eyeOn = 0; S.brake = 0; S.hl = null; S.hood = 0; S.door = 0; S.f1 = 0;
            Object.assign(S, { yaw: -.30, pitch: .03, dist: 2.7, tx: 0, ty: .40, tz: .95, fov: .92, lights: cam.lights != null ? cam.lights : S.lights }); }, null, (k) => k);
          push({ fade: 0 }, 420, null, null, (k) => 1 - (1 - k) * (1 - k));
          push(Object.assign({}, cam), 1800, () => { spin = true; if (cb) cb(); }, null, io);
          return;
        }
        push({ fade: 1 }, 320, () => { if (m) world.ensure(m); S.scene = m; if (m) { S.speed = m === 2 ? 22 : 28; drv = { t: 0, acc: 0 }; S.eyeOn = 0; S.brake = 0; S.hl = null; S.hood = 0; S.door = 0; S.f1 = 0; } else { S.ride = -.03; S.brake = 0; S.wheel = 0; S.steer = 0; S.roll = 0; S.pch = 0; S.wdy = [0, 0, 0, 0]; } if (cam) Object.assign(S, cam); if (m) S.yaw = wrapA(S.yaw); }, null, (k) => k);
        push({ fade: 0 }, 650, () => { if (m) spin = true; if (cb) cb(); }, null, (k) => 1 - (1 - k) * (1 - k));
      },
      zoom(f) {
        if (inside(eyeOf(S))) { S.fov = Math.max(.45, Math.min(1.3, S.fov * f)); }
        else S.dist = Math.max(S.scene ? 3.2 : 1.6, Math.min(S.scene ? 15 : 10, S.dist * f));
        kick();
      },
      active(on) { on = !!on; if (on === active) return; active = on; if (on) { last = 0; kick(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } },
      season(k) { S.seasonAuto = false; S.seasonT = ((k % 4) + 4) % 4; if (!S.scene) S.season = S.seasonT; kick(); },
      seasonAuto(on) { S.seasonAuto = !!on; drv.st = 0; kick(); },
      seasonNow() { return Math.round(S.seasonT) % 4; },
      stop() { anim = null; queue = []; }, busy() { return !!anim || queue.length > 0; },
      resize, kick, inside() { return inside(eyeOf(S)); },
      spin(on) { spin = on; kick(); },
      dragging(on) { if (on) spin = false; kick(); },
      onFrame(fn) { onFrame = fn; },
      eye() { return eyeOf(S); },
      project(p) {
        if (!VPm) return null; const x = p[0], y = p[1] + S.ride, z = p[2]; const m = VPm;
        const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
        if (cw <= 0.01) return { x: 0, y: 0, vis: false };
        return { x: (cx / cw * .5 + .5) * vw, y: (1 - (cy / cw * .5 + .5)) * vh, vis: Math.abs(cx / cw) < 1.02 && Math.abs(cy / cw) < 1.02 };
      },
      lookFrom,
      dispose() { cancelAnimationFrame(raf); const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = 0; kick(); } });
    resize();
    return api;
  }
  Swift3D.decode = async function (meta) {
    const bin = b64(meta.z);
    const buf = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const nv = meta.nv, ni = meta.ni;
    const pos = new Uint16Array(buf.slice(0, nv * 6));
    const nrm = new Int8Array(buf.slice(nv * 6, nv * 9));
    const zz = new Uint32Array(buf.slice(nv * 9, nv * 9 + ni * 4));
    const idx = new Uint32Array(ni); let acc = 0;
    for (let i = 0; i < ni; i++) { const z = zz[i]; acc += (z >>> 1) ^ -(z & 1); idx[i] = acc; }
    meta._pos = pos; meta._nrm = nrm; meta._idx = idx; delete meta.z; return meta;
  };
  G.Swift3D = Swift3D;
})(window);
