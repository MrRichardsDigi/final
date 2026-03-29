// Year (guarded)
try{
  const yearEl = document.getElementById('year')
  if(yearEl) yearEl.textContent = new Date().getFullYear();
}catch(e){
  console.error('year set failed', e)
}

// Nav toggle
const navToggle = document.getElementById('nav-toggle');
const nav = document.getElementById('nav');
navToggle?.addEventListener('click', () => {
  if (!nav) return;
  const shown = nav.style.display === 'block';
  nav.style.display = shown ? 'none' : 'block';
});

// Sticky header fallback
;(function(){
  const header = document.querySelector('.site-header');
  if (!header) return;
  const supportsSticky = typeof CSS !== 'undefined' && (
    CSS.supports('position', 'sticky') || CSS.supports('position', '-webkit-sticky')
  );
  if (supportsSticky) return;
  function setFixed(enabled){
    if (enabled){
      if (!header.classList.contains('is-fixed')){
        header.classList.add('is-fixed');
        document.body.style.paddingTop = header.offsetHeight + 'px';
      }
    } else {
      if (header.classList.contains('is-fixed')){
        header.classList.remove('is-fixed');
        document.body.style.paddingTop = '';
      }
    }
  }
  window.addEventListener('scroll', ()=> setFixed(window.scrollY > 0), {passive:true});
  window.addEventListener('resize', ()=>{
    if (header.classList.contains('is-fixed')) document.body.style.paddingTop = header.offsetHeight + 'px';
  });
})();

