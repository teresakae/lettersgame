function goToPage(id, cb) {
  var cur = document.querySelector('.page.active');
  var tgt = document.getElementById(id);
  if (!tgt) { return; }
  if (cur && cur !== tgt) {
    cur.style.animation = 'fadeOut .35s ease forwards';
    setTimeout(function () {
      cur.style.animation = '';
      cur.classList.remove('active');
      tgt.classList.add('active');
      tgt.style.animation = 'fadeIn .5s ease both';
      var so = tgt.querySelector('.scroll-outer');
      if (so) so.scrollTop = 0;
      if (typeof cb === 'function') cb();
    }, 320);
  } else {
    tgt.classList.add('active');
    if (typeof cb === 'function') cb();
  }
}

var _modalCloseCallback = null;

(function () {
  var modal  = document.getElementById('letter-modal');
  var mImg   = document.getElementById('letter-modal-img');
  var mPH    = document.getElementById('letter-modal-placeholder');
  var mClose = document.getElementById('letter-modal-close');
  var mBG    = document.getElementById('letter-modal-backdrop');

  window.openLetterModal = function (src, onClose) {
    _modalCloseCallback = onClose || null;
    mImg.style.display = 'block'; mPH.style.display = 'none';
    mImg.src = src;
    mImg.onerror = function () { mImg.style.display = 'none'; mPH.style.display = 'flex'; };
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  function closeMod() {
    modal.hidden = true;
    document.body.style.overflow = '';
    setTimeout(function () { mImg.src = ''; }, 350);
    if (typeof _modalCloseCallback === 'function') {
      var cb = _modalCloseCallback;
      _modalCloseCallback = null;
      cb();
    }
  }

  mClose.addEventListener('click',    closeMod);
  mBG.addEventListener('click',       closeMod);
  mClose.addEventListener('touchend', function (e) { e.preventDefault(); closeMod(); });
  mBG.addEventListener('touchend',    function (e) { e.preventDefault(); closeMod(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeMod(); });
})();

function initEnvPage(btnId, nextPage) {
  var btn = document.getElementById(btnId);
  if (!btn) return;

  var opened = false;

  btn.addEventListener('click',    openEnv);
  btn.addEventListener('touchend', function (e) { e.preventDefault(); openEnv(); });

  function openEnv() {
    if (opened) return;
    opened = true;
    btn.classList.add('opened');
    var src = btn.dataset.src;
    setTimeout(function () {
      openLetterModal(src, function () {
        goToPage(nextPage, function () {
          setTimeout(function () {
            opened = false;
            btn.classList.remove('opened');
          }, 400);
        });
      });
    }, 400);
  }
}

initEnvPage('env-page-3-btn', 'page-2');
initEnvPage('env-page-5-btn', 'page-4');
initEnvPage('env-page-7-btn', 'page-6');
initEnvPage('env-page-9-btn', 'page-8');

(function () {
  var btn = document.getElementById('btn-start');
  if (!btn) return;
  btn.addEventListener('click', function () { goToPage('page-3'); });
  btn.addEventListener('touchstart', function () { btn.style.transform = 'scale(.96)'; }, { passive: true });
  btn.addEventListener('touchend',   function () { btn.style.transform = ''; },           { passive: true });
})();

(function () {
  var WORD = 'SHARK', WLEN = 5, ROWS = 6;
  var WIN_MSGS = ['bb got it \u2661','YIBBEE!! \u2661','bb goated \u2661',"bb so smort!!! \u2661",'SHARK! \u2661'];
  var row = 0, col = 0, cur = '', over = false;

  var grid   = document.getElementById('wordle-grid');
  var toast  = document.getElementById('wordle-toast');
  var acts   = document.getElementById('wordle-actions');
  var btnCon = document.getElementById('btn-continue');
  var btnRet = document.getElementById('btn-retry');

  function buildGrid() {
    grid.innerHTML = '';
    for (var r = 0; r < ROWS; r++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'wordle-row'; rowEl.id = 'row-' + r;
      for (var c = 0; c < WLEN; c++) {
        var t = document.createElement('div');
        t.className = 'wordle-tile'; t.id = 'tile-' + r + '-' + c;
        rowEl.appendChild(t);
      }
      grid.appendChild(rowEl);
    }
  }

  function tile(r, c) { return document.getElementById('tile-' + r + '-' + c); }

  var toastT = null;
  function showToast(msg, persist) {
    clearTimeout(toastT); toast.textContent = msg; toast.classList.add('visible');
    if (!persist) toastT = setTimeout(function () { toast.classList.remove('visible'); }, 1800);
  }

  var kstate = {}, RANK = { correct:2, present:1, absent:0 };
  function updateKey(letter, state) {
    if (!kstate[letter] || RANK[state] > RANK[kstate[letter]]) {
      kstate[letter] = state;
      var k = document.querySelector('.kb-key[data-key="' + letter.toLowerCase() + '"]');
      if (k) { k.classList.remove('correct','present','absent'); k.classList.add(state); }
    }
  }

  function evaluate(guess) {
    var res = Array(WLEN).fill('absent'), tgt = WORD.split(''), g = guess.split(''), used = Array(WLEN).fill(false);
    for (var i = 0; i < WLEN; i++) if (g[i] === tgt[i]) { res[i] = 'correct'; used[i] = true; }
    for (var i = 0; i < WLEN; i++) {
      if (res[i] === 'correct') continue;
      for (var j = 0; j < WLEN; j++) if (!used[j] && g[i] === tgt[j]) { res[i] = 'present'; used[j] = true; break; }
    }
    return res;
  }

  function submitRow() {
    if (cur.length < WLEN) { showToast('not enough letters'); shakeRow(row); return; }
    var guess = cur;
    if (guess === WORD) { process(guess); return; }
    showToast('checking\u2026');
    fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + guess.toLowerCase())
      .then(function (r) { if (r.ok) process(guess); else { showToast('not a word!'); shakeRow(row); } })
      .catch(function () { process(guess); });
  }

  function process(guess) {
    var states = evaluate(guess), r = row;
    for (var c = 0; c < WLEN; c++) {
      (function (c, s) {
        setTimeout(function () { var t = tile(r, c); t.classList.remove('filled'); t.classList.add(s); }, c * 100);
      })(c, states[c]);
      updateKey(guess[c], states[c]);
    }
    setTimeout(function () {
      if (guess === WORD) {
        for (var c = 0; c < WLEN; c++) (function (c) {
          setTimeout(function () {
            var t = tile(r, c); t.classList.add('bounce');
            t.addEventListener('animationend', function () { t.classList.remove('bounce'); }, { once: true });
          }, c * 80);
        })(c);
        setTimeout(function () {
          showToast(WIN_MSGS[Math.floor(Math.random() * WIN_MSGS.length)], true);
          acts.hidden = false; btnCon.hidden = false; btnRet.hidden = true;
        }, 500);
        over = true;
      } else if (r === ROWS - 1) {
        setTimeout(function () { showToast('the word was ' + WORD.toLowerCase() + ' \u2661', true); acts.hidden = false; btnRet.hidden = false; btnCon.hidden = true; }, 300);
        over = true;
      }
    }, WLEN * 100 + 400);
    row++; col = 0; cur = '';
  }

  function shakeRow(r) {
    var el = document.getElementById('row-' + r);
    el.classList.add('shake');
    el.addEventListener('animationend', function () { el.classList.remove('shake'); }, { once: true });
  }

  function reset() {
    row = 0; col = 0; cur = ''; over = false;
    toast.textContent = ''; toast.classList.remove('visible');
    acts.hidden = true; btnCon.hidden = true; btnRet.hidden = true;
    document.querySelectorAll('.kb-key').forEach(function (k) { k.classList.remove('correct','present','absent'); });
    Object.keys(kstate).forEach(function (k) { delete kstate[k]; });
    buildGrid();
  }

  function handleKey(key) {
    if (over) return;
    if (key === 'Backspace' || key === '\u232b') {
      if (col > 0) { col--; cur = cur.slice(0,-1); var t = tile(row,col); t.textContent = ''; t.classList.remove('filled'); }
      return;
    }
    if (key === 'Enter') { submitRow(); return; }
    if (/^[A-Za-z]$/.test(key) && col < WLEN) {
      var t = tile(row, col); t.textContent = key.toUpperCase(); t.classList.add('filled');
      cur += key.toUpperCase(); col++;
    }
  }

  document.addEventListener('keydown', function (e) {
    if (!document.getElementById('page-2').classList.contains('active')) return;
    handleKey(e.key);
  });
  document.getElementById('wordle-keyboard').addEventListener('click', function (e) {
    var k = e.target.closest('.kb-key'); if (k) handleKey(k.dataset.key);
  });

  btnCon.addEventListener('click', function () { goToPage('page-5'); });
  btnRet.addEventListener('click', reset);
  buildGrid();

  window.resetWordle = reset;
})();

(function () {
  var CATS = [
    { theme:'Starts with C',            words:['car','catito','cheemse','coffee'],   color:'#ffe4e1', tc:'#c2637a', level:0 },
    { theme:'Contains Double Letters',  words:['fatpee','otter','pee','pretty'],     color:'#ffb6c1', tc:'#9e3a52', level:1 },
    { theme:'bb Ways to Spell',         words:['birb','dawg','sharmk','smort'],      color:'#f48fb1', tc:'#fff',    level:2 },
    { theme:'Ways to Secure or Close',  words:['clamp','dog','paket','seal'],        color:'#c2637a', tc:'#fff',    level:3 },
  ];

  var MAX_ERR = 4;
  var sel = [], solved = [], errors = 0, over = false;

  var solvedEl  = document.getElementById('conn-solved');
  var gridEl    = document.getElementById('conn-grid');
  var submitBtn = document.getElementById('conn-submit');
  var desBtn    = document.getElementById('conn-deselect');
  var shufBtn   = document.getElementById('conn-shuffle');
  var dotsEl    = document.getElementById('conn-mistakes');
  var msgEl     = document.getElementById('conn-msg');
  var toastEl   = document.getElementById('conn-toast');
  var actsEl    = document.getElementById('conn-actions');
  var contBtn   = document.getElementById('conn-continue');
  var retBtn    = document.getElementById('conn-retry');

  function shuffle(a) {
    var b = a.slice();
    for (var i = b.length-1; i > 0; i--) { var j = Math.floor(Math.random()*(i+1)); var t=b[i]; b[i]=b[j]; b[j]=t; }
    return b;
  }

  function syncBtns() {
    submitBtn.disabled = sel.length !== 4 || over;
    desBtn.disabled    = sel.length === 0 || over;
    submitBtn.classList.toggle('active', sel.length === 4 && !over);
  }

  function dots() {
    dotsEl.innerHTML = '';
    for (var i = 0; i < MAX_ERR; i++) {
      var d = document.createElement('span');
      d.className = 'conn-dot' + (i < errors ? ' used' : '');
      dotsEl.appendChild(d);
    }
  }

  function build() {
    sel = []; solved = []; errors = 0; over = false;
    solvedEl.innerHTML = ''; gridEl.innerHTML = '';
    msgEl.textContent = ''; msgEl.hidden = true;
    toastEl.textContent = ''; toastEl.classList.remove('visible');
    actsEl.hidden = true; contBtn.hidden = true; retBtn.hidden = true;
    syncBtns(); dots();

    var words = [];
    CATS.forEach(function (c) { c.words.forEach(function (w) { words.push({ w:w, lv:c.level }); }); });
    words = shuffle(words);
    words.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'conn-tile'; btn.dataset.word = item.w; btn.dataset.level = item.lv;
      btn.textContent = item.w;
      btn.addEventListener('click', tileClick);
      btn.addEventListener('touchend', function (e) { e.preventDefault(); tileClick.call(btn); });
      gridEl.appendChild(btn);
    });
  }

  function tileClick() {
    if (over) return;
    var w = this.dataset.word, idx = sel.indexOf(w);
    if (idx !== -1) { sel.splice(idx,1); this.classList.remove('selected'); }
    else if (sel.length < 4) { sel.push(w); this.classList.add('selected'); }
    syncBtns();
  }

  shufBtn.addEventListener('click', function () {
    if (over) return;
    var tiles = shuffle(Array.from(gridEl.querySelectorAll('.conn-tile')));
    tiles.forEach(function (t) { gridEl.appendChild(t); });
  });

  desBtn.addEventListener('click', function () {
    if (over) return; clearSel();
  });

  submitBtn.addEventListener('click', function () {
    if (sel.length !== 4 || over) return;
    var match = null;
    CATS.forEach(function (c) {
      if (solved.indexOf(c.level) !== -1) return;
      if (sel.every(function (w) { return c.words.indexOf(w) !== -1; })) match = c;
    });
    if (match) correct(match); else wrong();
  });

  function correct(cat) {
    solved.push(cat.level);
    var rm = [];
    gridEl.querySelectorAll('.conn-tile').forEach(function (t) {
      if (cat.words.indexOf(t.dataset.word) !== -1) { rm.push(t); t.classList.add('correct-pop'); }
    });
    setTimeout(function () {
      rm.forEach(function (t) { t.remove(); });
      clearSel();
      var b = document.createElement('div');
      b.className = 'conn-solved-group'; b.style.background = cat.color; b.style.color = cat.tc;
      b.innerHTML = '<span class="conn-solved-theme">' + cat.theme + '</span><span class="conn-solved-words">' + cat.words.join(' \xb7 ') + '</span>';
      solvedEl.appendChild(b);
      requestAnimationFrame(function () { b.classList.add('revealed'); });
      if (solved.length === CATS.length) {
        setTimeout(function () {
          over = true; msgEl.textContent = 'bb got them all!! \u2661'; msgEl.hidden = false;
          actsEl.hidden = false; contBtn.hidden = false; retBtn.hidden = true; syncBtns();
        }, 500);
      }
    }, 600);
  }

  function wrong() {
    errors++; dots();
    var oneAway = CATS.some(function (c) {
      return solved.indexOf(c.level) === -1 && sel.filter(function (w) { return c.words.indexOf(w) !== -1; }).length === 3;
    });
    gridEl.querySelectorAll('.conn-tile.selected').forEach(function (t) {
      t.classList.add('shake');
      t.addEventListener('animationend', function () { t.classList.remove('shake'); }, { once: true });
    });
    if (oneAway) setTimeout(function () { flash('one away! \uD83D\uDC95'); }, 150);
    setTimeout(clearSel, 50);
    if (errors >= MAX_ERR) {
      setTimeout(function () {
        over = true; revealRem();
        msgEl.textContent = 'almost there!! \u2661'; msgEl.hidden = false;
        actsEl.hidden = false; retBtn.hidden = false; contBtn.hidden = true; syncBtns();
      }, oneAway ? 2200 : 600);
    }
  }

  var ft = null;
  function flash(txt) {
    clearTimeout(ft); toastEl.textContent = txt; toastEl.classList.add('visible');
    ft = setTimeout(function () { toastEl.classList.remove('visible'); }, 2200);
  }

  function clearSel() {
    sel = [];
    gridEl.querySelectorAll('.conn-tile.selected').forEach(function (t) { t.classList.remove('selected'); });
    syncBtns();
  }

  function revealRem() {
    gridEl.innerHTML = '';
    CATS.forEach(function (cat) {
      if (solved.indexOf(cat.level) !== -1) return;
      var b = document.createElement('div');
      b.className = 'conn-solved-group'; b.style.background = cat.color; b.style.color = cat.tc; b.style.opacity = '.75';
      b.innerHTML = '<span class="conn-solved-theme">' + cat.theme + '</span><span class="conn-solved-words">' + cat.words.join(' \xb7 ') + '</span>';
      solvedEl.appendChild(b);
      requestAnimationFrame(function () { b.classList.add('revealed'); });
    });
  }

  contBtn.addEventListener('click', function () { goToPage('page-7'); });
  retBtn.addEventListener('click', build);
  build();

  window.resetConnections = build;
})();

