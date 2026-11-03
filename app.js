/* Logic Mâm Cơm: chọn món theo ngày, giỏ hàng, thanh toán, bình luận */

const STORE_KEY = 'mamcom_cart_v1';
const ORDERS_KEY = 'mamcom_orders_v1';

const state = {
  plan: 'trial',       // mặc định gói 2 ngày — ít thao tác nhất cho lần đầu
  servings: 2,
  activeDay: 'mon',
  activeTag: 'all',
  week: {},          // { dayId: { dishId, servings } | null } — mỗi ngày tối đa 1 món
  skipped: false,    // khách bỏ qua tuần này
};

/* ---------- Tiện ích ---------- */

function money(n) {
  return n.toLocaleString('vi-VN') + 'đ';
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
}

function currentPlan() {
  return PLANS.find(p => p.id === state.plan) || PLANS[1];
}

function dishById(id) {
  return DISHES.find(d => d.id === id);
}

function dayById(id) {
  return WEEKDAYS.find(d => d.id === id);
}

/* Số ngày khách cần chọn món theo gói hiện tại */
function planDays() {
  return currentPlan().days;
}

/* ---------- Tuần chọn món ---------- */

/* Mỗi ngày 1 món. Không tự động điền — khách tự chọn.
   Cắt bớt nếu khách đang chọn nhiều hơn số ngày của gói. */
function ensureWeek() {
  WEEKDAYS.forEach(day => {
    if (!(day.id in state.week)) state.week[day.id] = null;
  });
  let kept = 0;
  WEEKDAYS.forEach(day => {
    if (!state.week[day.id]) return;
    kept++;
    if (kept > planDays()) state.week[day.id] = null;
  });
}

function weekItems() {
  return WEEKDAYS
    .map(day => {
      const slot = state.week[day.id];
      if (!slot || !slot.dishId) return null;
      const dish = dishById(slot.dishId);
      if (!dish) return null;
      return {
        day: day.id,
        dayLabel: day.full,
        dish,
        servings: slot.servings,
        total: dish.price * slot.servings,
      };
    })
    .filter(Boolean);
}

function selectedCount() {
  return weekItems().length;
}

function cartCount() {
  return selectedCount();
}

function cartTotal() {
  return weekItems().reduce((s, i) => s + i.total, 0);
}

function cartSubtotal() {
  const plan = currentPlan();
  return Math.round(cartTotal() * (1 - plan.discount));
}

function shippingFee() {
  return 0;
}

function cartGrandTotal() {
  return cartSubtotal() + shippingFee();
}

/* Ngày giao dự kiến = ngày đầu tiên khách đã chọn món */
function deliveryLabel() {
  const first = weekItems()[0];
  return first ? first.dayLabel : 'Chưa chọn';
}

/* ---------- Lọc món ---------- */

function filteredDishes() {
  let list = DISHES;
  if (state.activeTag !== 'all') list = list.filter(d => d.tags.includes(state.activeTag));
  return list;
}

/* ---------- Render ---------- */

/* Dải 7 ngày: bấm vào ngày để gán món */
function renderDayStrip() {
  const strip = document.querySelector('#dayStrip');
  if (!strip) return;
  strip.className = 'grid grid-cols-7 gap-2 sm:gap-3 mb-6';
  strip.innerHTML = WEEKDAYS.map(day => {
    const slot = state.week[day.id];
    const dish = slot ? dishById(slot.dishId) : null;
    const active = day.id === state.activeDay;
    const ring = active ? 'ring-2 ring-[#c4271d] ring-offset-2' : 'border border-[#e5e3df]';
    const label = active ? 'text-[#c4271d]' : 'text-[#1a1d2e]';
    return `<button type="button" data-day="${day.id}"
      class="group flex flex-col items-center gap-1.5 rounded-xl bg-white p-2 sm:p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${ring}">
      <span class="flex items-center gap-1">
        <span class="text-xs sm:text-sm font-bold ${label}">${day.label}</span>
        <span class="text-[11px] font-bold ${dish ? 'text-emerald-600' : 'text-stone-300'}">${dish ? '✓' : '·'}</span>
      </span>
      <span class="relative w-full aspect-square rounded-lg overflow-hidden bg-[#fdf0ef] grid place-items-center">
        ${dish
          ? `<img src="${dish.img}" alt="" loading="lazy" onerror="this.style.display='none'" class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
             <span class="relative text-xl sm:text-2xl">${dish.emoji}</span>`
          : '<span class="text-xl sm:text-2xl font-light text-[#c4271d]">+</span>'}
      </span>
      <span class="text-[10px] sm:text-[11px] leading-tight text-center text-stone-500 line-clamp-2">${dish ? dish.name : 'Chưa chọn món'}</span>
    </button>`;
  }).join('');
}

