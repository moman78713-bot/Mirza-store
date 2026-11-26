(function(){
'use strict';

/* الإعدادات تجي من ملف config.js (الرابط والمفتاح ورقم واتساب) */
var CONFIG = window.MIRZA || {};
var CUR = ' د.ع';
var PLAT = {ps5:'PS5', xbox:'Xbox', both:'PS5 · Xbox'};
var CAT_TITLE = {all:'كل المنتجات', 'new':'ألعاب جديدة', used:'ألعاب مستعملة', controller:'جويستكات', console:'كونسولات', headset:'سماعات'};
var STATUS = {'new':'جديد', confirmed:'مؤكد', delivered:'تم التوصيل', cancelled:'ملغي'};
var KEYS = {cart:'mirza-cart', pend:'mirza-pending-profile'};

var ICON_USER = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>';
var ICON_PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var ICON_GEAR = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>';

var $ = function(id){ return document.getElementById(id); };
function el(tag, cls, text){
  var n = document.createElement(tag);
  if(cls) n.className = cls;
  if(text != null) n.textContent = text;
  return n;
}
function readJSON(k, def){ try{ var r = localStorage.getItem(k); return r ? JSON.parse(r) : def; }catch(e){ return def; } }
function writeJSON(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function removeKey(k){ try{ localStorage.removeItem(k); }catch(e){} }
function fixDigits(s){ return String(s).replace(/[٠-٩]/g, function(d){ return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }); }
function money(n){ return Number(n).toLocaleString('en-US') + CUR; }
function toast(msg){
  var t = el('div', 'toast', msg);
  t.setAttribute('role', 'status');
  document.body.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 2600);
}
function setMsg(id, text, ok){
  var n = $(id);
  n.textContent = text || '';
  n.classList.toggle('okmsg', !!ok);
}
function friendly(e){
  var m = String((e && e.message) || '').toLowerCase();
  if(m.indexOf('invalid login') !== -1) return 'الإيميل أو كلمة السر غلط.';
  if(m.indexOf('already registered') !== -1 || m.indexOf('already been registered') !== -1) return 'هذا الإيميل مسجل من قبل. سجّل دخول.';
  if(m.indexOf('not confirmed') !== -1) return 'لازم تأكد إيميلك أول. افتح رسالة التأكيد بإيميلك.';
  if(m.indexOf('rate limit') !== -1 || m.indexOf('too many') !== -1 || (e && e.status === 429)) return 'محاولات كثيرة. استنى شوي وجرب مرة ثانية.';
  if(m.indexOf('password') !== -1 && m.indexOf('6') !== -1) return 'كلمة السر لازم 6 أحرف أو أكثر.';
  if(m.indexOf('out of stock') !== -1) return 'واحد من المنتجات خلص أو العدد المتوفر أقل من المطلوب. حدّثنا السلة.';
  if(m.indexOf('failed to fetch') !== -1 || m.indexOf('network') !== -1) return 'ما كدرنا نتصل. تأكد من النت.';
  return 'صار خطأ. جرب مرة ثانية.';
}

var sb = null;
var S = {
  products:[], byId:{}, plat:'all', cat:'all', q:'', cart:loadCart(),
  settings:{}, uid:null, email:'', profile:null, isAdmin:false, orders:[],
  loaded:false, busy:false, authMode:'login', lastLoad:0, doneText:''
};

function loadCart(){
  var raw = readJSON(KEYS.cart, {}), out = {};
  Object.keys(raw || {}).forEach(function(k){
    var n = parseInt(raw[k], 10);
    if(n > 0) out[k] = Math.min(n, 20);
  });
  return out;
}
function saveCart(){ writeJSON(KEYS.cart, S.cart); }

function setProducts(rows){
  S.products = (rows || []).map(function(r){
    return {id:r.id, t:r.name, p:r.platform, c:r.category, g:r.genre || '', img:r.image_url || '', price:r.price, stock:r.stock, feat:!!r.featured, sort:r.sort};
  });
  S.byId = {};
  S.products.forEach(function(p){ S.byId[p.id] = p; });
  var changed = false;
  Object.keys(S.cart).forEach(function(id){
    var p = S.byId[id];
    var n = p ? Math.min(S.cart[id], p.stock) : 0;
    if(n !== S.cart[id]){
      changed = true;
      if(n > 0) S.cart[id] = n; else delete S.cart[id];
    }
  });
  if(changed) saveCart();
  S.loaded = true;
}
function count(){ var c = 0; Object.keys(S.cart).forEach(function(k){ if(S.byId[k]) c += S.cart[k]; }); return c; }
function total(){ var t = 0; Object.keys(S.cart).forEach(function(k){ if(S.byId[k]) t += S.cart[k] * S.byId[k].price; }); return t; }
function hash(p){ var s = 0, k = p.t + p.c; for(var i = 0; i < k.length; i++) s += k.charCodeAt(i) * (i + 1); return s; }
function hue(p){ return ({ps5:212, xbox:128, both:36})[p.p] + (hash(p) % 36); }
function platLabel(p){ return PLAT[p.p] + (p.c === 'used' ? ' - مستعملة' : ''); }
function stockInfo(p){
  if(p.stock <= 0) return ['نفد', 'out'];
  if(p.stock === 1) return ['آخر قطعة', 'low'];
  if(p.stock <= 3) return ['باقي ' + p.stock, 'low'];
  return ['متوفر: ' + p.stock, ''];
}
function intlPhone(p){
  var d = String(p || '').replace(/\D/g, '');
  if(d.indexOf('964') === 0) return d;
  if(d.charAt(0) === '0') return '964' + d.slice(1);
  return d;
}

/* ---------- البطاقات ---------- */
function buildCard(p){
  var inCart = S.cart[p.id] || 0;
  var art = el('article', 'item' + (p.stock <= 0 ? ' sold' : ''));
  art.setAttribute('aria-label', p.t + ' - ' + platLabel(p));

  var cover = el('div', 'art pat' + (hash(p) % 3));
  cover.style.setProperty('--h', hue(p));
  cover.setAttribute('data-l', p.t.charAt(0).toUpperCase());
  if(p.img){
    cover.classList.add('has');
    var pic = document.createElement('img');
    pic.className = 'pic'; pic.alt = ''; pic.loading = 'lazy'; pic.src = p.img;
    pic.addEventListener('error', function(){ cover.classList.remove('has'); if(pic.parentNode) pic.parentNode.removeChild(pic); });
    cover.appendChild(pic);
  }
  cover.appendChild(el('span', 'plat', PLAT[p.p]));
  if(inCart) cover.appendChild(el('span', 'qbadge', inCart));
  var name = el('span', 'name', p.t);
  name.setAttribute('dir', 'auto');
  cover.appendChild(name);

  var info = el('div', 'info');
  var top = el('div');
  var g = el('div', 'genre', p.g);
  if(p.c === 'used') g.appendChild(el('span', 'tag', 'مستعملة'));
  top.appendChild(g);
  var pr = el('div', 'price', Number(p.price).toLocaleString('en-US') + ' ');
  pr.appendChild(el('small', null, 'د.ع'));
  top.appendChild(pr);
  var si = stockInfo(p);
  top.appendChild(el('div', 'stock ' + si[1], si[0]));

  var add = el('button', 'add');
  add.type = 'button';
  if(p.stock <= 0){
    add.disabled = true;
    add.textContent = 'نفد';
  } else if(inCart >= p.stock){
    add.disabled = true;
    add.textContent = 'كل المتوفر بالسلة';
  } else {
    add.innerHTML = ICON_PLUS + '<span></span>';
    add.lastChild.textContent = inCart ? 'زيد واحدة' : 'أضف للسلة';
    add.addEventListener('click', function(){ change(p.id, 1); });
  }
  info.appendChild(top);
  info.appendChild(add);
  art.appendChild(cover);
  art.appendChild(info);
  return art;
}
function matchesBase(p){
  if(S.cat !== 'all' && p.c !== S.cat) return false;
  var q = S.q.trim().toLowerCase();
  return !q || p.t.toLowerCase().indexOf(q) !== -1 || p.g.indexOf(q) !== -1;
}
function onPlat(p, plat){ return p.p === plat || p.p === 'both'; }

function renderGrid(){
  $('loading').hidden = S.loaded;
  var base = S.products.filter(matchesBase);
  var list = base.filter(function(p){ return S.plat === 'all' || onPlat(p, S.plat); });
  var order = {};
  S.products.forEach(function(p, i){ order[p.id] = i; });
  list.sort(function(a, b){
    var d = (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0);
    return d || order[a.id] - order[b.id];
  });
  var grid = $('grid');
  grid.textContent = '';
  list.forEach(function(p){ grid.appendChild(buildCard(p)); });
  $('empty').hidden = !S.loaded || list.length > 0;
  var q = S.q.trim();
  $('gridTitle').textContent = q ? 'نتائج البحث' : CAT_TITLE[S.cat] + (S.plat !== 'all' ? ' · ' + PLAT[S.plat] : '');

  var showFeat = S.loaded && S.plat === 'all' && S.cat === 'all' && !q;
  var feat = $('feat');
  feat.textContent = '';
  if(showFeat) S.products.filter(function(p){ return p.feat && p.stock > 0; }).forEach(function(p){ feat.appendChild(buildCard(p)); });
  $('featWrap').hidden = !showFeat || !feat.firstChild;

  $('tcAll').textContent = base.length;
  $('tcPs').textContent = base.filter(function(p){ return onPlat(p, 'ps5'); }).length;
  $('tcXb').textContent = base.filter(function(p){ return onPlat(p, 'xbox'); }).length;
}
function renderHeader(){
  var b = $('accBtn');
  if(S.uid){
    var nm = (S.profile && S.profile.name) || S.email || '?';
    b.classList.add('on');
    b.textContent = nm.trim().charAt(0).toUpperCase();
    b.setAttribute('aria-label', 'حسابي');
    $('hello').textContent = S.profile
      ? 'أهلاً ' + S.profile.name.trim().split(/\s+/)[0] + '، شنو تحتاج اليوم؟'
      : 'أهلاً بيك. كمّل بياناتك من حسابك حتى تكدر تطلب.';
  } else {
    b.classList.remove('on');
    b.innerHTML = ICON_USER;
    b.setAttribute('aria-label', 'دخول / حساب جديد');
    $('hello').textContent = S.settings.hero_sub || 'سجّل حسابك واطلب بسهولة.';
  }
  $('admBtn').hidden = !S.isAdmin;
}
function updateAll(){
  renderHeader(); renderGrid(); renderBar();
  if(!$('sheet').hidden) renderSheet();
}

/* ---------- إعدادات المتجر ---------- */
function applySettings(){
  var st = S.settings;
  if(st.hero_title) $('heroTitle').textContent = st.hero_title;
  var a = $('announce');
  a.textContent = st.announce || '';
  a.hidden = !st.announce;
  var root = document.documentElement;
  if(/^#[0-9a-fA-F]{6}$/.test(st.accent || '')) root.style.setProperty('--accent', st.accent);
  else root.style.removeProperty('--accent');
  renderHeader();
}
function loadSettings(){
  return Promise.resolve(sb.from('settings').select('*')).then(function(r){
    if(r.error || !r.data) return;
    var m = {};
    r.data.forEach(function(x){ m[x.key] = x.value; });
    S.settings = m;
    applySettings();
  }, function(){});
}

/* ---------- تحميل المنتجات ---------- */
function showBanner(msg, retry){
  var b = $('status');
  b.textContent = '';
  b.appendChild(el('p', null, msg));
  if(retry){
    var r = el('button', 'btn ghost', 'إعادة المحاولة');
    r.type = 'button';
    r.addEventListener('click', loadProducts);
    b.appendChild(r);
  }
  b.hidden = false;
  $('loading').hidden = true;
}
function loadProducts(){
  return Promise.resolve(sb.from('products').select('*').order('sort', {ascending:true})).then(function(r){
    if(r.error){ showBanner('ما كدرنا نحمّل المنتجات. تأكد من النت.', true); return; }
    $('status').hidden = true;
    setProducts(r.data);
    S.lastLoad = Date.now();
    updateAll();
  }, function(){ showBanner('ما كدرنا نحمّل المنتجات. تأكد من النت.', true); });
}

/* ---------- السلة ---------- */
function change(id, d){
  var p = S.byId[id];
  if(!p) return;
  var n = Math.min((S.cart[id] || 0) + d, p.stock, 20);
  if(n <= 0) delete S.cart[id]; else S.cart[id] = n;
  saveCart();
  updateAll();
}
function renderBar(){
  var c = count();
  $('cartbar').hidden = c === 0;
  $('barCount').textContent = c + (c === 1 ? ' قطعة' : ' قطع');
  $('barTotal').textContent = money(total());
  if(c === 0 && !$('sheet').hidden) closeSheet();
}
function renderDelivery(){
  var box = $('delivery');
  box.textContent = '';
  if(!S.uid){
    box.appendChild(el('b', null, 'بيانات التوصيل'));
    box.appendChild(el('div', 'row', 'سجّل دخول أو أنشئ حساب حتى نعرف وين نوصل طلبك.'));
    var make = el('button', 'btn primary', 'دخول / حساب جديد');
    make.type = 'button';
    make.addEventListener('click', openAccount);
    box.appendChild(make);
    return;
  }
  if(!S.profile){
    box.appendChild(el('b', null, 'كمّل بياناتك'));
    box.appendChild(el('div', 'row', 'نحتاج الاسم والهاتف والعنوان للتوصيل.'));
    var fill = el('button', 'btn primary', 'كمّل البيانات');
    fill.type = 'button';
    fill.addEventListener('click', openAccount);
    box.appendChild(fill);
    return;
  }
  var a = S.profile;
  box.appendChild(el('b', null, 'التوصيل إلى'));
  box.appendChild(el('div', 'row ink', a.name + ' · ' + a.phone));
  box.appendChild(el('div', 'row ink', a.address));
  if(a.landmark) box.appendChild(el('div', 'row', 'قرب: ' + a.landmark));
  if(a.map_url) box.appendChild(el('div', 'row', 'رابط الموقع مرفق بالطلب'));
  var edit = el('button', 'link', 'تعديل بياناتي');
  edit.type = 'button';
  edit.addEventListener('click', openAccount);
  box.appendChild(edit);
}
function renderSheet(){
  var box = $('lines');
  box.textContent = '';
  var ids = Object.keys(S.cart).filter(function(id){ return S.byId[id]; });
  if(!ids.length) box.appendChild(el('p', 'emptycart', 'السلة فاضية.'));
  ids.forEach(function(id){
    var p = S.byId[id], n = S.cart[id];
    var row = el('div', 'line');
    var left = el('div');
    var t = el('div', 't', p.t);
    t.setAttribute('dir', 'auto');
    left.appendChild(t);
    left.appendChild(el('div', 's', platLabel(p) + ' · ' + money(p.price)));
    var lp = el('div', 'lp', money(p.price * n));
    var q = el('div', 'qty');
    var minus = el('button', null, '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', 'أنقص ' + p.t);
    minus.addEventListener('click', function(){ change(id, -1); });
    var plus = el('button', null, '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', 'زد ' + p.t);
    plus.disabled = n >= p.stock;
    plus.addEventListener('click', function(){ change(id, 1); });
    q.appendChild(minus); q.appendChild(el('b', null, n)); q.appendChild(plus);
    row.appendChild(left); row.appendChild(lp); row.appendChild(q);
    box.appendChild(row);
  });
  $('total').textContent = money(total());
  $('orderBtn').disabled = S.busy;
  renderDelivery();
}
function openSheet(){ $('err').textContent = ''; renderSheet(); $('sheet').hidden = false; $('closeCart').focus(); }
function closeSheet(){ $('sheet').hidden = true; $('err').textContent = ''; }

/* ---------- الطلب ---------- */
function setBusy(b){
  S.busy = b;
  $('orderBtn').disabled = b;
  $('orderBtn').textContent = b ? 'جاري تسجيل الطلب...' : 'أكّد الطلب';
}
function orderText(o){
  var a = S.profile || {};
  var L = ['طلب جديد من Mirza Games #' + o.id];
  L.push('الاسم: ' + (a.name || ''));
  L.push('الهاتف: ' + (a.phone || ''));
  L.push('العنوان: ' + (a.address || ''));
  if(a.landmark) L.push('نقطة دالة: ' + a.landmark);
  if(a.map_url) L.push('الموقع: ' + a.map_url);
  L.push('');
  (o.items || []).forEach(function(i){
    L.push('- ' + i.name + ' (' + PLAT[i.platform] + (i.category === 'used' ? ' - مستعملة' : '') + ') × ' + i.qty + ' = ' + money(i.price * i.qty));
  });
  L.push('');
  L.push('المجموع: ' + money(o.total));
  return L.join('\n');
}
function showDone(o){
  S.doneText = orderText(o);
  $('doneInfo').textContent = 'رقم طلبك #' + o.id + ' والمجموع ' + money(o.total) + '. اضغط الزر تحت حتى توصلنا التفاصيل على واتساب ونأكد معاك التوصيل.';
  var num = intlPhone(S.settings.wa || CONFIG.wa || '');
  $('doneWa').href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(S.doneText);
  $('doneNote').textContent = '';
  $('doneSheet').hidden = false;
  $('doneWa').focus();
}
function placeOrder(){
  if(S.busy) return;
  if(!count()){ $('err').textContent = 'السلة فاضية.'; return; }
  if(!S.uid){ $('err').textContent = 'سجّل دخول أول حتى نعرف وين نوصل.'; openAccount(); return; }
  if(!S.profile){ $('err').textContent = 'كمّل بياناتك أول (الاسم والهاتف والعنوان).'; openAccount(); return; }
  $('err').textContent = '';
  setBusy(true);
  var cart = Object.keys(S.cart).filter(function(id){ return S.byId[id]; }).map(function(id){ return {id:id, qty:S.cart[id]}; });
  Promise.resolve(sb.rpc('place_order', {cart:cart})).then(function(r){
    if(r.error){
      setBusy(false);
      $('err').textContent = friendly(r.error);
      loadProducts();
      return;
    }
    var id = r.data;
    return Promise.resolve(sb.from('orders').select('*').eq('id', id).single()).then(function(o){
      setBusy(false);
      S.cart = {}; saveCart();
      closeSheet();
      loadProducts(); loadOrders();
      showDone(o && o.data ? o.data : {id:id, items:[], total:0});
      updateAll();
    });
  }).catch(function(){
    setBusy(false);
    $('err').textContent = 'ما كدرنا نسجل الطلب. تأكد من النت وجرب مرة ثانية.';
  });
}
function copyText(text, noteId){
  function fallback(){ setMsg(noteId, 'ما كدرنا ننسخ تلقائياً. اضغط على الزر الأخضر وارسل من واتساب.'); }
  try{
    navigator.clipboard.writeText(text).then(function(){ setMsg(noteId, 'تم نسخ الطلب.', true); }, fallback);
  }catch(e){ fallback(); }
}

/* ---------- الحساب ---------- */
function readProfile(prefix){
  var g = function(k){ return $(prefix + k).value.trim(); };
  var d = {name:g('Name'), phone:fixDigits(g('Phone')).replace(/[\s\-()]/g, ''), address:g('Addr'), landmark:g('Land'), map_url:g('Map')};
  var digits = d.phone.replace(/\D/g, '');
  var bad = null;
  if(d.name.length < 2) bad = ['اكتب اسمك.', prefix + 'Name'];
  else if(digits.length < 10 || digits.length > 15) bad = ['رقم الهاتف غير صحيح. مثال: 07701234567', prefix + 'Phone'];
  else if(!d.address) bad = ['اكتب منطقتك أو عنوانك.', prefix + 'Addr'];
  else if(d.map_url && !/^https?:\/\//i.test(d.map_url)) bad = ['رابط الموقع لازم يبدأ بـ https', prefix + 'Map'];
  if(bad) return {bad:bad};
  d.landmark = d.landmark || null;
  d.map_url = d.map_url || null;
  return {data:d};
}
function setAuthMode(mode){
  S.authMode = mode;
  $('segLogin').setAttribute('aria-pressed', mode === 'login' ? 'true' : 'false');
  $('segSignup').setAttribute('aria-pressed', mode === 'signup' ? 'true' : 'false');
  $('signupFields').hidden = mode !== 'signup';
  $('authGo').textContent = mode === 'signup' ? 'إنشاء الحساب' : 'دخول';
  $('aPass').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
  setMsg('authErr', '');
}
function renderMyOrders(){
  var box = $('myOrders');
  box.textContent = '';
  if(!S.orders.length){ box.hidden = true; return; }
  box.hidden = false;
  box.appendChild(el('h4', null, 'طلباتي'));
  S.orders.forEach(function(o){
    var r = el('div', 'ord');
    r.appendChild(el('div', 'd', '#' + o.id + ' · ' + new Date(o.created_at).toLocaleDateString('en-GB') + ' · ' + (STATUS[o.status] || o.status)));
    r.appendChild(el('div', 'it', (o.items || []).map(function(i){ return i.name + ' ×' + i.qty; }).join('، ')));
    r.appendChild(el('div', 'tt', money(o.total)));
    box.appendChild(r);
  });
}
function renderAccount(){
  var loggedIn = !!S.uid;
  $('authView').hidden = loggedIn;
  $('profView').hidden = !loggedIn;
  $('accTitle').textContent = loggedIn ? 'حسابي' : 'دخول / حساب جديد';
  if(loggedIn){
    var p = S.profile || {};
    $('whoami').textContent = S.email;
    $('pName').value = p.name || '';
    $('pPhone').value = p.phone || '';
    $('pAddr').value = p.address || '';
    $('pLand').value = p.landmark || '';
    $('pMap').value = p.map_url || '';
    renderMyOrders();
  }
}
function openAccount(){
  closeSheet();
  setMsg('authErr', ''); setMsg('profErr', '');
  renderAccount();
  $('accSheet').hidden = false;
  $('closeAcc').focus();
  if(S.uid) loadOrders();
}
function closeAccount(){ $('accSheet').hidden = true; }

function loadOrders(){
  if(!S.uid) return Promise.resolve();
  var uid = S.uid;
  return Promise.resolve(sb.from('orders').select('*').eq('user_id', uid).order('created_at', {ascending:false}).limit(20)).then(function(r){
    if(uid !== S.uid || r.error) return;
    S.orders = r.data || [];
    renderMyOrders();
  });
}
function loadProfile(){
  var uid = S.uid;
  return Promise.resolve(sb.from('profiles').select('*').eq('id', uid).maybeSingle()).then(function(r){
    if(uid !== S.uid) return;
    if(r.data){ S.profile = r.data; return; }
    var pend = readJSON(KEYS.pend, null);
    if(pend && pend.profile && pend.email === String(S.email).toLowerCase()){
      var row = Object.assign({id:uid}, pend.profile);
      return Promise.resolve(sb.from('profiles').upsert(row).select().single()).then(function(u){
        if(uid === S.uid && !u.error && u.data){ S.profile = u.data; removeKey(KEYS.pend); }
      });
    }
  });
}
function checkAdmin(){
  var uid = S.uid;
  return Promise.resolve(sb.rpc('is_admin')).then(function(r){
    if(uid !== S.uid) return;
    S.isAdmin = !r.error && r.data === true;
    renderHeader();
  });
}
function handleSession(session){
  var uid = session && session.user ? session.user.id : null;
  if(uid === S.uid) return;
  S.uid = uid;
  S.email = uid ? (session.user.email || '') : '';
  S.profile = null; S.isAdmin = false; S.orders = [];
  updateAll();
  if(!uid){
    renderAccount();
    return;
  }
  loadProfile().then(function(){ updateAll(); renderAccount(); });
  checkAdmin();
  loadOrders();
}
function submitAuth(e){
  e.preventDefault();
  if(S.busy) return;
  var email = $('aEmail').value.trim(), pass = $('aPass').value;
  function bad(msg, id){ setMsg('authErr', msg); $(id).focus(); }
  if(!/^\S+@\S+\.\S+$/.test(email)) return bad('اكتب إيميل صحيح.', 'aEmail');
  if(pass.length < 6) return bad('كلمة السر لازم 6 أحرف أو أكثر.', 'aPass');
  setMsg('authErr', '');
  if(S.authMode === 'login'){
    S.busy = true; $('authGo').disabled = true;
    Promise.resolve(sb.auth.signInWithPassword({email:email, password:pass})).then(function(r){
      S.busy = false; $('authGo').disabled = false;
      if(r.error){ setMsg('authErr', friendly(r.error)); return; }
      $('aPass').value = '';
      closeAccount();
      toast('أهلاً بيك');
    }).catch(function(){ S.busy = false; $('authGo').disabled = false; setMsg('authErr', friendly(null)); });
    return;
  }
  var pr = readProfile('s');
  if(pr.bad) return bad(pr.bad[0], pr.bad[1]);
  writeJSON(KEYS.pend, {email:email.toLowerCase(), profile:pr.data});
  S.busy = true; $('authGo').disabled = true;
  Promise.resolve(sb.auth.signUp({email:email, password:pass})).then(function(r){
    S.busy = false; $('authGo').disabled = false;
    if(r.error){ removeKey(KEYS.pend); setMsg('authErr', friendly(r.error)); return; }
    var u = r.data && r.data.user;
    if(u && u.identities && u.identities.length === 0){
      removeKey(KEYS.pend);
      setMsg('authErr', 'هذا الإيميل مسجل من قبل. سجّل دخول.');
      return;
    }
    $('aPass').value = '';
    if(r.data && r.data.session){
      closeAccount();
      toast('تم إنشاء حسابك');
    } else {
      setAuthMode('login');
      setMsg('authErr', 'تم إنشاء الحساب. افتح رسالة التأكيد بإيميلك واضغط الرابط، وبعدها سجّل دخول.', true);
    }
  }).catch(function(){ S.busy = false; $('authGo').disabled = false; setMsg('authErr', friendly(null)); });
}
function saveProfile(e){
  e.preventDefault();
  if(S.busy || !S.uid) return;
  var pr = readProfile('p');
  if(pr.bad){ setMsg('profErr', pr.bad[0]); $(pr.bad[1]).focus(); return; }
  setMsg('profErr', '');
  S.busy = true; $('profSave').disabled = true;
  var row = Object.assign({id:S.uid}, pr.data);
  Promise.resolve(sb.from('profiles').upsert(row).select().single()).then(function(r){
    S.busy = false; $('profSave').disabled = false;
    if(r.error || !r.data){ setMsg('profErr', friendly(r.error)); return; }
    S.profile = r.data;
    updateAll();
    setMsg('profErr', 'انحفظت بياناتك.', true);
  }).catch(function(){ S.busy = false; $('profSave').disabled = false; setMsg('profErr', friendly(null)); });
}

/* ---------- لوحة المالك ---------- */
var adm = {tab:'orders', edits:{}, orders:[], cust:{}, saving:false};

function parseField(s){
  var t = fixDigits(s).replace(/[,\s٬،]/g, '');
  return /^\d{1,9}$/.test(t) ? parseInt(t, 10) : null;
}
var PANES = {orders:'admOrders', price:'admPrices', prods:'admProds', edit:'admEdit', set:'admSet'};
var TABS = {orders:'tabOrd', price:'tabPrice', prods:'tabProd', edit:'tabProd', set:'tabSet'};
function setAdmTab(t){
  adm.tab = t;
  Object.keys(PANES).forEach(function(k){ $(PANES[k]).hidden = k !== t; });
  ['tabOrd', 'tabPrice', 'tabProd', 'tabSet'].forEach(function(id){ $(id).setAttribute('aria-pressed', TABS[t] === id ? 'true' : 'false'); });
  if(t === 'orders') loadAdminOrders();
  if(t === 'price'){ $('admQ').value = ''; adm.edits = {}; setMsg('admErr', ''); setMsg('admNote', ''); renderAdmPrices(); }
  if(t === 'prods'){ $('prodQ').value = ''; renderProdList(); }
  if(t === 'set') fillSettings();
}
function openAdmin(){
  if(!S.isAdmin) return;
  setAdmTab('orders');
  $('admSheet').hidden = false;
  $('closeAdm').focus();
}
function closeAdmin(){ $('admSheet').hidden = true; }

function loadAdminOrders(){
  var box = $('admOrders');
  box.textContent = '';
  box.appendChild(el('p', 'cnote', 'جاري تحميل الطلبات...'));
  Promise.resolve(sb.from('orders').select('*').order('created_at', {ascending:false}).limit(50)).then(function(r){
    if(r.error){ box.textContent = ''; box.appendChild(el('p', 'err', 'ما كدرنا نحمّل الطلبات.')); return; }
    adm.orders = r.data || [];
    var ids = [];
    adm.orders.forEach(function(o){ if(ids.indexOf(o.user_id) === -1) ids.push(o.user_id); });
    if(!ids.length){ adm.cust = {}; renderAdmOrders(); return; }
    return Promise.resolve(sb.from('profiles').select('*').in('id', ids)).then(function(pr){
      adm.cust = {};
      (pr.data || []).forEach(function(c){ adm.cust[c.id] = c; });
      renderAdmOrders();
    });
  }).catch(function(){ box.textContent = ''; box.appendChild(el('p', 'err', 'ما كدرنا نحمّل الطلبات.')); });
}
function renderAdmOrders(){
  var box = $('admOrders');
  box.textContent = '';
  if(!adm.orders.length){ box.appendChild(el('p', 'cnote', 'ما أكو طلبات لحد الآن.')); return; }
  var newCount = adm.orders.filter(function(o){ return o.status === 'new'; }).length;
  box.appendChild(el('p', 'cnote', adm.orders.length + ' طلب، منها ' + newCount + ' جديد'));
  adm.orders.forEach(function(o){
    var c = adm.cust[o.user_id] || {};
    var card = el('div', 'oc');
    var top = el('div', 'top');
    top.appendChild(el('b', null, '#' + o.id + ' · ' + (c.name || 'زبون')));
    top.appendChild(el('span', 'st ' + o.status, STATUS[o.status] || o.status));
    card.appendChild(top);
    card.appendChild(el('div', 'm', new Date(o.created_at).toLocaleString('en-GB')));
    if(c.phone){
      var ph = el('div', 'm');
      ph.appendChild(document.createTextNode(c.phone + ' · '));
      var wa = el('a', null, 'راسله على واتساب');
      wa.href = 'https://wa.me/' + intlPhone(c.phone);
      wa.target = '_blank'; wa.rel = 'noopener';
      ph.appendChild(wa);
      card.appendChild(ph);
    }
    if(c.address) card.appendChild(el('div', 'm', c.address + (c.landmark ? ' · قرب: ' + c.landmark : '')));
    if(c.map_url && /^https?:\/\//i.test(c.map_url)){
      var mp = el('div', 'm');
      var ma = el('a', null, 'افتح الموقع على الخريطة');
      ma.href = c.map_url; ma.target = '_blank'; ma.rel = 'noopener';
      mp.appendChild(ma);
      card.appendChild(mp);
    }
    (o.items || []).forEach(function(i){
      var line = el('div', null, i.name + ' (' + PLAT[i.platform] + (i.category === 'used' ? ' - مستعملة' : '') + ') × ' + i.qty);
      line.setAttribute('dir', 'auto');
      card.appendChild(line);
    });
    card.appendChild(el('div', 'tt', money(o.total)));
    var sel = el('select');
    sel.setAttribute('aria-label', 'حالة الطلب ' + o.id);
    Object.keys(STATUS).forEach(function(k){
      var op = el('option', null, STATUS[k]);
      op.value = k;
      if(k === o.status) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', function(){
      var v = sel.value;
      sel.disabled = true;
      Promise.resolve(sb.from('orders').update({status:v}).eq('id', o.id).select()).then(function(r){
        sel.disabled = false;
        if(r.error || !r.data || !r.data.length){ toast('ما انحفظت الحالة'); loadAdminOrders(); return; }
        o.status = v;
        toast('انحفظت الحالة');
        renderAdmOrders();
      }).catch(function(){ sel.disabled = false; toast('ما انحفظت الحالة'); loadAdminOrders(); });
    });
    card.appendChild(sel);
    box.appendChild(card);
  });
}

function isEdited(p){
  var e = adm.edits[p.id];
  if(!e) return false;
  return parseField(e.price) !== p.price || parseField(e.stock) !== p.stock;
}
function updateAdmCount(){
  var n = S.products.filter(isEdited).length;
  $('admCount').textContent = n ? n + ' منتج معدّل ولسه ما انحفظ' : 'ما أكو تعديلات';
  $('admSave').disabled = n === 0 || adm.saving;
}
function admField(p, key, label, val){
  var w = el('div', 'field');
  var id = 'a' + key.charAt(0) + '-' + p.id;
  var l = el('label', null, label);
  l.setAttribute('for', id);
  var i = el('input');
  i.id = id; i.type = 'text'; i.value = val; i.autocomplete = 'off';
  i.setAttribute('inputmode', 'numeric');
  i.addEventListener('input', function(){
    var cur = adm.edits[p.id] || {price:String(p.price), stock:String(p.stock)};
    cur[key] = i.value;
    adm.edits[p.id] = cur;
    i.closest('.devrow').classList.toggle('changed', isEdited(p));
    setMsg('admErr', ''); setMsg('admNote', '');
    updateAdmCount();
  });
  w.appendChild(l); w.appendChild(i);
  return w;
}
function admRow(p){
  var e = adm.edits[p.id] || {};
  var row = el('div', 'devrow');
  var head = el('div', 'devhead');
  var t = el('span', 'devname', p.t);
  t.setAttribute('dir', 'auto');
  head.appendChild(t);
  head.appendChild(el('span', 'devsub', platLabel(p)));
  row.appendChild(head);
  var f = el('div', 'devfields');
  f.appendChild(admField(p, 'price', 'السعر (د.ع)', e.price != null ? e.price : String(p.price)));
  f.appendChild(admField(p, 'stock', 'العدد المتوفر', e.stock != null ? e.stock : String(p.stock)));
  row.appendChild(f);
  row.classList.toggle('changed', isEdited(p));
  return row;
}
function renderAdmPrices(){
  var q = $('admQ').value.trim().toLowerCase();
  var box = $('admList');
  box.textContent = '';
  ['new', 'used', 'controller', 'console', 'headset'].forEach(function(c){
    var items = S.products.filter(function(p){ return p.c === c && (!q || p.t.toLowerCase().indexOf(q) !== -1); });
    if(!items.length) return;
    box.appendChild(el('h4', 'devcat', CAT_TITLE[c]));
    items.forEach(function(p){ box.appendChild(admRow(p)); });
  });
  updateAdmCount();
}
function saveAdmPrices(){
  if(adm.saving) return;
  var ups = [], bad = null;
  S.products.forEach(function(p){
    if(bad) return;
    var e = adm.edits[p.id];
    if(!e) return;
    var price = parseField(e.price), stock = parseField(e.stock);
    if(price === null || price > 99999999){ bad = {p:p, f:'ap-'}; return; }
    if(stock === null || stock > 999){ bad = {p:p, f:'as-'}; return; }
    if(price !== p.price || stock !== p.stock) ups.push({id:p.id, price:price, stock:stock});
  });
  if(bad){
    $('admQ').value = '';
    renderAdmPrices();
    setMsg('admErr', 'القيمة غلط عند: ' + bad.p.t + '. اكتب أرقام بس (العدد لحد 999).');
    var fld = $(bad.f + bad.p.id);
    if(fld) fld.focus();
    return;
  }
  if(!ups.length) return;
  adm.saving = true;
  updateAdmCount();
  $('admSave').textContent = 'جاري الحفظ...';
  Promise.all(ups.map(function(u){
    return Promise.resolve(sb.from('products').update({price:u.price, stock:u.stock}).eq('id', u.id).select());
  })).then(function(results){
    adm.saving = false;
    $('admSave').textContent = 'احفظ التغييرات';
    var failed = results.some(function(r){ return r.error || !r.data || !r.data.length; });
    if(failed){
      setMsg('admErr', 'بعض التعديلات ما انحفظت. تأكد إنك داخل بحساب المالك وجرب مرة ثانية.');
      loadProducts().then(function(){ adm.edits = {}; renderAdmPrices(); });
      return;
    }
    adm.edits = {};
    return loadProducts().then(function(){
      renderAdmPrices();
      setMsg('admNote', 'انحفظت. الزبائن يشوفون الأسعار الجديدة.', true);
    });
  }).catch(function(){
    adm.saving = false;
    $('admSave').textContent = 'احفظ التغييرات';
    updateAdmCount();
    setMsg('admErr', 'ما انحفظت التعديلات. تأكد من النت وجرب مرة ثانية.');
  });
}
/* قائمة المنتجات + تعديل/إضافة/حذف + الصور */
function renderProdList(){
  var q = $('prodQ').value.trim().toLowerCase();
  var box = $('prodList');
  box.textContent = '';
  var items = S.products.filter(function(p){ return !q || p.t.toLowerCase().indexOf(q) !== -1; });
  if(!items.length) box.appendChild(el('p', 'cnote', 'ما أكو منتجات.'));
  items.forEach(function(p){
    var row = el('div', 'prow');
    var th = el('div', 'th');
    if(p.img) th.style.backgroundImage = 'url("' + p.img.replace(/"/g, '%22') + '")';
    var pt = el('div', 'pt');
    var nm = el('b', null, p.t);
    nm.setAttribute('dir', 'auto');
    pt.appendChild(nm);
    pt.appendChild(el('small', null, platLabel(p) + ' · ' + money(p.price) + ' · ' + p.stock));
    var ed = el('button', null, 'تعديل');
    ed.type = 'button';
    ed.addEventListener('click', function(){ openEdit(p.id); });
    row.appendChild(th); row.appendChild(pt); row.appendChild(ed);
    box.appendChild(row);
  });
}
var ed = {id:null, img:'', blob:null, delArmed:false, busy:false, objUrl:null};

function showPreview(){
  var pv = $('ePrev');
  if(ed.objUrl){ try{ URL.revokeObjectURL(ed.objUrl); }catch(e){} ed.objUrl = null; }
  var src = '';
  if(ed.blob){ ed.objUrl = URL.createObjectURL(ed.blob); src = ed.objUrl; }
  else src = ed.img;
  pv.textContent = '';
  if(src){ pv.style.backgroundImage = 'url("' + src.replace(/"/g, '%22') + '")'; }
  else { pv.style.backgroundImage = ''; pv.appendChild(el('span', null, 'بدون صورة')); }
  $('eRmImg').hidden = !src;
}
function openEdit(id){
  var p = id ? S.byId[id] : null;
  ed.id = p ? p.id : null; ed.img = p ? p.img : ''; ed.blob = null; ed.delArmed = false; ed.busy = false;
  $('editTitle').textContent = p ? 'تعديل المنتج' : 'منتج جديد';
  $('eName').value = p ? p.t : '';
  $('ePlat').value = p ? p.p : 'ps5';
  $('eCat').value = p ? p.c : 'new';
  $('eGenre').value = p ? p.g : '';
  $('ePrice').value = p ? String(p.price) : '';
  $('eStock').value = p ? String(p.stock) : '';
  $('eFeat').checked = p ? p.feat : false;
  $('eFile').value = '';
  $('eDel').hidden = !p;
  $('eDel').textContent = 'احذف المنتج';
  setMsg('eErr', '');
  setAdmTab('edit');
  showPreview();
  $('admSheet').scrollTop = 0;
}
function imageToBlob(file){
  return new Promise(function(ok, fail){
    var url = URL.createObjectURL(file);
    var im = new Image();
    im.onload = function(){
      var max = 900, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      var g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function(b){ b ? ok(b) : fail(new Error('blob')); }, 'image/jpeg', 0.82);
    };
    im.onerror = function(){ URL.revokeObjectURL(url); fail(new Error('image')); };
    im.src = url;
  });
}
function imgPath(url){
  var m = /\/product-images\/([^?#]+)/.exec(url || '');
  return m ? decodeURIComponent(m[1]) : null;
}
function removeImage(url){
  var path = imgPath(url);
  if(!path) return;
  try{ Promise.resolve(sb.storage.from('product-images').remove([path])).catch(function(){}); }catch(e){}
}
function uploadImage(blob){
  var path = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
  var bucket = sb.storage.from('product-images');
  return Promise.resolve(bucket.upload(path, blob, {contentType:'image/jpeg', cacheControl:'31536000'})).then(function(r){
    if(r.error) throw r.error;
    return bucket.getPublicUrl(path).data.publicUrl;
  });
}
function saveEdit(e){
  e.preventDefault();
  if(ed.busy) return;
  var name = $('eName').value.trim(), genre = $('eGenre').value.trim();
  var price = parseField($('ePrice').value), stock = parseField($('eStock').value);
  function bad(msg, id){ setMsg('eErr', msg); $(id).focus(); }
  if(name.length < 2) return bad('اكتب اسم المنتج.', 'eName');
  if(price === null || price > 99999999) return bad('اكتب السعر بالأرقام.', 'ePrice');
  if(stock === null || stock > 999) return bad('اكتب العدد المتوفر بالأرقام (لحد 999).', 'eStock');
  ed.busy = true; $('eSave').disabled = true; $('eSave').textContent = 'جاري الحفظ...';
  setMsg('eErr', '');
  var oldImg = ed.id ? (S.byId[ed.id] ? S.byId[ed.id].img : '') : '';
  var step = ed.blob ? uploadImage(ed.blob) : Promise.resolve(ed.img);
  var newUrl = null;
  step.then(function(url){
    newUrl = url || null;
    var row = {name:name, platform:$('ePlat').value, category:$('eCat').value, genre:genre, price:price, stock:stock, featured:$('eFeat').checked, image_url:newUrl};
    if(ed.id) return Promise.resolve(sb.from('products').update(row).eq('id', ed.id).select());
    row.id = 'p' + Date.now().toString(36);
    row.sort = S.products.reduce(function(m, p){ return Math.max(m, p.sort || 0); }, 0) + 1;
    return Promise.resolve(sb.from('products').insert(row).select());
  }).then(function(r){
    ed.busy = false; $('eSave').disabled = false; $('eSave').textContent = 'احفظ';
    if(r.error || !r.data || !r.data.length){
      if(newUrl && ed.blob) removeImage(newUrl);
      setMsg('eErr', 'ما انحفظ المنتج. تأكد إنك داخل بحساب المالك.');
      return;
    }
    if(oldImg && oldImg !== newUrl) removeImage(oldImg);
    toast('انحفظ المنتج');
    return loadProducts().then(function(){ setAdmTab('prods'); });
  }).catch(function(){
    ed.busy = false; $('eSave').disabled = false; $('eSave').textContent = 'احفظ';
    setMsg('eErr', 'ما انحفظ. إذا كنت ترفع صورة تأكد إنك شغّلت SQL الجزء 3، وجرب مرة ثانية.');
  });
}
function deleteProduct(){
  if(!ed.id || ed.busy) return;
  if(!ed.delArmed){
    ed.delArmed = true;
    $('eDel').textContent = 'اضغط مرة ثانية للتأكيد (ما ينرجع)';
    return;
  }
  ed.busy = true; $('eDel').disabled = true;
  var id = ed.id, img = S.byId[id] ? S.byId[id].img : '';
  Promise.resolve(sb.from('products').delete().eq('id', id).select()).then(function(r){
    ed.busy = false; $('eDel').disabled = false;
    if(r.error || !r.data || !r.data.length){ ed.delArmed = false; $('eDel').textContent = 'احذف المنتج'; setMsg('eErr', 'ما انحذف المنتج. تأكد إنك داخل بحساب المالك.'); return; }
    if(img) removeImage(img);
    toast('انحذف المنتج');
    return loadProducts().then(function(){ setAdmTab('prods'); });
  }).catch(function(){ ed.busy = false; $('eDel').disabled = false; setMsg('eErr', friendly(null)); });
}
function onPickImage(){
  var f = $('eFile').files && $('eFile').files[0];
  if(!f) return;
  if(f.type && f.type.indexOf('image/') !== 0){ setMsg('eErr', 'اختار ملف صورة.'); return; }
  setMsg('eErr', 'جاري تجهيز الصورة...', true);
  imageToBlob(f).then(function(b){
    ed.blob = b;
    setMsg('eErr', '');
    showPreview();
  }, function(){ setMsg('eErr', 'ما كدرنا نقرأ هذي الصورة. جرب صورة ثانية.'); });
}

/* إعدادات المتجر */
var COLORS = ['', '#F5B63D', '#4FC48C', '#4CC9F0', '#FF7AA8', '#FF6B6B', '#B794F6'];
var cfgColor = '';
function paintSwatches(){
  var box = $('cfgColors');
  box.textContent = '';
  COLORS.forEach(function(c){
    var b = el('button', 'sw');
    b.type = 'button';
    b.setAttribute('aria-label', c ? 'لون ' + c : 'اللون الأصلي');
    b.setAttribute('aria-pressed', c === cfgColor ? 'true' : 'false');
    b.style.background = c || 'linear-gradient(135deg,#F5B63D 50%,#F0A417 50%)';
    b.addEventListener('click', function(){ cfgColor = c; paintSwatches(); });
    box.appendChild(b);
  });
}
function fillSettings(){
  var st = S.settings;
  $('cfgTitle').value = st.hero_title || '';
  $('cfgSub').value = st.hero_sub || '';
  $('cfgAnn').value = st.announce || '';
  $('cfgWa').value = st.wa || CONFIG.wa || '';
  cfgColor = st.accent || '';
  setMsg('setErr', '');
  paintSwatches();
}
function saveSettings(e){
  e.preventDefault();
  if(adm.saving) return;
  var wa = intlPhone(fixDigits($('cfgWa').value));
  if(wa.length < 10 || wa.length > 15){ setMsg('setErr', 'رقم الواتساب غير صحيح. مثال: 07701234567'); $('cfgWa').focus(); return; }
  var rows = [
    {key:'hero_title', value:$('cfgTitle').value.trim()},
    {key:'hero_sub', value:$('cfgSub').value.trim()},
    {key:'announce', value:$('cfgAnn').value.trim()},
    {key:'wa', value:wa},
    {key:'accent', value:cfgColor}
  ];
  adm.saving = true; $('setSave').disabled = true;
  setMsg('setErr', '');
  Promise.resolve(sb.from('settings').upsert(rows).select()).then(function(r){
    adm.saving = false; $('setSave').disabled = false;
    if(r.error || !r.data || r.data.length < rows.length){ setMsg('setErr', 'ما انحفظت الإعدادات. تأكد إنك شغّلت SQL الجزء 3 وإنك داخل بحساب المالك.'); return; }
    var m = {};
    r.data.forEach(function(x){ m[x.key] = x.value; });
    S.settings = m;
    applySettings();
    setMsg('setErr', 'انحفظت الإعدادات.', true);
  }).catch(function(){ adm.saving = false; $('setSave').disabled = false; setMsg('setErr', friendly(null)); });
}

/* ---------- الأحداث ---------- */
function bindGroup(selector, attr, key){
  var btns = document.querySelectorAll(selector);
  Array.prototype.forEach.call(btns, function(b){
    b.addEventListener('click', function(){
      S[key] = b.getAttribute(attr);
      Array.prototype.forEach.call(btns, function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      renderGrid();
    });
  });
}
function bind(){
  $('q').addEventListener('input', function(){ S.q = this.value; renderGrid(); });
  bindGroup('.tab', 'data-plat', 'plat');
  bindGroup('.chip', 'data-cat', 'cat');
  $('admBtn').innerHTML = ICON_GEAR;
  $('accBtn').addEventListener('click', openAccount);
  $('admBtn').addEventListener('click', openAdmin);
  $('openCart').addEventListener('click', openSheet);
  $('closeCart').addEventListener('click', closeSheet);
  $('sheet').addEventListener('click', function(e){ if(e.target === this) closeSheet(); });
  $('clearCart').addEventListener('click', function(){ S.cart = {}; saveCart(); updateAll(); });
  $('orderBtn').addEventListener('click', placeOrder);

  $('closeAcc').addEventListener('click', closeAccount);
  $('accSheet').addEventListener('click', function(e){ if(e.target === this) closeAccount(); });
  $('segLogin').addEventListener('click', function(){ setAuthMode('login'); });
  $('segSignup').addEventListener('click', function(){ setAuthMode('signup'); });
  $('authForm').addEventListener('submit', submitAuth);
  $('profForm').addEventListener('submit', saveProfile);
  $('logout').addEventListener('click', function(){
    Promise.resolve(sb.auth.signOut()).then(function(){ closeAccount(); toast('تم تسجيل الخروج'); });
  });

  $('closeAdm').addEventListener('click', closeAdmin);
  $('admSheet').addEventListener('click', function(e){ if(e.target === this) closeAdmin(); });
  $('tabOrd').addEventListener('click', function(){ setAdmTab('orders'); });
  $('tabPrice').addEventListener('click', function(){ setAdmTab('price'); });
  $('tabProd').addEventListener('click', function(){ setAdmTab('prods'); });
  $('tabSet').addEventListener('click', function(){ setAdmTab('set'); });
  $('prodQ').addEventListener('input', renderProdList);
  $('prodNew').addEventListener('click', function(){ openEdit(null); });
  $('editForm').addEventListener('submit', saveEdit);
  $('eCancel').addEventListener('click', function(){ setAdmTab('prods'); });
  $('eDel').addEventListener('click', deleteProduct);
  $('eFile').addEventListener('change', onPickImage);
  $('eRmImg').addEventListener('click', function(){ ed.blob = null; ed.img = ''; $('eFile').value = ''; showPreview(); });
  $('setForm').addEventListener('submit', saveSettings);
  $('admQ').addEventListener('input', renderAdmPrices);
  $('admSave').addEventListener('click', saveAdmPrices);

  $('closeDone').addEventListener('click', function(){ $('doneSheet').hidden = true; });
  $('doneSheet').addEventListener('click', function(e){ if(e.target === this) this.hidden = true; });
  $('doneCopy').addEventListener('click', function(){ copyText(S.doneText, 'doneNote'); });

  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    if(!$('doneSheet').hidden) $('doneSheet').hidden = true;
    else if(!$('admSheet').hidden) closeAdmin();
    else if(!$('accSheet').hidden) closeAccount();
    else if(!$('sheet').hidden) closeSheet();
  });
  document.addEventListener('visibilitychange', function(){
    if(sb && document.visibilityState === 'visible' && Date.now() - S.lastLoad > 60000) loadProducts();
  });
}

function init(){
  bind();
  renderHeader();
  renderGrid();
  renderBar();
  if(!window.supabase || typeof window.supabase.createClient !== 'function'){
    showBanner('ما انحمّلت مكتبة Supabase. تأكد من النت وحدّث الصفحة.', false);
    return;
  }
  if(!CONFIG.url || !CONFIG.key || String(CONFIG.url).indexOf('http') !== 0){
    showBanner('المتجر لسه ما انربط بقاعدة البيانات. حط الرابط والمفتاح بملف config.js.', false);
    return;
  }
  sb = window.supabase.createClient(CONFIG.url, CONFIG.key);
  sb.auth.onAuthStateChange(function(ev, session){
    setTimeout(function(){ handleSession(session); }, 0);
  });
  loadSettings();
  loadProducts();
}
init();
})();