(function () {
  var ROWS = 8, COLS = 6;
  var LETTERS = [
    ['C','L','C','C','H','E'],
    ['D','O','R','S','M','E'],
    ['S','I','E','E','M','A'],
    ['E','R','D','A','T','L'],
    ['G','W','A','T','E','E'],
    ['R','N','G','U','F','S'],
    ['O','O','R','P','R','O'],
    ['U','D','E','E','E','G'],
  ];
  var ANSWERS = [
    { word:'CLODSIRE', span:false, path:[[0,0],[0,1],[1,1],[1,0],[2,0],[2,1],[3,1],[3,0]] },
    { word:'DAWG',     span:false, path:[[3,2],[4,2],[4,1],[5,2]] },
    { word:'GROUDON',  span:false, path:[[4,0],[5,0],[6,0],[7,0],[7,1],[6,1],[5,1]] },
    { word:'CHEEMSE',  span:false, path:[[0,3],[0,4],[0,5],[1,5],[1,4],[1,3],[2,3]] },
    { word:'MALTESE',  span:false, path:[[2,4],[2,5],[3,5],[3,4],[4,4],[5,5],[4,5]] },
    { word:'PEE',      span:false, path:[[6,3],[7,3],[7,4]] },
    { word:'FROG',     span:false, path:[[5,4],[6,4],[6,5],[7,5]] },
    { word:'CREATURE', span:true,  path:[[0,2],[1,2],[2,2],[3,3],[4,3],[5,3],[6,2],[7,2]] },
  ];
  var ANS_WORDS = ANSWERS.map(function (a) { return a.word; });
  var COLORS = ['#ffd6e0','#ffb6c1','#ff8fab','#f48fb1','#e07a9a','#c2637a','#a84f66'];
  var HINTS = ['bb thimgs','glhf, bb'], THRESH = [3,8];

  var found = {}, colorIdx = 0, validCount = 0, hintsGot = 0;
  var dragging = false, path = [], pathSet = {};

  var gridEl   = document.getElementById('strands-grid');
  var foundRow = document.getElementById('strands-found');
  var toastEl  = document.getElementById('strands-toast');
  var actsEl   = document.getElementById('strands-actions');
  var contBtn  = document.getElementById('strands-continue');
  var segEl    = document.getElementById('strands-hint-segments');
  var lblEl    = document.getElementById('strands-hint-label');
  var bannerEl = document.getElementById('strands-hint-banner');
  var hintTxt  = document.getElementById('strands-hint-text');
  var dismissEl= document.getElementById('strands-hint-dismiss');

  function buildHintBar() {
    segEl.innerHTML = '';
    for (var i = 0; i < 8; i++) {
      if (i === 3) { var d = document.createElement('span'); d.className = 'strands-hint-seg-divider'; segEl.appendChild(d); }
      var s = document.createElement('div'); s.className = 'strands-hint-seg'; s.id = 'hseg-' + i; segEl.appendChild(s);
    }
  }

  function updateHintBar() {
    var fill = Math.min(validCount, 8);
    for (var i = 0; i < 8; i++) { var s = document.getElementById('hseg-'+i); if (s) s.classList.toggle('filled', i < fill); }
    if (hintsGot >= HINTS.length) { lblEl.textContent = 'all hints unlocked \u2661'; return; }
    var rem = THRESH[hintsGot] - validCount;
    lblEl.textContent = rem > 0 ? rem + ' more word' + (rem===1?'':'s') + ' to earn a hint' : 'hint ready!';
  }

  function tryHint() {
    if (hintsGot >= HINTS.length) return;
    if (validCount >= THRESH[hintsGot]) { showHint(HINTS[hintsGot]); hintsGot++; }
    updateHintBar();
  }

  function showHint(msg) {
    hintTxt.textContent = msg; bannerEl.hidden = false;
    bannerEl.style.animation = 'none';
    requestAnimationFrame(function () { bannerEl.style.animation = ''; });
  }

  dismissEl.addEventListener('click',    function () { bannerEl.hidden = true; });
  dismissEl.addEventListener('touchend', function (e) { e.preventDefault(); bannerEl.hidden = true; });

  function buildGrid() {
    gridEl.innerHTML = ''; found = {}; colorIdx = 0; validCount = 0; hintsGot = 0;
    foundRow.innerHTML = ''; toastEl.hidden = true;
    actsEl.hidden = true; contBtn.hidden = true; bannerEl.hidden = true;
    buildHintBar(); updateHintBar();
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var el = document.createElement('div');
      el.className = 'st-cell'; el.dataset.r = r; el.dataset.c = c; el.id = 'sc-'+r+'-'+c;
      el.textContent = LETTERS[r][c]; gridEl.appendChild(el);
    }
  }

  function cell(r,c) { return document.getElementById('sc-'+r+'-'+c); }
  function adj(r1,c1,r2,c2) { return Math.abs(r1-r2)<=1&&Math.abs(c1-c2)<=1&&!(r1===r2&&c1===c2); }
  function fromPt(x,y) { var e=document.elementFromPoint(x,y); return e&&e.classList.contains('st-cell')?e:e&&e.parentElement&&e.parentElement.classList.contains('st-cell')?e.parentElement:null; }
  function isFnd(r,c) { var e=cell(r,c); return e&&(e.classList.contains('found-spangram')||e.dataset.wordColor!==undefined); }

  function hilite() {
    gridEl.querySelectorAll('.st-cell.selecting').forEach(function(e){e.classList.remove('selecting');});
    path.forEach(function(p){var e=cell(p.r,p.c);if(e&&!isFnd(p.r,p.c))e.classList.add('selecting');});
  }

  function startDrag(r,c) { if(isFnd(r,c))return; dragging=true; path=[{r:r,c:c}]; pathSet={}; pathSet[r+','+c]=true; hilite(); }

  function extDrag(r,c) {
    if(!dragging)return;
    var k=r+','+c;
    if(pathSet[k]){
      var idx=-1; for(var i=0;i<path.length;i++){if(path[i].r===r&&path[i].c===c){idx=i;break;}}
      if(idx!==-1&&idx<path.length-1){var rm=path.splice(idx+1);rm.forEach(function(p){delete pathSet[p.r+','+p.c];});hilite();}
      return;
    }
    var last=path[path.length-1];
    if(!adj(last.r,last.c,r,c)||isFnd(r,c))return;
    path.push({r:r,c:c}); pathSet[k]=true; hilite();
  }

  function endDrag() {
    if(!dragging)return; dragging=false;
    var p=path.slice(), word=p.map(function(x){return LETTERS[x.r][x.c];}).join('');
    gridEl.querySelectorAll('.st-cell.selecting').forEach(function(e){e.classList.remove('selecting');});
    path=[]; pathSet={};
    if(p.length<2)return;
    check(word,p);
  }

  var COMMON = (function(){
    var w='the,and,for,are,but,not,you,all,can,her,was,one,our,out,get,has,him,his,how,may,now,old,own,put,say,she,too,use,way,who,why,yet,age,ago,aid,aim,air,arm,art,ask,bag,ban,bar,bay,bed,big,bit,box,boy,bus,buy,car,cat,cop,cow,cry,cup,cut,dad,den,die,dig,dim,dip,dog,dot,dry,dug,duo,ear,eat,egg,ego,end,era,fan,far,fat,fee,few,fit,fix,fly,fog,foe,fry,fun,gap,gas,gel,gem,gin,god,got,gun,gut,gym,had,ham,hat,hay,hit,hop,hot,hub,hug,hum,ice,ill,ink,ion,ivy,jam,jar,jaw,joy,jug,key,kid,kit,law,lay,leg,lid,lip,lit,log,lot,mad,map,mat,mob,mom,mop,mud,mug,nap,net,nod,nor,oak,odd,off,oil,opt,orb,ore,owe,pad,pan,par,pat,pay,peg,pen,pet,pig,pin,pit,pod,pop,pot,pro,pub,pun,pup,rag,ram,rap,rat,raw,ray,rib,rid,rig,rim,rip,rob,rod,rot,row,rub,rug,rum,run,rut,sad,sag,sap,sat,saw,set,sew,shy,sin,sip,sir,sit,ski,sky,sob,son,sow,spa,spy,sue,sum,sun,tab,tan,tap,tar,tea,tie,tin,tip,toe,ton,top,tow,toy,try,tub,van,vat,vet,via,vie,vow,war,web,wed,woe,woo,yam,yap,yes,yip,zap,zip,zoo,able,acid,aged,also,arch,area,army,atom,aunt,away,babe,back,bake,bald,ball,band,bane,bare,bark,barn,base,bath,bead,beak,beam,bean,bear,beat,beef,beer,bell,belt,bend,best,bike,bill,bind,bird,bite,blow,blue,blur,boat,bold,bolt,bond,bone,book,boom,boot,bore,born,brow,bull,bump,burn,buzz,cake,call,calm,came,camp,card,care,cart,case,cash,cast,cave,cell,cent,chop,cite,city,clam,clap,clay,clip,club,clue,coal,coat,code,coil,cold,come,cook,cool,cord,core,corn,cost,crew,crop,crow,cube,cure,curl,dare,dark,dart,data,date,dawn,dead,deaf,deal,dean,dear,deck,deed,deep,deer,deny,desk,dial,dice,dirt,disc,dish,disk,dive,dome,door,dose,dove,down,draw,drip,drop,drum,dull,dump,dusk,dust,duty,each,earn,ease,east,easy,edge,emit,even,ever,evil,exam,fail,fair,fall,fame,farm,fast,fate,feat,feed,feel,fell,felt,file,fill,film,find,fire,firm,fish,fist,flag,flat,flaw,flea,flip,flow,foam,fond,font,food,fool,foot,form,fort,foul,four,free,fuel,full,fume,fund,fuse,fuzz,gain,gale,game,gang,gate,gave,gaze,gear,gill,give,glad,glow,glue,goal,goat,gone,good,gore,gown,grab,gram,gray,grew,grid,grim,grin,grip,grit,grow,gulf,gust,hail,hair,half,hall,halt,hand,hang,hard,hare,harm,heal,heap,hear,heat,heel,helm,help,hemp,herb,herd,here,hero,high,hill,hint,hire,hold,hole,holy,home,hook,hoop,hope,horn,hose,host,hour,hull,hunt,hurl,hurt,hymn,idea,idle,inch,iron,isle,itch,item,jail,jerk,jest,join,joke,jolt,junk,just,keen,keep,kill,kind,king,knee,knot,know,lack,laid,lake,lamp,land,lane,lark,lash,last,late,lead,leaf,leak,lean,leap,left,lend,lens,levy,lick,life,lift,like,lime,line,link,lion,list,live,load,loan,lock,loft,long,look,lord,lore,lose,loss,lost,loud,love,luck,lure,lush,lust,mace,made,mail,main,make,male,mane,mare,mark,mast,mate,maze,mead,meal,mean,meat,meet,melt,memo,menu,mesh,mess,mild,mill,mire,miss,mist,mode,mole,mood,moor,more,morn,most,moth,move,much,mule,must,mute,myth,nail,name,near,neck,need,next,nice,nine,norm,nose,note,null,numb,oath,obey,once,only,open,oral,oven,over,pace,pack,page,pain,pair,palm,park,part,pass,past,path,peak,peat,peel,peer,perk,pest,pick,pier,pile,pine,pipe,plan,play,plea,plot,plow,plug,plum,plus,poem,poet,polo,pond,pony,pool,pore,pork,port,pose,post,pray,prey,prod,prop,pull,pump,pure,push,quit,quiz,race,rage,raid,rail,rain,rake,ramp,rank,rare,rash,rate,rave,read,real,reap,rear,reed,reel,reef,rent,rest,rice,rich,ride,ring,riot,rise,risk,road,roar,robe,rock,role,roof,room,root,rope,rose,rout,rove,ruin,rule,rush,sage,sail,sake,salt,same,sand,seal,seem,seep,self,sell,send,sent,shed,shin,ship,shop,shot,show,sick,side,sigh,silk,silo,sing,sink,sire,skin,skip,slam,slap,slay,slim,slip,slot,slow,slug,slum,smug,snap,snow,soak,soap,sock,sofa,soil,sole,some,song,soon,sort,soul,soup,sour,spin,spit,spot,spur,stab,star,stay,stem,step,stew,stop,such,suit,sure,surf,swan,swap,swim,tale,talk,tall,tame,tank,task,team,tear,tell,temp,tend,tent,term,test,text,than,that,them,then,they,thin,this,thud,tide,tile,till,time,tiny,tire,toll,tomb,tone,torn,toss,tour,town,trap,tree,trim,trio,trip,true,tune,turf,turn,tusk,twin,type,ugly,undo,unit,upon,urge,used,user,vain,vale,veil,verb,very,vest,view,vine,void,wade,wage,wait,wake,walk,wall,wand,want,ward,warm,warn,warp,wart,wash,weak,weal,wean,wear,weed,week,well,went,were,west,what,when,whip,wide,wife,wild,will,wilt,wine,wing,wire,wise,with,wolf,wood,wool,word,wore,work,worm,worn,yell,your,zero';
    var o={}; w.split(',').forEach(function(x){o[x.toUpperCase()]=true;}); return o;
  })();

  function check(word, p) {
    var up = word.toUpperCase();
    if (found[up]) return;
    var match = null;
    ANSWERS.forEach(function (a) {
      if (a.word !== up) return;
      var ps = p.map(function(x){return x.r+','+x.c;}).sort().join('|');
      var as = a.path.map(function(x){return x[0]+','+x[1];}).sort().join('|');
      if (ps === as) match = a;
    });
    if (match) { onFound(match); return; }
    if (up.length >= 3 && ANS_WORDS.indexOf(up) === -1) {
      if (COMMON[up]) { onValid(p); return; }
      fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + up.toLowerCase())
        .then(function(r){if(r.ok)onValid(p);else flashWrong(p);})
        .catch(function(){onValid(p);});
    } else { flashWrong(p); }
  }

  function onValid(p) {
    validCount++; updateHintBar(); tryHint();
    flashWrong(p); showToast('\u2661 +1 hint progress');
  }

  function onFound(ans) {
    found[ans.word] = true;
    var ci = null;
    if (!ans.span) { ci = colorIdx; colorIdx++; }
    ans.path.forEach(function (rc, i) {
      (function (el, d) {
        setTimeout(function () {
          el.classList.remove('selecting');
          if (ans.span) el.classList.add('found-spangram'); else el.dataset.wordColor = ci;
          el.classList.add('pop');
          el.addEventListener('animationend', function(){el.classList.remove('pop');},{once:true});
        }, d);
      })(cell(rc[0],rc[1]), i*60);
    });
    setTimeout(function () {
      var chip = document.createElement('span');
      chip.className = 'strands-found-chip' + (ans.span?' spangram':'');
      if (!ans.span) { chip.style.background=COLORS[ci%COLORS.length]; chip.style.color=ci<=1?'#6a1a2a':'#fff'; }
      chip.textContent = ans.word[0]+ans.word.slice(1).toLowerCase();
      foundRow.appendChild(chip);
    }, ans.path.length*60+100);
    if (ANSWERS.every(function(a){return found[a.word];})) {
      setTimeout(function(){ showToast('bb found them all!! \u2661'); actsEl.hidden=false; contBtn.hidden=false; }, ans.path.length*60+400);
    }
  }

  function flashWrong(p) {
    p.forEach(function(x){var e=cell(x.r,x.c);if(!e)return;e.classList.add('wrong-flash');e.addEventListener('animationend',function(){e.classList.remove('wrong-flash');},{once:true});});
  }

  var tt=null;
  function showToast(msg){clearTimeout(tt);toastEl.textContent=msg;toastEl.hidden=false;tt=setTimeout(function(){toastEl.hidden=true;},2000);}

  gridEl.addEventListener('pointerdown',function(e){var c=fromPt(e.clientX,e.clientY);if(!c)return;e.preventDefault();gridEl.setPointerCapture(e.pointerId);startDrag(+c.dataset.r,+c.dataset.c);});
  gridEl.addEventListener('pointermove',function(e){if(!dragging)return;e.preventDefault();var c=fromPt(e.clientX,e.clientY);if(c)extDrag(+c.dataset.r,+c.dataset.c);});
  gridEl.addEventListener('pointerup',  function(e){e.preventDefault();endDrag();});
  gridEl.addEventListener('pointercancel',function(){dragging=false;path=[];pathSet={};gridEl.querySelectorAll('.st-cell.selecting').forEach(function(e){e.classList.remove('selecting');});});

  contBtn.addEventListener('click', function(){goToPage('page-9');});
  buildGrid();

  window.resetStrands = buildGrid;
})();