/* Kho món: khách đang chọn món cho ngày nào (state.activeDay) */
function renderMenu() {
  const grid = document.querySelector('#menuGrid');
  const list = filteredDishes();
  const activeDay = dayById(state.activeDay);
  const slot = state.week[state.activeDay];
  const activeDishId = slot ? slot.dishId : null;
  const full = selectedCount() >= planDays() && !activeDishId;

  const hint = document.querySelector('#menuHint');
  if (hint) {
    hint.textContent = `Đang chọn món cho ${activeDay.full} — bấm vào một món bên dưới để gán.`;
  }

  grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5';
  if (!list.length) {
    grid.innerHTML = `<p class="col-span-full text-center text-stone-500 py-10">Không có món nào khớp bộ lọc. Thử tag khác nhé.</p>`;
    return;
  }

  grid.innerHTML = list.map(d => {
    const picked = d.id === activeDishId;
    // Món đang nằm ở ngày khác → bấm vào sẽ chuyển sang ngày đang chọn
    const otherDay = WEEKDAYS.find(day => {
      const s = state.week[day.id];
      return s && s.dishId === d.id && day.id !== state.activeDay;
    });
    const border = picked
      ? 'border-[#10b981] ring-2 ring-emerald-500/25'
      : 'border-[#e5e3df] hover:border-stone-400';
    const cta = picked
      ? `<button data-action="pick" data-id="${d.id}"
           class="w-full rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-bold text-white transition-colors duration-300 hover:bg-emerald-600">
           ✓ Đã chọn cho ${activeDay.label}</button>`
      : `<button data-action="pick" data-id="${d.id}" ${full ? 'disabled' : ''}
           class="w-full rounded-lg px-3 py-2.5 text-sm font-bold text-white transition-all duration-300
                  ${full ? 'bg-stone-300 cursor-not-allowed' : 'bg-[#c4271d] hover:bg-[#a81f16] hover:-translate-y-0.5'}">
           ${full ? 'Đã đủ món' : '＋ Chọn cho ' + activeDay.label}</button>`;

    return `<article class="group flex flex-col overflow-hidden rounded-2xl bg-white border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${border}">
      <div class="relative aspect-[4/3] overflow-hidden bg-[#fdf0ef]">
        <img src="${d.img}" alt="${d.name}" loading="lazy" onerror="this.style.display='none'"
             class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
        <span class="absolute left-3 bottom-3 grid h-10 w-10 place-items-center rounded-xl bg-white/95 text-xl shadow">${d.emoji}</span>
        <span class="absolute right-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white">⏱ ${d.time} phút</span>
        ${otherDay ? `<span class="absolute left-3 top-3 rounded-full bg-[#fffb05] px-2.5 py-1 text-[11px] font-bold text-black">Ở ${otherDay.label}</span>` : ''}
      </div>
      <div class="flex flex-1 flex-col gap-2 p-4">
        <div class="flex flex-wrap gap-1.5">
          ${d.tags.slice(0, 2).map(t => `<span class="rounded-full bg-[#fdf0ef] px-2.5 py-1 text-[10px] font-bold text-[#c4271d]">${t}</span>`).join('')}
        </div>
        <h3 class="text-base font-bold leading-snug text-[#1a1d2e]">${d.name}</h3>
        <p class="flex-1 text-[13px] leading-relaxed text-stone-500">${d.desc}</p>
        <ul class="flex gap-3 border-t border-[#eceae6] pt-3 text-[11px] text-stone-500">
          <li>${d.kcal} kcal</li>
          <li>${d.protein}g đạm</li>
          <li>${d.ingredients.length} nguyên liệu</li>
        </ul>
        <div class="flex items-center justify-between gap-3">
          <span class="text-lg font-extrabold text-[#c4271d]">${money(d.price)}<span class="text-xs font-normal text-stone-500">/phần</span></span>
          ${cta}
        </div>
      </div>
    </article>`;
  }).join('');
}