// SKU-aware cart with mini-preview controls
;(function(){
  const CART_KEY = 'pocksy_cart'

  const PRODUCTS = {
    'black-pocket': {name:'Black Pocket', price:19.99, img:'https://via.placeholder.com/64?text=Black'},
    'white-pocket': {name:'White Pocket', price:19.99, img:'https://via.placeholder.com/64?text=White'},
    'keychain': {name:'Custom Keychain', price:7.50, img:'https://via.placeholder.com/64?text=Keychain'}
  }

  function normalizeSku(s){ return String(s||'').trim().toLowerCase().replace(/\s+/g,'-') }

  function readCart(){
    try{
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}')
      const out = {}
      for(const [k,v] of Object.entries(raw||{})){
        const nk = normalizeSku(k)
        out[nk] = (out[nk] || 0) + Number(v || 0)
      }
      // if normalization collapsed keys, persist normalized form
      localStorage.setItem(CART_KEY, JSON.stringify(out))
      return out
    }catch(e){ return {} }
  }
  function writeCart(obj){
    // ensure keys are normalized before writing
    const out = {}
    for(const [k,v] of Object.entries(obj||{})) out[normalizeSku(k)] = Number(v || 0)
    localStorage.setItem(CART_KEY, JSON.stringify(out))
  }
  function cartTotal(cart){ return Object.values(cart).reduce((s,v)=>s+v,0) }
  function formatPrice(n){ return '$' + Number(n).toFixed(2) }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]))
  }

  function updateBadges(){
    const cart = readCart(); const total = cartTotal(cart)
    document.querySelectorAll('#cart-count').forEach(el=> el.textContent = String(total))
    document.querySelectorAll('.global-cart').forEach(renderDropdown)
  }

  function triggerBounce(){
    document.querySelectorAll('.global-cart').forEach(el=>{
      el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce');
      setTimeout(()=>el.classList.remove('bounce'), 700)
    })
  }

  // Render the mini-preview dropdown for a given cart anchor
  function renderDropdown(anchor){
    const dropdown = anchor.querySelector('.cart-dropdown'); if(!dropdown) return
    const itemsWrap = dropdown.querySelector('.cart-items'); const cart = readCart()
    itemsWrap.innerHTML = ''
    const total = cartTotal(cart)
    if(total === 0){ itemsWrap.innerHTML = '<div class="empty">Your cart is empty</div>'; return }
    for(const [sku,qty] of Object.entries(cart)){
      const prod = PRODUCTS[sku] || {name:sku, price:0, img:'https://via.placeholder.com/64'}
      const item = document.createElement('div'); item.className = 'cart-item'; item.dataset.sku = sku
      item.innerHTML = `
        <img class="thumb" src="${escapeHtml(prod.img)}" alt="" aria-hidden="true" loading="lazy">
        <div class="meta"><div class="name">${escapeHtml(prod.name)}</div><div class="price">${formatPrice(prod.price)}</div></div>
      `
      const controls = document.createElement('div'); controls.className = 'cart-controls'
      const dec = document.createElement('button'); dec.type='button'; dec.dataset.action='dec'; dec.dataset.sku=sku; dec.textContent='−'
      const qtyEl = document.createElement('div'); qtyEl.className='qty'; qtyEl.textContent=String(qty)
      const inc = document.createElement('button'); inc.type='button'; inc.dataset.action='inc'; inc.dataset.sku=sku; inc.textContent='+'
      const remove = document.createElement('button'); remove.type='button'; remove.dataset.action='remove'; remove.dataset.sku=sku; remove.className='remove'; remove.title='Remove'; remove.textContent='✕'
      controls.appendChild(dec); controls.appendChild(qtyEl); controls.appendChild(inc); controls.appendChild(remove)
      item.appendChild(controls); itemsWrap.appendChild(item)
    }
  }

  // Add-to-cart behavior
  function addToCartSku(sku, btn){
    const cart = readCart(); cart[sku] = (cart[sku] || 0) + 1; writeCart(cart); updateBadges(); triggerBounce();
    if(btn){ const prev = btn.textContent; btn.textContent = 'Added'; setTimeout(()=>btn.textContent = prev, 1000) }
  }

  // Attach direct handlers to add-to-cart buttons
  function attachAddButtons(){
    document.querySelectorAll('button.add-to-cart').forEach(b=>{
      if(b.dataset._attached) return; b.addEventListener('click', (e)=>{ e.preventDefault(); const sku = b.dataset.sku || 'item'; addToCartSku(sku, b) })
      b.dataset._attached = '1'
    })
  }

  // Handle clicks on controls inside the dropdown (delegated)
  document.addEventListener('click', (e)=>{
    const ctl = e.target.closest && e.target.closest('[data-action]')
    if(!ctl) return
    const action = ctl.dataset.action; const sku = ctl.dataset.sku
    if(!sku) return
    const cart = readCart()
    if(action === 'inc'){ cart[sku] = (cart[sku] || 0) + 1; writeCart(cart); updateBadges(); return }
    if(action === 'dec'){ if(cart[sku] > 1){ cart[sku] = cart[sku] - 1; writeCart(cart); updateBadges() } else { delete cart[sku]; writeCart(cart); updateBadges() } return }
    if(action === 'remove'){ delete cart[sku]; writeCart(cart); updateBadges(); return }
  })

  // Toggle dropdown on small screens (anchor click)
  document.addEventListener('click', (e)=>{
    const a = e.target.closest && e.target.closest('.global-cart')
    if(!a) return
    if(window.matchMedia('(max-width:800px)').matches){ e.preventDefault(); a.classList.toggle('active'); renderDropdown(a) }
  })

  // Render on hover for larger screens
  document.querySelectorAll('.global-cart').forEach(a=> a.addEventListener('mouseenter', ()=>renderDropdown(a)))

  // Close dropdown when clicking outside
  document.addEventListener('click', (e)=>{ if(e.target.closest && e.target.closest('.global-cart')) return; document.querySelectorAll('.global-cart.active').forEach(a=>a.classList.remove('active')) })

  // Cart page rendering with itemization
  function renderCartPage(){
    if (!(location.pathname.endsWith('/cart.html') || location.pathname.endsWith('cart.html'))) return
    const contents = document.getElementById('cart-contents'); const clear = document.getElementById('clear-cart')
    function render(){
      const cart = readCart(); const total = cartTotal(cart)
      if(total === 0){ contents.innerHTML = '<p>Your cart is empty.</p>'; return }
      const list = document.createElement('div')
      let grand = 0
      for(const [sku,qty] of Object.entries(cart)){
        const prod = PRODUCTS[sku] || {name:sku, price:0, img:'https://via.placeholder.com/64'}
        const row = document.createElement('div'); row.className='cart-item'
        const line = prod.price * qty; grand += line
        row.innerHTML = `<img class="thumb" src="${escapeHtml(prod.img)}" alt="" aria-hidden="true" loading="lazy"><div class="meta"><div class="name">${escapeHtml(prod.name)}</div><div class="price">${qty} × ${formatPrice(prod.price)}</div></div><div class="qty">${formatPrice(line)}</div>`
        list.appendChild(row)
      }
      contents.innerHTML = '' ; contents.appendChild(list)
      const summary = document.createElement('p'); summary.textContent = `Total items: ${total} — ${formatPrice(grand)}`; contents.appendChild(summary)
    }
    render(); clear?.addEventListener('click', ()=>{ writeCart({}); updateBadges(); render() })
  }

  // Init
  try{ attachAddButtons(); renderCartPage(); updateBadges() }catch(e){ console.error('cart init error', e) }

})();