(function () {
  var CODE = '2705', entered = '', unlocked = false;

  var boxEl  = document.getElementById('lock-box');
  var numpad = document.getElementById('lock-numpad');
  var env5   = document.getElementById('lock-env-5');

  function syncDigits() {
    for (var i = 0; i < 4; i++) {
      var el = document.getElementById('ld-' + i);
      if (!el) continue;
      el.textContent = entered[i] != null ? entered[i] : '';
      el.classList.toggle('filled', entered[i] != null);
      el.classList.remove('correct','wrong');
    }
  }

  function flashDigs(cls) {
    for (var i = 0; i < 4; i++) {
      var el = document.getElementById('ld-' + i);
      if (!el) continue;
      el.classList.add(cls);
      el.addEventListener('animationend', function(){this.classList.remove('correct','wrong');},{once:true});
    }
  }

  numpad.addEventListener('click', function (e) {
    var k = e.target.closest('.lock-key');
    if (!k || unlocked) return;
    var d = k.dataset.digit;
    if (d === 'del') { if (entered.length) { entered = entered.slice(0,-1); syncDigits(); } return; }
    if (entered.length >= 4) return;
    entered += d; syncDigits();
    if (entered.length === 4) setTimeout(checkCode, 120);
  });

  document.addEventListener('keydown', function (e) {
    if (!document.getElementById('page-8').classList.contains('active') || unlocked) return;
    if (e.key >= '0' && e.key <= '9') {
      if (entered.length < 4) { entered += e.key; syncDigits(); }
      if (entered.length === 4) setTimeout(checkCode, 120);
    } else if (e.key === 'Backspace') {
      if (entered.length) { entered = entered.slice(0,-1); syncDigits(); }
    }
  });

  function checkCode() {
    if (entered === CODE) doCorrect(); else doWrong();
  }

  function doCorrect() {
    unlocked = true; flashDigs('correct');
    setTimeout(function(){boxEl.classList.add('open');}, 200);
    setTimeout(function(){
      unlockEnv5();
      openLetterModal('assets/letter-e.jpg', function() {
        goToPage('page-10');
      });
    }, 900);
  }

  function resetLock() {
    unlocked = false;
    entered  = '';
    syncDigits();
    boxEl.classList.remove('open');
    if (env5) {
      env5.disabled = true;
      env5.classList.add('lock-env-btn--locked');
      env5.classList.remove('unlocked');
      env5.setAttribute('aria-label','Letter 5 (locked)');
      var s = env5.querySelector('.lme-seal');
      if (s) { s.classList.add('lme-seal--lock'); s.textContent = '\uD83D\uDD12'; }
    }
  }

  function doWrong() {
    flashDigs('wrong');
    boxEl.classList.add('shake');
    boxEl.addEventListener('animationend',function(){boxEl.classList.remove('shake');},{once:true});
    setTimeout(function(){ entered=''; syncDigits(); }, 500);
  }

  function unlockEnv5() {
    if (!env5) return;
    env5.disabled = false;
    env5.classList.remove('lock-env-btn--locked');
    env5.classList.add('unlocked');
    env5.setAttribute('aria-label','Letter 5');
    var s = env5.querySelector('.lme-seal');
    if (s) { s.classList.remove('lme-seal--lock'); s.textContent = '\u2661'; }
  }

  document.querySelectorAll('.lock-env-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      var src = btn.dataset.src; if (!src) return;
      openLetterModal(src);
    });
    btn.addEventListener('touchend', function (e) {
      if (btn.disabled) return;
      e.preventDefault();
      var src = btn.dataset.src; if (!src) return;
      openLetterModal(src);
    });
  });

  syncDigits();

  window.resetLock = resetLock;
})();

(function () {
  var btn = document.getElementById('btn-play-again');
  if (!btn) return;
  btn.addEventListener('click', function () {
    if (typeof window.resetWordle      === 'function') window.resetWordle();
    if (typeof window.resetConnections === 'function') window.resetConnections();
    if (typeof window.resetStrands     === 'function') window.resetStrands();
    if (typeof window.resetLock        === 'function') window.resetLock();
    goToPage('page-1');
  });
  btn.addEventListener('touchstart', function () { btn.style.transform = 'scale(.96)'; }, { passive: true });
  btn.addEventListener('touchend',   function () { btn.style.transform = ''; },           { passive: true });
})();