/* Thanh dính đáy: đồng hồ đếm món của tuần */
function renderTracker() {
  const plan = currentPlan();
  const n = selectedCount();
  const pct = Math.min(100, Math.round((n / plan.days) * 100));
  const full = n >= plan.days;

  const label = document.querySelector('#trackerLabel');
  label.textContent = full
    ? `Đủ ${plan.days} ngày rồi — sẵn sàng đặt hộp`
    : `Đã chọn ${n}/${plan.days} ngày`;
  label.className = full ? 'text-sm font-bold text-emerald-600' : 'text-sm font-bold text-[#1a1d2e]';

  const bar = document.querySelector('#trackerBar');
  bar.style.width = pct + '%';
  bar.className = 'h-2 rounded-full transition-all duration-500 ' + (full ? 'bg-emerald-500' : 'bg-[#c4271d]');

  document.querySelector('#trackerPrice').textContent = n
    ? `${money(cartSubtotal())} · giao ${deliveryLabel()}`
    : `Gói "${plan.label}" · ${money(planPrice(plan))}/tuần ước tính`;

  const checkout = document.querySelector('#trackerCheckout');
  checkout.disabled = !n || state.skipped;
  checkout.className = checkout.disabled
    ? 'rounded-lg bg-stone-300 px-5 py-3 text-sm font-bold text-white cursor-not-allowed transition-colors duration-300'
    : 'rounded-lg bg-[#c4271d] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-[#a81f16] hover:-translate-y-0.5';
  checkout.textContent = full ? `Đặt hộp · ${money(cartSubtotal())}` : 'Đặt hộp tuần này';

  const skip = document.querySelector('#skipWeek');
  skip.textContent = state.skipped ? 'Chọn lại tuần này' : 'Bỏ qua tuần này';

  // Khi skip: ẩn board + tracker, hiện trạng thái "đã bỏ qua"
  const board = document.querySelector('#menuBoard');
  const skipState = document.querySelector('#skipState');
  const tracker = document.querySelector('#tracker');
  board.style.display = state.skipped ? 'none' : '';
  skipState.hidden = !state.skipped;
  tracker.style.display = state.skipped ? 'none' : '';
}

function renderCart() {
  const items = weekItems();
  const body = document.querySelector('#cartItems');
  const count = cartCount();

  const badge = document.querySelector('#cartBadge');
  badge.textContent = count;
  badge.style.display = count ? 'inline-flex' : 'none';

  if (!items.length) {
    body.innerHTML = `<div class="cart-empty">
      <div class="cart-empty__icon">🍱</div>
      <p>Giỏ hàng đang trống.</p>
      <p class="muted">Chọn món cho các ngày trong tuần để bắt đầu.</p>
    </div>`;
  } else {
    body.innerHTML = items.map(i => `
      <div class="cart-item">
        <div class="cart-item__media"><img src="${i.dish.img}" alt="${i.dish.name}" loading="lazy" onerror="this.style.display='none'"></div>
        <div class="cart-item__info">
          <span class="cart-item__day">${i.dayLabel}</span>
          <strong>${i.dish.name}</strong>
          <span class="muted">${i.servings} phần · ${money(i.dish.price)}/phần</span>
        </div>
        <div class="cart-item__right">
          <strong>${money(i.total)}</strong>
          <button class="cart-item__remove" data-action="remove" data-day="${i.day}" data-id="${i.dish.id}" aria-label="Xoá">✕</button>
        </div>
      </div>`).join('');
  }

  const plan = currentPlan();
  document.querySelector('#cartSubtotal').textContent = money(cartSubtotal());
  document.querySelector('#cartDiscount').textContent = plan.discount > 0 ? `-${Math.round(plan.discount * 100)}%` : '—';
  document.querySelector('#cartShipping').textContent = shippingFee() === 0 ? 'Miễn phí' : money(shippingFee());
  document.querySelector('#cartTotal').textContent = money(cartGrandTotal());
  document.querySelector('#checkoutOpen').disabled = !items.length;
}

