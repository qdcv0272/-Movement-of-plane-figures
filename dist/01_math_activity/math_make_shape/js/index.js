(()=>{"use strict";var e={253:function(e,t,s){var i=s(412);class n{on(e,t){let s=arguments.length>2&&void 0!==arguments[2]&&arguments[2];this.eventMap[e].push({fn:t,once:s})}off(e,t){let s=this.eventMap[e];if(t){for(let e=0;e<s.length;++e)if(t===s[e].fn){s.splice(e,1);break}}else this.eventMap[e]=[]}offAll(){for(let e of Object.keys(this.eventMap))this.eventMap[e]=[]}emit(e){let t=this.eventMap[e];for(let s=t.length-1;s>=0;--s){let i=t[s];i.fn(),i.once&&this.off(e,i.fn)}}hnPlay(){this.emit("play")}hnPause(){this.emit("pause")}hnEnded(){this.stop(),this.emit("ended")}load(){this.audio.load()}play(){this.stop(),this.audio.play().catch(e=>{})}resume(){this.audio.play()}pause(){this.audio.pause()}stop(){this.audio.readyState>0&&(this.audio.pause(),this.audio.currentTime=0)}seek(e){this.audio.currentTime=e/1e3}get paused(){let e=!1;return this.audio.paused&&0!==this.audio.currentTime&&(e=!0),e}get currentTime(){return this.audio.currentTime}get duration(){return this.audio.duration}set volume(e){e<0||e>1||(this.audio.volume=e)}constructor(e){(0,i._)(this,"audio",void 0),(0,i._)(this,"eventMap",void 0),(0,i._)(this,"audioOption",void 0),(0,i._)(this,"bindPlay",void 0),(0,i._)(this,"bindPause",void 0),(0,i._)(this,"bindEnded",void 0),this.audioOption=e,this.audio=new Audio,this.audio.preload="none",this.audio.src=e.src,e.loop&&(this.audio.loop=e.loop),e.volume&&(this.audio.volume=e.volume),e.autoplay&&this.play(),this.eventMap={play:[],pause:[],ended:[]},this.bindPlay=this.hnPlay.bind(this),this.bindPause=this.hnPause.bind(this),this.bindEnded=this.hnEnded.bind(this),this.audio.addEventListener("play",this.bindPlay),this.audio.addEventListener("pause",this.bindPause),this.audio.addEventListener("ended",this.bindEnded)}}let o=new class{add(e){if(Array.isArray(e))for(let t of e)this._add(t);else this._add(e)}_add(e){if(this.isContain(e.id))return;let t=Object.assign({volume:1,loop:!1,ignoreStop:!1,tag:"default"},e),s=new n(t);this.sounds.set(e.id,{sound:s,...t})}get(e){var t;return(null==(t=this.sounds.get(e))?void 0:t.sound)??null}on(e,t,s){let i=arguments.length>3&&void 0!==arguments[3]&&arguments[3],n=this.get(e);n&&n.on(t,s,i)}off(e,t,s){let i=this.get(e);i&&i.off(t,s)}play(e,t){let s=this.get(e);s&&(t&&(this.off(e,"ended"),this.on(e,"ended",t,!0)),s.play())}resume(e){let t=this.get(e);t&&t.resume()}pause(e){let t=this.get(e);t&&t.pause()}stop(e){let t=this.get(e);t&&t.stop()}seek(e,t){let s=this.get(e);s&&s.seek(t)}stopAll(){for(let e of this.sounds.values())e.ignoreStop||"bgm"===e.tag||e.sound.stop()}resumeAll(){for(let e of this.pauseSounds)e.resume();this.pauseSounds=[]}pauseAll(){for(let e of this.sounds.values())e.sound.paused||(e.sound.pause(),this.pauseSounds.push(e.sound))}getPaused(e){let t=this.get(e);return!!t&&t.paused}getDuration(e){let t=-1,s=this.get(e);return s?t=s.duration:t}getCurrentTime(e){let t=-1,s=this.get(e);return s?t=s.currentTime:t}setVolume(e,t){if(t){let s=this.get(t);s&&(s.volume=e)}else for(let t of this.sounds.values())t.sound.volume=e}loadAll(){for(let e of this.sounds.values())e.sound.load()}isContain(e){let t=!1;for(let s of this.sounds.keys())if(e===s){t=!0;break}return t}constructor(){(0,i._)(this,"sounds",new Map),(0,i._)(this,"pauseSounds",[]),this.sounds=new Map,this.pauseSounds=[]}};var r=s(534);function a(e,t){let s=new CustomEvent("MESSAGE",{detail:t});e.dispatchEvent(s)}function l(){for(var e=arguments.length,t=Array(e),s=0;s<e;s++)t[s]=arguments[s]}function h(){let e=new r.UAParser().getDevice();return("mobile"===e.type||"tablet"===e.type)&&("iPhone"===e.model||"iPad"===e.model)}s(736);let d=s.p+"audio/global/button.mp3";window.bound={x:0,y:0,scale:1},window.globalVolume=1,window.getZoomRate=()=>window.bound.scale;var c=s(370);class u{start(){this.resume()}end(){a(window,{message:"FRAME_CALL_END",mc:this.mc}),this.dispose()}dispose(){this.mc&&(this.pause(),this.queue=null)}resume(){this.mc&&(this.mc.addEventListener("tick",this.bindTick),this.mc.visible=!0,this.mc.gotoAndPlay(this.s))}pause(){this.mc&&(this.mc.removeEventListener("tick",this.bindTick),this.mc.stop())}hnTick(){let e,t;if(this.queue){for(let[s,i]of this.queue)if("string"==typeof s&&("end"===s&&this.mc.currentFrame===this.mc.totalFrames-1||this.mc.currentLabel===s)||this.mc.currentFrame===s){e=s,t=i;break}"string"==typeof this.e?this.mc.currentLabel===this.e&&this.end():this.mc.currentFrame===this.e&&this.end(),e&&t&&this.executeQueue(e,t)}}executeQueue(e,t){t(),this.queue&&this.queue.delete(e)}constructor(e,t,s,n){(0,i._)(this,"mc",void 0),(0,i._)(this,"s",void 0),(0,i._)(this,"e",void 0),(0,i._)(this,"queue",void 0),(0,i._)(this,"bindTick",void 0),this.mc=e,this.s=t,this.e=s,this.queue=n,this.queue||(this.queue=new Map),this.bindTick=this.hnTick.bind(this)}}window.createjs=c.Z;class p{getContainer(){if(!this.container)throw Error("Container not initialized");return this.container}init(){let e=Object.keys(window.AdobeAn.compositions)[0],t=window.AdobeAn.compositions[e],s=new c.Z.LoadQueue(!1);s.installPlugin(c.Z.Sound),s.addEventListener("fileload",e=>{this.handleFileLoad(e,t)}),s.addEventListener("complete",e=>{this.handleComplete(e,t)});let i=t.getLibrary();c.Z.MotionGuidePlugin.install();let n=i.properties.manifest;if(h())n.map(e=>{this.args.manifestSrc&&(e.src=this.args.manifestSrc.concat("/",e.src))}),n.length>0?s.loadManifest(n):this.setupComplete(i);else{let e=[];n.map(t=>{this.args.manifestSrc&&(t.src=this.args.manifestSrc.concat("/",t.src)),-1===t.src.indexOf(".mp3")?e.push(t):o.add({id:t.id,src:t.src,tag:this.args.stageContent})}),e.length>0?s.loadManifest(e):this.setupComplete(i)}}handleFileLoad(e,t){let s=t.getImages();(null==e?void 0:e.item.type)==="image"&&(s[e.item.id]=e.result)}handleComplete(e,t){let s=t.getLibrary(),i=t.getSpriteSheet(),n=e.target,o=s.ssMetadata;for(let e=0;e<o.length;e++)i[o[e].name]=new c.Z.SpriteSheet({images:[n.getResult(o[e].name)],frames:o[e].frames});this.setupComplete(s)}setupComplete(e){if(this.lib=e,this.exportRoot=new e[this.args.stageContent],this.exportRoot.name=`exportRoot_${this.args.stageContent}`,this.stage=new e.Stage(this.canvas),c.Z.Touch.enable(this.stage,!0,!1),this.stage.enableMouseOver(),this.addGlobal(),this.canvas&&p.SCALE_UP&&!function(){let e=new r.UAParser().getDevice();return"mobile"===e.type||"tablet"===e.type}()){let e=this.args.canvasSize.w,t=this.args.canvasSize.h;this.canvas.style.width=`${e}px`,this.canvas.style.height=`${t}px`,this.canvas.width=2*e,this.canvas.height=2*t,this.stage.scaleX=2,this.stage.scaleY=2}c.Z.Ticker.framerate=e.properties.fps,c.Z.Ticker.timingMode=c.Z.Ticker.TIMEOUT,c.Z.Ticker.interval=30,c.Z.Ticker.addEventListener("tick",this.stage),this.stage.addChild(this.exportRoot),this.stage.tickEnabled=!1,a(window,{message:p.READY_COMPLETE,self:this}),this.args.autoplay&&this.start()}start(){this.stage.tickEnabled=!0,a(window,{message:p.START,self:this})}pause(){this.stage&&(this.stage.tickEnabled=!1)}resume(){this.stage&&(this.stage.tickEnabled=!0)}addGlobal(){window.playSound=this.playSound.bind(this)}playSound(e,t,s){h()?c.Z.Sound.play(e,{interrupt:c.Z.Sound.INTERRUPT_EARLY,loop:t,offset:s}):o.play(e)}play(e,t,s,i){let n,o="end"===s?e.totalFrames-1:s,r=new Map(i);this.frameCallMap.has(e)?(n=this.frameCallMap.get(e))&&(n.dispose(),n=new u(e,t,o,r),this.frameCallMap.set(e,n),n.start()):(n=new u(e,t,o,r),this.frameCallMap.set(e,n),n.start())}stopPlayQueue(e){for(let[t,s]of this.frameCallMap)t===e&&(s.dispose(),this.frameCallMap.delete(t))}stopAllPlayQueue(){for(let[e,t]of this.frameCallMap)t.dispose(),this.frameCallMap.delete(e)}playOnce(e){return new Promise(t=>{this.play(e,0,"end",[["end",()=>{t()}]])})}playOnceLabelMC(e,t){return new Promise(s=>{if(this.hasLabel(e,t)){e.gotoAndStop(t);let i=this.getChildAt(e,0);this.play(i,0,"end",[["end",()=>{s()}]])}else s()})}lock(){this.exportRoot.mouseEnabled=!1}unlock(){this.exportRoot.mouseEnabled=!0}getRoot(){return this.exportRoot}getLib(){return this.lib}getStage(){return this.stage}getCanvas(){return this.canvas}get(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;return t?t.getChildByName(e):this.exportRoot.getChildByName(e)}find(e){let t,s=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,i=(t=s||this.exportRoot).getChildByName(e);if(i)return i;{let s=t.children;for(let t=0;t<s.length;++t){let i=s[t];if(i instanceof c.Z.MovieClip){let t=this.find(e,i);if(t)return t}}}}setHitArea(e){let t=e.nominalBounds,s=new c.Z.Shape;s.graphics.beginFill("#ff0000").drawRect(t.x,t.y,t.width,t.height),e.hitArea=s}getBound(e){let t=e.getBounds();return t||(t=e.nominalBounds),t}getNominalBound(e){return e.nominalBounds}hitTest(e,t,s){if(!e.visible||!e.mouseEnabled)return!1;let i=e.globalToLocal(t,s),n=this.getBound(e);return!!(i.x>=0)&&!!(i.x<=n.width)&&!!(i.y>=0)&&!!(i.y<=n.height)}overlap(e,t){let s=this.setupPoint(e),i=this.setupPoint(t);return!(s.tr.y>i.bl.y)&&!(s.bl.y<i.tr.y)&&!(s.tr.x<i.bl.x)&&!(s.bl.x>i.tr.x)}setupPoint(e){let t=this.getBound(e),s={x:e.x-e.regX,y:e.y-e.regY},i=e.parent.localToGlobal(s.x,s.y);return{tr:{x:i.x+t.width,y:i.y},bl:{x:i.x,y:i.y+t.height}}}disableButton(e){e.alpha=.5,e.mouseEnabled=!1}enableButton(e){e.alpha=1,e.mouseEnabled=!0}isClicked(e,t){if(e.name===t)return!0;let s=e.parent;for(;s;){if(s.name===t)return!0;s=s.parent}return!1}alignInY(e){let t=0,s=0,i=0,n=0;for(let o=0;o<e.length;++o)for(let r=o+1;r<e.length;++r)if(t=Math.floor(e[o].x),i=Math.floor(e[o].y),s=Math.floor(e[r].x),i>(n=Math.floor(e[r].y))){let t=e[o];e[o]=e[r],e[r]=t}else if(5>Math.abs(i-n)&&t>s){let t=e[o];e[o]=e[r],e[r]=t}}alignInX(e){let t=0,s=0,i=0,n=0;for(let o=0;o<e.length;++o)for(let r=o+1;r<e.length;++r)if(t=Math.floor(e[o].x),i=Math.floor(e[o].y),s=Math.floor(e[r].x),n=Math.floor(e[r].y),t>s){let t=e[o];e[o]=e[r],e[r]=t}else if(5>Math.abs(t-s)&&i>n){let t=e[o];e[o]=e[r],e[r]=t}}getMovieClipsByName(e,t){let s=[],i=0;for(;;){let n=this.find(`${e}_${i}`,t);if(!n)break;s.push(n),i++}return s.length,s}getChildAt(e,t){return e.getChildAt(t)}hasLabel(e,t){return e.labels.some(e=>e.label===t)}constructor(e){var t;(0,i._)(this,"args",void 0),(0,i._)(this,"doc",document),(0,i._)(this,"container",void 0),(0,i._)(this,"canvas",void 0),(0,i._)(this,"exportRoot",void 0),(0,i._)(this,"stage",void 0),(0,i._)(this,"lib",void 0),(0,i._)(this,"frameCallMap",new Map),this.args=e;let s=this.doc.querySelector(this.args.node);if(!s)throw Error(`Container not found: ${this.args.node}`);this.container=s,this.container.style.width=`${this.args.canvasSize.w}px`,this.container.style.height=`${this.args.canvasSize.h}px`,this.canvas=this.doc.createElement("canvas"),this.canvas.style.position="absolute",this.canvas.width=this.args.canvasSize.w,this.canvas.height=this.args.canvasSize.h,this.container.appendChild(this.canvas),(t=this.args.src,new Promise((e,s)=>{let i=document.createElement("script");i.src=t,i.async=!1,document.body.appendChild(i),i.addEventListener("load",()=>{e()}),i.addEventListener("error",()=>{s(Error(`${t} \u{C2A4}\u{D06C}\u{B9BD}\u{D2B8} \u{B85C}\u{B4DC} \u{C2E4}\u{D328}`))})})).then(()=>{this.init()}),window.addEventListener("MESSAGE",e=>{let t=e.detail;if("FRAME_CALL_END"===t.message){let e=t.mc;for(let[t]of this.frameCallMap)t===e&&this.frameCallMap.delete(t)}})}}(0,i._)(p,"START","ccstart"),(0,i._)(p,"READY_COMPLETE","ccreadycomplete"),(0,i._)(p,"SCALE_UP",!0);class g{init(){this.setupCC(),this.setupEvent()}reset(){}activate(){this.isActive=!0}deactivate(){this.isActive=!1}hnMessage(e){this.isActive&&e.detail.message===p.READY_COMPLETE&&this.initCC()}setupEvent(){this.messageHandler=this.hnMessage.bind(this),window.addEventListener("MESSAGE",this.messageHandler)}setupCC(){this.props.cc&&(this.cc=new p(this.props.cc))}initCC(){this.cc&&this.cc.start()}playButtonAudio(){o.play("button")}constructor(e){(0,i._)(this,"props",void 0),(0,i._)(this,"root",void 0),(0,i._)(this,"cc",void 0),(0,i._)(this,"isActive",!0),(0,i._)(this,"messageHandler",void 0);let{root:t}=e;this.props=e,this.root=document.querySelector(t)}}class m{init(e){e&&this.props.linkName&&(this.cc=e,this.rootMc=this.cc.getRoot(),this.lib=this.cc.getLib(),this.mc=new this.lib[this.props.linkName]),this.props.root&&(this.root=document.querySelector(this.props.root))}start(){this.cc&&this.rootMc.addChild(this.mc)}clear(){this.cc&&this.rootMc.removeChild(this.mc)}initCC(){}constructor(e){(0,i._)(this,"props",void 0),(0,i._)(this,"root",void 0),(0,i._)(this,"cc",void 0),(0,i._)(this,"rootMc",void 0),(0,i._)(this,"lib",void 0),(0,i._)(this,"mc",void 0),(0,i._)(this,"rootEl",void 0),this.props=e}}class v extends m{init(){super.init()}start(){super.start(),this.show(),this.registerEvent()}clear(){super.clear(),this.unregisterEvent()}hide(){this.root.classList.add("hide")}show(){this.root.classList.remove("hide")}handleItem(e){0===e?a(window,{message:E.GO_SHAPE_FILL}):1===e&&a(window,{message:E.GO_TANGRAM})}registerEvent(){this.items.forEach((e,t)=>{e.addEventListener("click",()=>{this.boundHanldeItem(t)})})}unregisterEvent(){this.items.forEach((e,t)=>{e.removeEventListener("click",()=>{this.boundHanldeItem(t)})})}constructor(e){if(super(e),(0,i._)(this,"introProps",void 0),(0,i._)(this,"items",[]),(0,i._)(this,"boundHanldeItem",void 0),this.introProps=e,!this.props.root)return;this.root=document.querySelector(this.props.root),this.items=Array.from(this.root.querySelectorAll(".select__box .item")),this.boundHanldeItem=this.handleItem.bind(this)}}let f=[{svg:`
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="none" width="83" height="72">
      <defs>
        <g id="Layer0_0_FILL">
          <path
            fill="#25BE53"
            stroke="none"
            d="
      M 840.25 351.15
      L 840.2 351.15 793.8 431.6 886.7 431.6 840.25 351.15 Z"
          />
        </g>
      </defs>
      <g transform="matrix( 0.899993896484375, 0, 0, 0.899993896484375, -714.4,-316.05) ">
        <use xlink:href="#Layer0_0_FILL" />
      </g>
    </svg>`},{svg:`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="none"
      x="0px"
      y="0px"
      width="144px"
      height="75px"
      viewBox="0 0 144 75"
    >
      <defs>
        <g id="Layer0_1_FILL">
          <path
            fill="#A7DB34"
            stroke="none"
            d="
      M 144 75
      L 144 0 0 0 0 75 144 75 Z"
          />
        </g>
      </defs>
      <g transform="matrix( 1, 0, 0, 1, 0,0) ">
        <use xlink:href="#Layer0_1_FILL" />
      </g>
    </svg>`},{svg:`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="none"
      x="0px"
      y="0px"
      width="167px"
      height="144px"
      viewBox="0 0 167 144"
    >
      <defs>
        <g id="Layer0_2_FILL">
          <path
            fill="#FFD819"
            stroke="none"
            d="
      M 937.8 147.05
      L 884 53.85 776.45 53.85 722.65 147.05 776.45 240.2 884 240.2 937.8 147.05 Z"
          />
        </g>
      </defs>
      <g transform="matrix( 0.777740478515625, 0, 0, 0.777740478515625, -562.05,-41.9) ">
        <use xlink:href="#Layer0_2_FILL" />
      </g>
    </svg>`},{svg:`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="none"
      x="0px"
      y="0px"
      width="140px"
      height="140px"
      viewBox="0 0 140 140"
    >
      <defs>
        <g id="Layer0_3_FILL">
          <path
            fill="#FF8AB8"
            stroke="none"
            d="
      M 1149.35 279.1
      L 993.3 123.05 993.3 279.1 1149.35 279.1 Z"
          />
        </g>
      </defs>
      <g transform="matrix( -0.899993896484375, 0, 0, 0.899993896484375, 1034.4,-110.75) ">
        <use xlink:href="#Layer0_3_FILL" />
      </g>
    </svg>`},{svg:`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="none"
      x="0px"
      y="0px"
      width="161px"
      height="43px"
      viewBox="0 0 161 43"
    >
      <defs>
        <g id="Layer0_4_FILL">
          <path
            fill="#6274E0"
            stroke="none"
            d="
      M 349.7 407.2
      L 422.05 449.05 380.35 376.65 308 334.75 349.7 407.2 Z"
          />
        </g>
      </defs>
      <g transform="matrix( -0.70709228515625, 0.70709228515625, -0.70709228515625, -0.70709228515625, 616,40.7) ">
        <use xlink:href="#Layer0_4_FILL" />
      </g>
    </svg>`},{svg:`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="none"
      x="0px"
      y="0px"
      width="167px"
      height="72px"
      viewBox="0 0 167 72"
    >
      <defs>
        <g id="Layer0_5_FILL">
          <path
            fill="#FF3B19"
            stroke="none"
            d="
M 782.75 308.15
L 736.25 388.6 922.15 388.6 875.65 308.15 782.75 308.15 Z"
          />
        </g>
      </defs>
      <g transform="matrix( 0.899993896484375, 0, 0, 0.899993896484375, -662.6,-277.35) ">
        <use xlink:href="#Layer0_5_FILL" />
      </g>
    </svg>`},{svg:`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="none"
      x="0px"
      y="0px"
      width="125px"
      height="72px"
      viewBox="0 0 125 72"
    >
      <defs>
        <g id="Layer0_6_FILL">
          <path
            fill="#37B0EE"
            stroke="none"
            d="
M 1042.1 388.6
L 1088.6 308.15 995.7 308.15 949.2 388.6 1042.1 388.6 Z"
          />
        </g>
      </defs>
      <g transform="matrix( 0.899993896484375, 0, 0, 0.899993896484375, -854.25,-277.35) ">
        <use xlink:href="#Layer0_6_FILL" />
      </g>
    </svg>`},{svg:`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="none"
      x="0px"
      y="0px"
      width="86px"
      height="86px"
      viewBox="0 0 86 86"
    >
      <defs>
        <g id="Layer0_7_FILL">
          <path
            fill="#8D58CE"
            stroke="none"
            d="
      M 969.85 512.5
      Q 944 512.5 925.75 530.75 907.5 549 907.5 574.85 907.5 600.7 925.75 618.95 944 637.2 969.85 637.2 995.7 637.2 1013.95 618.95 1032.2 600.7 1032.2 574.85 1032.2 549 1013.95 530.75 995.7 512.5 969.85 512.5 Z"
          />
        </g>
      </defs>
      <g transform="matrix( 0.67047119140625, 0, 0, 0.670806884765625, -607.25,-342.6) ">
        <use xlink:href="#Layer0_7_FILL" />
      </g>
    </svg>`},{svg:`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="none"
      x="0px"
      y="0px"
      width="86px"
      height="86px"
      viewBox="0 0 86 86"
    >
      <defs>
        <g id="Layer0_8_FILL">
          <path
            fill="#FF982F"
            stroke="none"
            d="
M 800.2 308.15
L 800.2 388.6 880.65 388.6 880.65 308.15 800.2 308.15 Z"
          />
        </g>
      </defs>
      <g transform="matrix( 1.0391845703125, 0, 0, 1.0391082763671875, -830.35,-319) ">
        <use xlink:href="#Layer0_8_FILL" />
      </g>
    </svg>
    `}];class S{getDragOrigin(e){if(!e)return"unknown";let t=e.parentElement;for(;t;){if(t.matches(S.SHAPE_LIST_SELECTOR))return"source";if(t.matches(S.PLAYGROUND_SELECTOR))return"playground";t=t.parentElement}return"unknown"}init(){this.findContainers(),this.identifyDraggableShapes(),this.addEventListeners(),l("Drag and Drop init",this.draggableShapes.length,"shapes")}destroy(){this.removeEventListeners(),this.draggableShapes=[],this.currentDragShape=null,this.currentDragOrigin="unknown",this.isDragging=!1,l("Drag and Drop destroy")}refresh(){this.removeEventListeners(),this.identifyDraggableShapes(),this.addEventListeners()}findContainers(){if(this.sourceContainer=document.querySelector(this.config.sourceSelector),this.targetContainer=document.querySelector(this.config.targetSelector),!this.sourceContainer||!this.targetContainer)throw Error("Drag and drop containers not found.")}identifyDraggableShapes(){if(this.draggableShapes=[],this.sourceContainer){let e=Array.from(this.sourceContainer.querySelectorAll("svg")).map((e,t)=>({element:e,index:t,originalParent:e.parentElement,originalNextSibling:e.nextSibling}));this.draggableShapes.push(...e)}if(this.targetContainer){let e=Array.from(this.targetContainer.querySelectorAll("svg")).map((e,t)=>({element:e,index:t+1e3,originalParent:e.parentElement,originalNextSibling:e.nextSibling}));this.draggableShapes.push(...e)}}addEventListeners(){this.draggableShapes.forEach(e=>{e.element.addEventListener("mousedown",t=>this.boundHandleDragStart(e,t)),e.element.addEventListener("touchstart",t=>this.boundHandleDragStart(e,t),{passive:!1})})}removeEventListeners(){}getEventCoords(e){return"touches"in e?e.touches[0]||e.changedTouches[0]:e}getShapeBaseDimensions(e){return{width:parseFloat(e.getAttribute("width")||"0"),height:parseFloat(e.getAttribute("height")||"0")}}handleDragStart(e,t){if(this.isDragging||!["path","use","polygon","rect","circle","ellipse"].includes(t.target.tagName.toLowerCase()))return;this.currentDragShape=e;let s="touches"in t?"touchmove":"mousemove",i="touches"in t?"touchend":"mouseup";document.addEventListener(s,this.boundHandleDragMove,{passive:!1}),document.addEventListener(i,this.boundHandleDragEnd)}handleDragMove(e){if(!this.currentDragShape||(this.isDragging||(this.isDragging=!0,this.initializeDrag(e)),!this.isDragging||!this.dragContext))return;e.preventDefault();let{clientX:t,clientY:s}=this.getEventCoords(e),i=this.currentDragShape.clonedElement||this.currentDragShape.element,{wrapRect:n,scale:o}=this.dragContext,r=(t-n.left)/o-this.centerDragOffset.x,a=(s-n.top)/o-this.centerDragOffset.y,{width:l,height:h}=this.getShapeBaseDimensions(i);i.style.left=`${r-l/2}px`,i.style.top=`${a-h/2}px`}initializeDrag(e){var t,s;let i;if(!this.currentDragShape)return;this.config.handleShape.deselectShape();let n=this.currentDragShape,{clientX:r,clientY:a}=this.getEventCoords(e),l=n.element.getBoundingClientRect(),h=document.querySelector("#wrap")||document.body,d=h.getBoundingClientRect(),c=window.bound.scale||1,u=(l.left-d.left+l.width/2)/c,p=(l.top-d.top+l.height/2)/c,g=(r-d.left)/c,m=(a-d.top)/c;this.centerDragOffset={x:g-u,y:m-p},this.dragContext={wrapRect:d,scale:c};let v=this.getDragOrigin(n.element);this.currentDragOrigin=v;let f=n.element.style.transform;if("source"===v){let e=n.element.cloneNode(!0);n.clonedElement=e,i=e}else i=n.element,n.clonedElement=void 0;h.appendChild(i);let{width:S,height:b}=this.getShapeBaseDimensions(i);Object.assign(i.style,{position:"absolute",left:`${u-S/2}px`,top:`${p-b/2}px`,zIndex:"9999",pointerEvents:"none",transform:f,margin:"0"}),null==(t=(s=this.config).onDragStart)||t.call(s,i,n.index),this.config.enableSounds&&o.play("drag_start")}handleDragEnd(e){if(document.removeEventListener("touches"in e?"touchmove":"mousemove",this.boundHandleDragMove),document.removeEventListener("touches"in e?"touchend":"mouseup",this.boundHandleDragEnd),this.isDragging){var t;if(!this.currentDragShape)return;let{clientX:s,clientY:i}=this.getEventCoords(e),n=this.currentDragShape.clonedElement||this.currentDragShape.element;n.style.display="none";let o=document.elementFromPoint(s,i);n.style.display="";let r=(null==(t=this.targetContainer)?void 0:t.contains(o))?this.targetContainer:null;r?this.completeDrop(this.currentDragShape,r,s,i):this.cancelDrag(this.currentDragShape)}else{if(!this.currentDragShape)return;let e=this.currentDragShape.element;"playground"===this.getDragOrigin(e)&&this.config.handleShape.selectShape(e)}this.isDragging=!1,this.currentDragShape=null,this.currentDragOrigin="unknown",this.dragContext=null,(document.querySelector("#wrap")||document.body).style.cursor=""}completeDrop(e,t,s,i){var n,r;let a=e.clonedElement||e.element,h=t.getBoundingClientRect(),d=window.bound.scale||1,c=(s-h.left)/d-this.centerDragOffset.x,u=(i-h.top)/d-this.centerDragOffset.y,{width:p,height:g}=this.getShapeBaseDimensions(a),m=c-p/2,v=u-g/2;Object.assign(a.style,{position:"absolute",left:`${m}px`,top:`${v}px`,zIndex:"auto",cursor:"default",pointerEvents:""}),t.appendChild(a);let f=e.clonedElement?"clone placed":"element moved";e.clonedElement&&(e.clonedElement=void 0),null==(n=(r=this.config).onDropSuccess)||n.call(r,a,e.index,t),this.config.enableSounds&&o.play("drop_success"),l(`Drop completed ${e.index} (${f})`,{x:m,y:v}),setTimeout(()=>this.refresh(),0)}cancelDrag(e){var t,s;e.clonedElement?(this.removeClonedShape(e.clonedElement),e.clonedElement=void 0,l(`Drag cancelled ${e.index} (clone removed)`)):"playground"===this.currentDragOrigin?(this.deletePlaygroundShape(e),l(`Drag cancelled ${e.index} (playground shape deleted)`)):(this.returnShapeToOriginal(e),l(`Drag cancelled ${e.index} (source shape returned)`)),null==(t=(s=this.config).onDropFail)||t.call(s,e.element,e.index),this.config.enableSounds&&o.play("drop_fail")}removeClonedShape(e){e&&e.parentElement&&(e.remove(),l("Cloned shape removed from DOM"))}deletePlaygroundShape(e){let t=e.element;t&&t.parentElement&&(t.remove(),l(`Playground shape ${e.index} deleted from DOM`),setTimeout(()=>this.refresh(),0))}returnShapeToOriginal(e){let t=e.element;Object.assign(t.style,{position:"",left:"",top:"",transform:"",cursor:"default",zIndex:"auto",pointerEvents:"auto"}),t.parentElement!==e.originalParent&&(e.originalNextSibling&&e.originalParent.contains(e.originalNextSibling)?e.originalParent.insertBefore(t,e.originalNextSibling):e.originalParent.appendChild(t)),l(`Shape ${e.index} returned to original position`)}constructor(e){(0,i._)(this,"config",void 0),(0,i._)(this,"sourceContainer",null),(0,i._)(this,"targetContainer",null),(0,i._)(this,"draggableShapes",[]),(0,i._)(this,"isDragging",!1),(0,i._)(this,"currentDragShape",null),(0,i._)(this,"currentDragOrigin","unknown"),(0,i._)(this,"centerDragOffset",{x:0,y:0}),(0,i._)(this,"dragContext",null),(0,i._)(this,"boundHandleDragStart",void 0),(0,i._)(this,"boundHandleDragMove",void 0),(0,i._)(this,"boundHandleDragEnd",void 0),this.config={enableSounds:!0,...e},this.boundHandleDragStart=this.handleDragStart.bind(this),this.boundHandleDragMove=this.handleDragMove.bind(this),this.boundHandleDragEnd=this.handleDragEnd.bind(this)}}(0,i._)(S,"SHAPE_LIST_SELECTOR",".shape__list"),(0,i._)(S,"PLAYGROUND_SELECTOR",".playground__box");class b{init(){this.container.addEventListener("click",this.boundHandleClick),l("HandleShape initialized.")}handleClick(e){let t=e.target;t.closest("svg")||t.closest(".shape-controller")||this.deselectShape()}selectShape(e){this.selectedShape!==e&&(this.deselectShape(),this.selectedShape=e,this.selectedShape.classList.add("selected"),this.createController(e))}deselectShape(){this.selectedShape&&(this.selectedShape.classList.remove("selected"),this.selectedShape=null,this.removeController())}createController(e){this.controller&&this.removeController(),this.controlBox=document.createElement("div"),this.controlBox.className="control-box",this.controlBox.addEventListener("mouseleave",this.boundHandleMouseLeaveControlBox),this.controller=document.createElement("div"),this.controller.className="shape-controller";let t=this.createButton("delete","삭제"),s=this.createButton("scale","크기 조절"),i=this.createButton("rotate","회전");this.controller.append(t,s,i),this.container.appendChild(this.controller),this.container.appendChild(this.controlBox),this.updateControllerPosition(e),t.addEventListener("click",()=>this.handleDelete()),s.addEventListener("mousedown",this.boundHandleMouseDown),i.addEventListener("mousedown",this.boundHandleMouseDown)}removeController(){this.controlBox&&(this.controlBox=null),this.controller&&(this.controller=null)}updateControllerPosition(e){if(!this.controller||!this.controlBox)return;let t=e.getBoundingClientRect(),s=this.container.getBoundingClientRect(),i=t.width,n=t.height,o=Math.max(i,n)*this.config.controlBoxScale,r=t.left-s.left+i/2-o/2,a=t.top-s.top+n/2-o/2;this.controlBox.style.width=`${o}px`,this.controlBox.style.height=`${o}px`,this.controlBox.style.transform=`translate(${r}px, ${a}px)`}createButton(e,t){let s=document.createElement("button");return s.className=`ctrl-btn btn-${e}`,s.setAttribute("aria-label",t),s.dataset.type=e,s}handleDelete(){this.selectedShape&&(this.selectedShape.remove(),this.deselectShape())}handleMouseDown(e){e.stopPropagation();let t=e.currentTarget.dataset.type;if(!this.selectedShape||!t)return;this.isInteracting=t;let{scale:s,rotation:i}=this.getCurrentTransform(this.selectedShape),n=this.selectedShape.getBoundingClientRect(),o=n.left+n.width/2,r=n.top+n.height/2,a=Math.atan2(e.clientY-r,e.clientX-o)*(180/Math.PI);this.latestTransform={scale:s,rotation:i},this.interactionState={element:this.selectedShape,startX:e.clientX,startY:e.clientY,initialTransform:{scale:s,rotation:i},initialMetrics:{cx:o,cy:r},previousAngle:a},document.addEventListener("mousemove",this.boundHandleMouseMove),document.addEventListener("mouseup",this.boundHandleMouseUp)}handleMouseMove(e){if(!this.isInteracting||!this.interactionState)return;let{element:t,initialTransform:s,initialMetrics:i}=this.interactionState;if("scale"===this.isInteracting){let{startX:t,startY:i}=this.interactionState,n=e.clientX-t,o=e.clientY-i,r=Math.sqrt(n*n+o*o),a=e.clientX>t?1:-1;this.latestTransform.scale=Math.max(.1,s.scale+r*a/200)}if("rotate"===this.isInteracting){let t=Math.atan2(e.clientY-i.cy,e.clientX-i.cx)*(180/Math.PI),n=t-this.interactionState.previousAngle;n>180?n-=360:n<-180&&(n+=360);let o=s.rotation+n;this.interactionState.initialTransform.rotation=o,this.interactionState.previousAngle=t,this.latestTransform.rotation=o}this.scheduleUpdate()}scheduleUpdate(){this.isUpdateScheduled||(this.isUpdateScheduled=!0,requestAnimationFrame(()=>this.updateOnFrame()))}updateOnFrame(){if(this.isUpdateScheduled=!1,!this.interactionState)return;let{element:e}=this.interactionState;this.applyTransform(e,this.latestTransform.scale,this.latestTransform.rotation),this.updateControllerPosition(e)}handleMouseUp(){this.isInteracting=!1,this.interactionState=null,document.removeEventListener("mousemove",this.boundHandleMouseMove),document.removeEventListener("mouseup",this.boundHandleMouseUp)}getCurrentTransform(e){let t=e.style.transform,s=t.match(/scale\(([^)]+)\)/),i=t.match(/rotate\(([^)]+)\)/);return{scale:s?parseFloat(s[1]):1,rotation:i?parseFloat(i[1]):0}}applyTransform(e,t,s){e.style.transform=`scale(${t}) rotate(${s}deg)`}hideController(){this.deselectShape()}constructor(e){(0,i._)(this,"container",void 0),(0,i._)(this,"config",void 0),(0,i._)(this,"selectedShape",null),(0,i._)(this,"controller",null),(0,i._)(this,"controlBox",null),(0,i._)(this,"isInteracting",!1),(0,i._)(this,"interactionState",null),(0,i._)(this,"isUpdateScheduled",!1),(0,i._)(this,"latestTransform",{scale:1,rotation:0}),(0,i._)(this,"boundHandleClick",void 0),(0,i._)(this,"boundHandleMouseDown",void 0),(0,i._)(this,"boundHandleMouseMove",void 0),(0,i._)(this,"boundHandleMouseUp",void 0),(0,i._)(this,"boundHandleMouseLeaveControlBox",void 0),this.config={containerSelector:e.containerSelector,controlBoxScale:1.5};let t=document.querySelector(this.config.containerSelector);if(!t)throw Error(`Container with selector "${this.config.containerSelector}" not found.`);this.container=t,this.boundHandleClick=this.handleClick.bind(this),this.boundHandleMouseDown=this.handleMouseDown.bind(this),this.boundHandleMouseMove=this.handleMouseMove.bind(this),this.boundHandleMouseUp=this.handleMouseUp.bind(this),this.boundHandleMouseLeaveControlBox=this.deselectShape.bind(this)}}var w=s(415);class y extends m{init(){super.init()}start(){super.start(),this.show(),this.renderPieces(),this.initShapeHandler(),this.initDragAndDrop(),this.registerEvent()}clear(){var e;super.clear(),this.destroyDragAndDrop(),null==(e=this.handleShape)||e.deselectShape(),this.isModalOpen&&this.closeModal(),this.destroyScrollbar(),this.unregisterEvent()}hide(){this.root.classList.add("hide")}show(){this.root.classList.remove("hide")}registerEvent(){var e,t,s;null==(e=this.btnSelect)||e.addEventListener("click",this.boundToggleModal),null==(t=this.btnHome)||t.addEventListener("click",this.boundHandleHome),this.modalShapeList.forEach((e,t)=>{e.addEventListener("click",this.boundHandleShapeSelect.bind(this,t))}),null==(s=this.btnRetry)||s.addEventListener("click",this.boundHandleRetry)}unregisterEvent(){var e,t,s;null==(e=this.btnSelect)||e.removeEventListener("click",this.boundToggleModal),null==(t=this.btnHome)||t.removeEventListener("click",this.boundHandleHome),this.modalShapeList.forEach((e,t)=>{e.removeEventListener("click",this.boundHandleShapeSelect.bind(this,t))}),null==(s=this.btnRetry)||s.removeEventListener("click",this.boundHandleRetry)}handleHome(){a(window,{message:E.GO_INTRO})}handleRetry(){var e;let t=this.root.querySelector(".base-shape");if(t){let e=Array.from(t.classList).filter(e=>e.startsWith("piece-"));t.classList.remove(...e)}Array.from((null==(e=this.playground)?void 0:e.children)||[]).forEach(e=>{e.classList.contains("base-shape")||e.remove()})}handleModal(){this.isModalOpen?this.closeModal():this.openModal()}openModal(){let e=this.root.querySelector(".select__shape__modal");if(!e)return;let t=e.querySelector(".btn-close");t&&t.addEventListener("click",this.boundCloseModal),e.classList.remove("hide"),this.isModalOpen=!0,this.initScrollbar()}closeModal(){let e=this.root.querySelector(".select__shape__modal");if(!e)return;let t=e.querySelector(".btn-close");t&&t.removeEventListener("click",this.boundCloseModal),e.classList.add("hide"),this.isModalOpen=!1,this.destroyScrollbar()}renderPieces(){let e=this.root.querySelector(".shape__list");e&&(e.innerHTML="",f.forEach((t,s)=>{let i=document.createElement("div");i.classList.add(`piece-${s}`),i.innerHTML=t.svg,e.appendChild(i)}))}initDragAndDrop(){this.shapeDragAndDrop&&this.shapeDragAndDrop.destroy(),this.shapeDragAndDrop=new S({sourceSelector:".shape__list",targetSelector:".playground__box",handleShape:this.handleShape}),this.shapeDragAndDrop.init()}initShapeHandler(){this.handleShape=new b({containerSelector:".playground__box"}),this.handleShape.init()}destroyDragAndDrop(){this.shapeDragAndDrop&&this.shapeDragAndDrop.destroy()}initScrollbar(){let e=this.root.querySelector(".select__shape__modal");if(!e)return;let t=e.querySelector("#scroll-container");t&&!this.scrollbarInstance&&(this.scrollbarInstance=(0,w.UN)(t,{scrollbars:{clickScroll:!0},overflow:{x:"hidden",y:"scroll"},showNativeOverlaidScrollbars:!1,update:{debounce:[0,30]}}))}destroyScrollbar(){this.scrollbarInstance&&(this.scrollbarInstance.destroy(),this.scrollbarInstance=null)}handleShapeSelect(e){var t;l(`shapeIndex: ${e}`);let s=this.root.querySelector(".base-shape");if(s){let e=Array.from(s.classList).filter(e=>e.startsWith("piece-"));s.classList.remove(...e)}Array.from((null==(t=this.playground)?void 0:t.children)||[]).forEach(e=>{e.classList.contains("base-shape")||e.remove()}),this.modalShapeList[e]?null==s||s.classList.add(`piece-${e}`):l("shape is undefined"),this.closeModal()}constructor(e){if(super(e),(0,i._)(this,"scrollbarInstance",null),(0,i._)(this,"isModalOpen",!1),(0,i._)(this,"props",void 0),(0,i._)(this,"playground",null),(0,i._)(this,"btnHome",null),(0,i._)(this,"btnSelect",null),(0,i._)(this,"btnSave",null),(0,i._)(this,"btnRetry",null),(0,i._)(this,"modalShapeList",[]),(0,i._)(this,"shapeDragAndDrop",void 0),(0,i._)(this,"handleShape",void 0),(0,i._)(this,"boundToggleModal",void 0),(0,i._)(this,"boundHandleHome",void 0),(0,i._)(this,"boundCloseModal",void 0),(0,i._)(this,"boundHandleShapeSelect",void 0),(0,i._)(this,"boundHandleRetry",void 0),this.props=e,this.boundToggleModal=this.handleModal.bind(this),this.boundHandleHome=this.handleHome.bind(this),this.boundCloseModal=this.closeModal.bind(this),this.boundHandleShapeSelect=this.handleShapeSelect.bind(this),this.boundHandleRetry=this.handleRetry.bind(this),!this.props.root)return;this.root=document.querySelector(this.props.root),this.playground=this.root.querySelector(".playground__box"),this.btnHome=this.root.querySelector(".btn__home"),this.btnSelect=this.root.querySelector(".btn__select"),this.btnRetry=this.root.querySelector(".btn__retry"),this.modalShapeList=Array.from(this.root.querySelectorAll(".select__shape__modal .grid-box .shape-item")),this.shapeDragAndDrop=new S({sourceSelector:".shape__list",targetSelector:".playground__box",handleShape:this.handleShape}),this.handleShape=new b({containerSelector:".playground__box"})}}class _ extends m{init(){super.init()}start(){super.start(),this.show()}clear(){super.clear()}hide(){this.root.classList.add("hide")}show(){this.root.classList.remove("hide")}constructor(e){super(e)}}class x extends m{init(){super.init()}start(){super.start(),this.show()}clear(){super.clear()}hide(){this.root.classList.add("hide")}show(){this.root.classList.remove("hide")}constructor(e){super(e)}}class E extends g{init(){super.init(),this.createSteps(),this.initSounds(),this.initSteps(),this.start()}createSteps(){this.steps=this.stepDefinitions.map(e=>new e.class({root:e.selector}))}initSounds(){(this.makeShapeProps.sounds.list||[]).forEach(e=>{o.add(e)})}initSteps(){this.steps.forEach(e=>{e.init()})}initCC(){super.initCC()}hnMessage(e){super.hnMessage(e);let{message:t}=e.detail,s=this.stepMessageMap[t];void 0!==s&&this.changeStep(s)}start(){this.changeStep(this.makeShapeProps.startStepIndex??0)}changeStep(e){e<0||e>=this.steps.length||this.stepIndex===e||(o.stopAll(),this.step&&(this.step.clear(),this.step.hide()),this.stepIndex=e,this.step=this.steps[this.stepIndex],this.step.start(),l(`\u{1F680} STEP : ${this.step.constructor.name}`))}stepKill(){this.step&&(this.step.clear(),this.step.hide())}constructor(e){super(e),(0,i._)(this,"stepDefinitions",[{class:v,selector:".intro__component"},{class:y,selector:".shape_fill__component"},{class:_,selector:".tangram__component"},{class:x,selector:".outro__component"}]),(0,i._)(this,"stepMessageMap",{[E.GO_INTRO]:0,[E.GO_SHAPE_FILL]:1,[E.GO_TANGRAM]:2,[E.GO_OUTRO]:3}),(0,i._)(this,"makeShapeProps",void 0),(0,i._)(this,"step",void 0),(0,i._)(this,"steps",void 0),(0,i._)(this,"stepIndex",-1),this.makeShapeProps=e}}(0,i._)(E,"GO_INTRO","GO_INTRO"),(0,i._)(E,"GO_SHAPE_FILL","GO_SHAPE_FILL"),(0,i._)(E,"GO_TANGRAM","GO_TANGRAM"),(0,i._)(E,"GO_OUTRO","GO_OUTRO"),s(919);let L=new class{setupInit(e){this.initPage=e}noDelay(){this.isNoDelay=!0}init(){this.initButtonHover(),this.initScale(),o.add([{id:"button",src:d,ignoreStop:!0}]),this.isNoDelay?this.showContent():this.tioShow=setTimeout(()=>{this.showContent()},1e3)}initButtonHover(){var e;(Array.isArray(e=Array.from(new Set([...Array.from(document.querySelectorAll('*[class*="btn"]:not([class*="btns"])')),...Array.from(document.querySelectorAll("button"))])))?e:[e]).forEach(e=>{e.addEventListener("pointerenter",t=>{"touch"!==(t.pointerType||"touch")&&e.classList.add("hover")}),e.addEventListener("pointerleave",t=>{"touch"!==(t.pointerType||"touch")&&e.classList.remove("hover")})})}showContent(){if(this.root&&this.root.classList.remove("hidden"),this.tioShow&&clearTimeout(this.tioShow),1===this.pages.length){let e=this.pages[0];e.init(),e.activate()}else for(let e of this.pages)e.init();a(window,{message:"CONTENT_READY"})}hnMessage(e){let t=e.detail;l("hnMessage :: ",t.message),t.message}initScale(){this.resize&&(this.setScale(),window.addEventListener("resize",()=>{this.setScale()}),window.addEventListener("orientationchange",()=>{setTimeout(()=>{this.setScale()},1e3)}))}setScale(){this.root&&(window.bound=function(e,t,s){let i=Math.min(window.innerWidth/1280,window.innerHeight/720),n=(window.innerWidth-1280*i)/2,o=(window.innerHeight-720*i)/2;return e.style.transformOrigin="top left",e.style.left=`${n}px`,e.style.top=`${o}px`,e.style.transform=`scale(${i})`,{x:n,y:o,scale:i}}(this.root,1280,720),a(window,{message:"CONTENT_RESIZE"}))}constructor(e){for(let t of((0,i._)(this,"props",void 0),(0,i._)(this,"resize",void 0),(0,i._)(this,"root",void 0),(0,i._)(this,"pages",[]),(0,i._)(this,"initPage",void 0),(0,i._)(this,"tioShow",void 0),(0,i._)(this,"isNoDelay",!1),(0,i._)(this,"messageHandler",void 0),this.props=e??{},this.resize=this.props.resize??!0,window.oncontextmenu=e=>(e.preventDefault(),e.stopPropagation(),!1),this.root=document.querySelector("#wrap"),Array.from(document.querySelectorAll("img"))))t.draggable=!1;window.addEventListener("load",()=>{this.pages=this.initPage(),this.init()}),this.messageHandler=this.hnMessage.bind(this),window.addEventListener("MESSAGE",this.messageHandler)}};L.noDelay(),L.setupInit(function(){return[new E({root:".root",sounds:{list:[]},startStepIndex:0})]})}},t={};function s(i){var n=t[i];if(void 0!==n)return n.exports;var o=t[i]={id:i,loaded:!1,exports:{}};return e[i].call(o.exports,o,o.exports,s),o.loaded=!0,o.exports}s.m=e,s.d=(e,t)=>{for(var i in t)s.o(t,i)&&!s.o(e,i)&&Object.defineProperty(e,i,{enumerable:!0,get:t[i]})},s.hmd=e=>((e=Object.create(e)).children||(e.children=[]),Object.defineProperty(e,"exports",{enumerable:!0,set:()=>{throw Error("ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: "+e.id)}}),e),s.g=(()=>{if("object"==typeof globalThis)return globalThis;try{return this||Function("return this")()}catch(e){if("object"==typeof window)return window}})(),s.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{var e=[];s.O=(t,i,n,o)=>{if(i){o=o||0;for(var r=e.length;r>0&&e[r-1][2]>o;r--)e[r]=e[r-1];e[r]=[i,n,o];return}for(var a=1/0,r=0;r<e.length;r++){for(var[i,n,o]=e[r],l=!0,h=0;h<i.length;h++)(!1&o||a>=o)&&Object.keys(s.O).every(e=>s.O[e](i[h]))?i.splice(h--,1):(l=!1,o<a&&(a=o));if(l){e.splice(r--,1);var d=n();void 0!==d&&(t=d)}}return t}})(),s.rv=()=>"1.3.8",(()=>{s.g.importScripts&&(e=s.g.location+"");var e,t=s.g.document;if(!e&&t&&(t.currentScript&&"SCRIPT"===t.currentScript.tagName.toUpperCase()&&(e=t.currentScript.src),!e)){var i=t.getElementsByTagName("script");if(i.length)for(var n=i.length-1;n>-1&&(!e||!/^http(s?):/.test(e));)e=i[n--].src}if(!e)throw Error("Automatic publicPath is not supported in this browser");s.p=(e=e.replace(/^blob:/,"").replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"))+"../"})(),(()=>{var e={980:0};s.O.j=t=>0===e[t];var t=(t,i)=>{var n,o,[r,a,l]=i,h=0;if(r.some(t=>0!==e[t])){for(n in a)s.o(a,n)&&(s.m[n]=a[n]);if(l)var d=l(s)}for(t&&t(i);h<r.length;h++)o=r[h],s.o(e,o)&&e[o]&&e[o][0](),e[o]=0;return s.O(d)},i=self.webpackChunkamanta_2025_project=self.webpackChunkamanta_2025_project||[];i.forEach(t.bind(null,0)),i.push=t.bind(null,i.push.bind(i))})(),s.ruid="bundler=rspack@1.3.8";var i=s.O(void 0,["971"],function(){return s(253)});i=s.O(i)})();