function renderSummary() {
  const plan = currentPlan();
  document.querySelector('#summaryPlan').textContent = plan.label;
  document.querySelector('#summaryServings').textContent = state.servings + ' người/bữa';
  document.querySelector('#summaryMeals').textContent = selectedCount() + ' ngày đã chọn';
  const lbl = document.querySelector('#servingsLabel');
  if (lbl) lbl.textContent = state.servings + ' người';
}

/* Gói đang chọn và đã đủ số ngày → lấy đúng tổng tiền trong giỏ */
function planPrice(plan) {
  if (plan.id === state.plan && selectedCount() === plan.days) return cartSubtotal();
  const avgPrice = Math.round(DISHES.reduce((s, d) => s + d.price, 0) / DISHES.length);
  return Math.round(plan.days * avgPrice * state.servings * (1 - plan.discount));
}

function planPriceIsEstimate(plan) {
  return !(plan.id === state.plan && selectedCount() === plan.days);
}

function renderTags() {
  document.querySelector('#tagFilter').innerHTML = TAGS.map(t => {
    const active = t.id === state.activeTag;
    return `<button data-tag="${t.id}"
      class="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300
             ${active
               ? 'border-[#1a1d2e] bg-[#fffb05] text-[#1a1d2e]'
               : 'border-[#e5e3df] bg-white text-stone-500 hover:border-stone-400 hover:text-[#1a1d2e]'}">${t.label}</button>`;
  }).join('');
}

function renderPlans() {
  document.querySelector('#planCards').innerHTML = PLANS.map(p => {
    const active = p.id === state.plan;
    return `<button data-plan="${p.id}"
      class="flex flex-col items-start gap-1 rounded-xl border-2 bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
             ${active ? 'border-[#c4271d] shadow-[0_0_0_3px_rgba(196,39,29,.14)]' : 'border-[#e5e3df]'}">
      <span class="rounded-full bg-[#fffb05] px-2.5 py-0.5 text-[11px] font-bold text-black">${p.badge}</span>
      <span class="text-2xl font-extrabold text-[#c4271d]">${p.days} <span class="text-sm font-semibold">ngày</span></span>
      <span class="text-sm font-semibold text-[#1a1d2e]">${p.label}</span>
      <span class="mt-1 text-base font-bold text-[#1a1d2e]">${planPriceIsEstimate(p) ? '~' : ''}${money(planPrice(p))}<small class="text-xs font-normal text-stone-500">/tuần</small></span>
    </button>`;
  }).join('');
}

function renderAll() {
  renderDayStrip();
  renderTags();
  renderPlans();
  renderMenu();
  renderCart();
  renderSummary();
  renderTracker();
}

/* ---------- Hành động ---------- */

function persist() {
  saveJSON(STORE_KEY, {
    week: state.week,
    plan: state.plan,
    servings: state.servings,
    skipped: state.skipped,
  });
}

/* Ngày trống kế tiếp sau dayId, chỉ trong phạm vi số ngày của gói.
   Dùng để tự nhảy sang ngày mới sau khi chọn món. */
function nextEmptyDay(dayId) {
  const days = WEEKDAYS.slice(0, planDays());
  const start = days.findIndex(d => d.id === dayId);
  if (start < 0) return days.find(d => !state.week[d.id])?.id || null;
  for (let i = 1; i < days.length; i++) {
    const d = days[(start + i) % days.length];
    if (!state.week[d.id]) return d.id;
  }
  return null;
}

/* Gán món cho 1 ngày. Mỗi món chỉ nằm ở một ngày — bấm lại sẽ chuyển sang ngày đang chọn. */
function assignDish(dayId, dishId) {
  const dish = dishById(dishId);
  if (!dish) return;

  const slot = state.week[dayId];
  if (slot && slot.dishId === dishId) {
    state.week[dayId] = null;                     // bấm lại để bỏ món khỏi ngày
    state.activeDay = dayId;
    persist();
    renderAll();
    toast(`Đã bỏ ${dish.name} khỏi ${dayById(dayId).full}`);
    return;
  }

  const isNew = !slot;
  if (isNew && selectedCount() >= planDays()) {
    toast(`Gói "${currentPlan().label}" chỉ có ${planDays()} ngày. Hãy bỏ bớt ở ngày khác trước.`);
    return;
  }

  WEEKDAYS.forEach(day => {
    const s = state.week[day.id];
    if (s && s.dishId === dishId) state.week[day.id] = null;   // chuyển món sang ngày mới
  });
  state.week[dayId] = { dishId, servings: state.servings };

  // Tự nhảy sang ngày trống kế tiếp để khách chọn tiếp không phải bấm lại dải ngày
  const next = nextEmptyDay(dayId);
  if (next) state.activeDay = next;

  persist();
  renderAll();
  toast(`${dish.name} → ${dayById(dayId).full}${next ? ` · tiếp: ${dayById(next).label}` : ''}`);
}

function removeDish(day, dishId) {
  state.week[day] = null;
  persist();
  renderAll();
}

function setServings(n) {
  state.servings = n;
  WEEKDAYS.forEach(day => {
    const s = state.week[day.id];
    if (s) s.servings = n;
  });
  persist();
  renderAll();
}

function setPlan(id) {
  const before = selectedCount();
  state.plan = id;
  ensureWeek();
  persist();
  renderAll();
  const after = selectedCount();
  if (before > after) {
    toast(`Gói "${currentPlan().label}" chỉ gồm ${planDays()} ngày — đã bỏ bớt ${before - after} ngày.`);
  }
}

function setSkipped(v) {
  state.skipped = v;
  persist();
  renderAll();
  toast(v ? 'Đã bỏ qua tuần này.' : 'Chọn món cho tuần này nhé!');
}

function toast(msg) {
  const el = document.querySelector('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- Checkout ---------- */

function openCheckout() {
  if (!cartCount()) return;
  const items = weekItems();
  document.querySelector('#checkoutSummary').innerHTML = `
    <div class="co-summary__row"><span>Số ngày</span><strong>${items.length}</strong></div>
    <div class="co-summary__row"><span>Tạm tính</span><strong>${money(cartTotal())}</strong></div>
    <div class="co-summary__row"><span>Ưu đãi gói</span><strong>${currentPlan().discount ? '-' + Math.round(currentPlan().discount * 100) + '%' : '—'}</strong></div>
    <div class="co-summary__row"><span>Giao hàng</span><strong>${shippingFee() === 0 ? 'Miễn phí' : money(shippingFee())}</strong></div>
    <div class="co-summary__row co-summary__row--total"><span>Tổng cộng</span><strong>${money(cartGrandTotal())}</strong></div>`;
  document.querySelector('#checkoutModal').classList.add('open');
  document.querySelector('#checkoutForm').reset();
  document.querySelector('#checkoutSubmit').textContent = `Đặt hàng · ${money(cartGrandTotal())}`;
}

function submitOrder(e) {
  e.preventDefault();
  const f = e.target;
  const name = f.name.value.trim();
  const phone = f.phone.value.trim();
  const email = f.email.value.trim();
  const addr = f.address.value.trim();
  if (!name || !phone || !email || !addr) {
    toast('Vui lòng điền đủ họ tên, số điện thoại, Gmail và địa chỉ.');
    return;
  }
  if (!/^0\d{9,10}$/.test(phone.replace(/\s/g, ''))) {
    toast('Số điện thoại chưa hợp lệ.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Gmail chưa hợp lệ.');
    return;
  }
  const order = {
    id: 'MC' + Date.now().toString().slice(-8),
    name, phone, email, addr,
    note: f.note.value.trim(),
    date: f.date.value,
    time: f.time.value,
    items: weekItems().map(i => ({ day: i.dayLabel, dish: i.dish.name, servings: i.servings, total: i.total })),
    total: cartGrandTotal(),
    createdAt: new Date().toISOString(),
  };
  const orders = loadJSON(ORDERS_KEY, []);
  orders.unshift(order);
  saveJSON(ORDERS_KEY, orders);
  document.querySelector('#checkoutModal').classList.remove('open');
  document.querySelector('#cartDrawer').classList.remove('open');
  document.querySelector('#successModal').classList.remove('open');
  showSuccess(order);
  state.week = {};
  state.skipped = false;
  ensureWeek();
  persist();
  renderAll();
}

function showSuccess(order) {
  document.querySelector('#successBody').innerHTML = `
    <div class="success__icon">🎉</div>
    <h3>Đặt hàng thành công!</h3>
    <p class="muted">Mã đơn <strong>${order.id}</strong></p>
    <div class="success__rows">
      <div><span>Tên</span><strong>${order.name}</strong></div>
      <div><span>Số điện thoại</span><strong>${order.phone}</strong></div>
      <div><span>Gmail</span><strong>${order.email || '—'}</strong></div>
      <div><span>Giao đến</span><strong>${order.addr}</strong></div>
      <div><span>Ngày giao</span><strong>${order.date || '—'}</strong></div>
      <div><span>Giờ nhận</span><strong>${order.time || '—'}</strong></div>
      <div><span>Tổng</span><strong>${money(order.total)}</strong></div>
    </div>
    <p class="muted small">Bạn sẽ nhận được xác nhận qua điện thoại và Gmail trước khi đơn được chuẩn bị.</p>`;
  document.querySelector('#successModal').classList.add('open');
}

/* ---------- Khởi tạo ---------- */

function init() {
  const saved = loadJSON(STORE_KEY, null);
  if (saved) {
    state.week = saved.week || {};
    // Dữ liệu cũ lưu dạng { dayId: { dishId: servings } } — không dùng được nữa, bỏ đi
    Object.keys(state.week).forEach(id => {
      const v = state.week[id];
      if (!v || typeof v.dishId !== 'string') delete state.week[id];
    });
    state.plan = saved.plan || 'trial';
    state.servings = saved.servings || 2;
    state.skipped = !!saved.skipped;
  }
  ensureWeek();

  // FAQ
  document.querySelector('#faqList').innerHTML = FAQS.map(f => `
    <details class="faq-item">
      <summary>${f.q}</summary>
      <p>${f.a}</p>
    </details>`).join('');

  renderAll();

  /* Delegated events */
  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-day]');
    if (tab) {
      state.activeDay = tab.dataset.day;
      renderAll();
      // Mobile: cuộn xuống kho món để gán ngay
      if (window.innerWidth < 760) {
        document.querySelector('#menuGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const tag = e.target.closest('[data-tag]');
    if (tag) { state.activeTag = tag.dataset.tag; renderAll(); return; }

    const planBtn = e.target.closest('[data-plan]');
    if (planBtn) { setPlan(planBtn.dataset.plan); return; }

    const action = e.target.closest('[data-action]');
    if (action) {
      const id = action.dataset.id;
      if (action.dataset.action === 'pick') assignDish(state.activeDay, id);
      if (action.dataset.action === 'remove') removeDish(action.dataset.day, id);
      return;
    }

    const acc = e.target.closest('.faq-item summary');
    if (acc) {
      const item = acc.parentElement;
      document.querySelectorAll('.faq-item').forEach(el => { if (el !== item) el.open = false; });
    }
  });

  document.querySelector('#servingsToggle').addEventListener('click', () => {
    document.querySelector('#servingsMenu').classList.toggle('open');
  });

  document.querySelector('#servingsMenu').addEventListener('click', e => {
    const btn = e.target.closest('[data-servings]');
    if (!btn) return;
    setServings(parseInt(btn.dataset.servings, 10));
    document.querySelector('#servingsMenu').classList.remove('open');
  });

  document.querySelector('#skipWeek').addEventListener('click', () => setSkipped(!state.skipped));
  document.querySelector('#skipUndo').addEventListener('click', () => setSkipped(false));
  document.querySelector('#trackerCheckout').addEventListener('click', openCheckout);

  document.querySelector('#cartOpen').addEventListener('click', () => {
    document.querySelector('#cartDrawer').classList.add('open');
  });

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal, .drawer');
      if (modal) modal.classList.remove('open');
    });
  });

  document.querySelector('#checkoutForm').addEventListener('submit', submitOrder);
  document.querySelector('#checkoutOpen').addEventListener('click', openCheckout);

  document.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector(btn.dataset.scroll).scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Nhãn tuần hiện tại (tính theo ngày local, không dùng toISOString)
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = x => `${x.getDate()}/${x.getMonth() + 1}`;
  document.querySelector('#weekLabel').textContent = `Tuần ${fmt(start)} – ${fmt(end)}`;

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) document.querySelector('#cartDrawer').classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', init);
