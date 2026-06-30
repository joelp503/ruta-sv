const app = document.getElementById('app');
const langBtn = document.getElementById('languageToggle');

const config = window.RUTA_SV_SUPABASE || {};
const supabaseClient = window.supabase?.createClient(config.url, config.anonKey);

const state = {
  lang: localStorage.getItem('rutaLang') || 'en',
  places: [],
  itineraries: [],
  events: [],
  submissions: [],
  user: null,
  isAdmin: false,
  adminLoading: false,
  loading: true,
  error: null,
  category: 'All',
  search: '',
};

const fallbackImage = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';

const t = {
  en: {
    homeTitle: 'Explore the best of El Salvador.',
    homeSubtitle: 'Discover trusted places to visit, eat, explore, and experience — from beaches and volcanoes to colorful towns, culture, and family-friendly adventures.',
    explore: 'Explore Places', itineraries: 'Itineraries', events: 'Events', submit: 'Submit Business', admin: 'Admin',
    featured: 'Featured places', categories: 'Browse by category', search: 'Search places, towns, food, beaches...',
    all: 'All', location: 'Location', price: 'Price', family: 'Family-friendly', details: 'View Details', save: 'Save', saved: 'Saved',
    submitTitle: 'Submit your business', submitSubtitle: 'Restaurants, tour guides, hotels, drivers, and experience providers can request to be listed on Ruta SV.',
    submitSuccess: 'Submission received. It is now saved in Supabase as pending review.',
    submitError: 'Something went wrong. Please confirm your Supabase policies allow public inserts into business_submissions.',
    maps: 'Open in Google Maps',
    noResults: 'No matching results yet. Try another search or category.',
  },
  es: {
    homeTitle: 'Explora lo mejor de El Salvador.',
    homeSubtitle: 'Descubre lugares confiables para visitar, comer y explorar — desde playas y volcanes hasta pueblos coloridos, cultura y aventuras familiares.',
    explore: 'Explorar Lugares', itineraries: 'Itinerarios', events: 'Eventos', submit: 'Registrar Negocio', admin: 'Admin',
    featured: 'Lugares destacados', categories: 'Buscar por categoría', search: 'Buscar lugares, pueblos, comida, playas...',
    all: 'Todos', location: 'Ubicación', price: 'Precio', family: 'Familiar', details: 'Ver Detalles', save: 'Guardar', saved: 'Guardado',
    submitTitle: 'Registra tu negocio', submitSubtitle: 'Restaurantes, guías turísticos, hoteles, conductores y proveedores de experiencias pueden solicitar aparecer en Ruta SV.',
    submitSuccess: 'Solicitud recibida. Ahora está guardada en Supabase como pendiente de revisión.',
    submitError: 'Algo salió mal. Confirma que Supabase permite inserciones públicas en business_submissions.',
    maps: 'Abrir en Google Maps',
    noResults: 'No hay resultados. Intenta otra búsqueda o categoría.',
  }
};

function copy(key) { return t[state.lang][key] || key; }
function route() { return location.hash.replace('#', '') || '/'; }
function money(value) { return value || '—'; }
function img(url) { return url || fallbackImage; }
function googleMapsUrl(place) {
  if (place?.google_maps_url) return place.google_maps_url;
  const query = [place?.name, place?.address || place?.location, 'El Salvador'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
function categories() { return ['All', ...new Set(state.places.map(p => p.category).filter(Boolean))]; }
function favorites() { return JSON.parse(localStorage.getItem('rutaFavorites') || '[]'); }
function isSaved(slug) { return favorites().includes(slug); }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function slugify(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function toggleFavorite(slug) {
  const current = favorites();
  const next = current.includes(slug) ? current.filter(x => x !== slug) : [...current, slug];
  localStorage.setItem('rutaFavorites', JSON.stringify(next));
  render();
}

async function loadData() {
  if (!supabaseClient) {
    state.error = 'Supabase client is not configured. Check supabase-config.js and internet connection.';
    state.loading = false;
    render();
    return;
  }
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    state.user = session?.user || null;
    await refreshAdminStatus(false);

    const [placesRes, itinerariesRes, eventsRes] = await Promise.all([
      supabaseClient.from('places').select('*').eq('status', 'published').order('is_featured', { ascending: false }).order('name'),
      supabaseClient.from('itineraries').select('*').eq('status', 'published').order('is_featured', { ascending: false }).order('title'),
      supabaseClient.from('events').select('*').eq('status', 'published').order('event_date'),
    ]);
    if (placesRes.error) throw placesRes.error;
    if (itinerariesRes.error) throw itinerariesRes.error;
    if (eventsRes.error) throw eventsRes.error;
    state.places = placesRes.data || [];
    state.itineraries = itinerariesRes.data || [];
    state.events = eventsRes.data || [];
  } catch (err) {
    console.error(err);
    state.error = err.message || 'Could not load Supabase data.';
  } finally {
    state.loading = false;
    render();
  }
}

async function refreshPublicData() {
  const [placesRes, itinerariesRes, eventsRes] = await Promise.all([
    supabaseClient.from('places').select('*').eq('status', 'published').order('is_featured', { ascending: false }).order('name'),
    supabaseClient.from('itineraries').select('*').eq('status', 'published').order('is_featured', { ascending: false }).order('title'),
    supabaseClient.from('events').select('*').eq('status', 'published').order('event_date'),
  ]);
  if (!placesRes.error) state.places = placesRes.data || [];
  if (!itinerariesRes.error) state.itineraries = itinerariesRes.data || [];
  if (!eventsRes.error) state.events = eventsRes.data || [];
}

async function refreshAdminStatus(renderAfter = true) {
  state.isAdmin = false;
  if (!state.user || !supabaseClient) return;
  const { data, error } = await supabaseClient.from('admin_users').select('id, email, role').eq('id', state.user.id).maybeSingle();
  if (!error && data) state.isAdmin = true;
  if (renderAfter) render();
}

async function loadAdminData() {
  if (!state.isAdmin) return;
  state.adminLoading = true;
  render();
  const [allPlaces, submissions] = await Promise.all([
    supabaseClient.from('places').select('*').order('created_at', { ascending: false }),
    supabaseClient.from('business_submissions').select('*').order('created_at', { ascending: false }),
  ]);
  state.adminLoading = false;
  if (allPlaces.error || submissions.error) {
    showAdminNotice(`Admin load error: ${(allPlaces.error || submissions.error).message}`, true);
    return;
  }
  state.adminPlaces = allPlaces.data || [];
  state.submissions = submissions.data || [];
  render();
}

function placeCard(place) {
  return `
    <article class="card">
      <div class="card-img" style="background-image:url('${escapeHtml(img(place.image_url))}')"></div>
      <div class="card-body">
        <div class="meta">
          <span class="badge">${escapeHtml(place.category || 'Place')}</span>
          ${place.is_featured ? '<span class="badge orange">Featured</span>' : ''}
          ${place.family_friendly ? `<span class="badge">${copy('family')}</span>` : ''}
        </div>
        <h3>${escapeHtml(place.name)}</h3>
        <p>${escapeHtml(place.short_description || '')}</p>
        <div class="card-footer">
          <a class="small-btn" href="#/place/${escapeHtml(place.slug)}">${copy('details')}</a>
          <button class="secondary-btn" type="button" onclick="toggleFavorite('${escapeHtml(place.slug)}')">${isSaved(place.slug) ? copy('saved') : copy('save')}</button>
        </div>
      </div>
    </article>
  `;
}

function itineraryCard(item) {
  const stops = Array.isArray(item.stops) ? item.stops : [];
  return `
    <article class="card">
      <div class="card-img" style="background-image:url('${escapeHtml(img(item.image_url))}')"></div>
      <div class="card-body">
        <div class="meta"><span class="badge">${escapeHtml(item.duration || 'Trip')}</span><span class="badge orange">${escapeHtml(item.difficulty || 'Easy')}</span><span class="badge">${escapeHtml(money(item.budget))}</span></div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description || '')}</p>
        ${stops.length ? `<ul>${stops.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}
        ${item.tips ? `<p><strong>Tip:</strong> ${escapeHtml(item.tips)}</p>` : ''}
      </div>
    </article>
  `;
}

function eventCard(event) {
  const date = event.event_date ? new Date(event.event_date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD';
  return `
    <article class="card">
      <div class="card-img" style="background-image:url('${escapeHtml(img(event.image_url))}')"></div>
      <div class="card-body">
        <div class="meta"><span class="badge">${escapeHtml(event.category || 'Event')}</span><span class="badge orange">${escapeHtml(date)}</span><span class="badge">${escapeHtml(event.price || 'Price TBD')}</span></div>
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.description || '')}</p>
        <div class="info-item"><strong>${escapeHtml(event.start_time || '')}</strong>${escapeHtml(event.location || '')}</div>
      </div>
    </article>
  `;
}

function filteredPlaces() {
  const q = state.search.trim().toLowerCase();
  return state.places.filter(p => {
    const categoryOk = state.category === 'All' || p.category === state.category;
    const haystack = [p.name, p.category, p.location, p.department, p.short_description, p.full_description].join(' ').toLowerCase();
    const searchOk = !q || haystack.includes(q);
    return categoryOk && searchOk;
  });
}

function renderHome() {
  const featured = state.places.filter(p => p.is_featured).slice(0, 3);
  return `
    <section class="hero">
      <div class="hero-card hero-copy">
        <span class="kicker">El Salvador Travel Guide</span>
        <h1>${copy('homeTitle')}</h1>
        <p>${copy('homeSubtitle')}</p>
        <div class="hero-actions">
          <a class="primary-btn" href="#/explore">${copy('explore')}</a>
          <a class="secondary-btn" href="#/submit">${copy('submit')}</a>
        </div>
      </div>
      <div class="hero-card hero-visual">
        <div class="float-card">
          <strong>Explore with confidence</strong>
          <p>Find beaches, volcanoes, colorful towns, food spots, culture, and family-friendly experiences across El Salvador.</p>
        </div>
      </div>
    </section>
    <section class="stats-grid">
      <div class="stat"><strong>${state.places.length}</strong><span>Places</span></div>
      <div class="stat"><strong>${state.itineraries.length}</strong><span>Itineraries</span></div>
      <div class="stat"><strong>${state.events.length}</strong><span>Events</span></div>
    </section>
    <div class="section-head"><div><span class="kicker">Explore</span><h2>${copy('featured')}</h2></div><a href="#/explore">View all →</a></div>
    <section class="grid three">${featured.map(placeCard).join('') || '<div class="empty">No featured places yet.</div>'}</section>
    <div class="section-head"><div><span class="kicker">Routes</span><h2>${copy('itineraries')}</h2></div><a href="#/itineraries">View all →</a></div>
    <section class="grid three">${state.itineraries.slice(0,3).map(itineraryCard).join('')}</section>
  `;
}


function renderExploreResults() {
  const list = filteredPlaces();
  return list.length ? list.map(placeCard).join('') : `<div class="empty">${copy('noResults')}</div>`;
}

function updateExploreResults() {
  const results = document.getElementById('exploreResults');
  if (results) results.innerHTML = renderExploreResults();
}

function renderExplore() {
  return `
    <section class="panel hero-copy">
      <span class="kicker">Directory</span>
      <h2>${copy('explore')}</h2>
      <p>Search and filter the live places currently stored in Supabase.</p>
      <div class="filters">
        <input id="searchInput" class="input" value="${escapeHtml(state.search)}" placeholder="${copy('search')}" />
        <select id="categorySelect" class="select">
          ${categories().map(cat => `<option value="${escapeHtml(cat)}" ${state.category === cat ? 'selected' : ''}>${cat === 'All' ? copy('all') : escapeHtml(cat)}</option>`).join('')}
        </select>
        <button id="clearFilters" class="secondary-btn" type="button">Clear</button>
      </div>
    </section>
    <div class="category-row">
      ${categories().map(cat => `<button class="chip ${state.category === cat ? 'active' : ''}" data-category="${escapeHtml(cat)}">${cat === 'All' ? copy('all') : escapeHtml(cat)}</button>`).join('')}
    </div>
    <section id="exploreResults" class="grid three">${renderExploreResults()}</section>
  `;
}

function renderPlace(slug) {
  const place = state.places.find(p => p.slug === slug) || (state.adminPlaces || []).find(p => p.slug === slug);
  if (!place) return `<div class="empty">Place not found. <a href="#/explore">Back to Explore</a></div>`;
  return `
    <section class="detail-hero" style="background-image:url('${escapeHtml(img(place.image_url))}')">
      <div class="detail-title">
        <div class="meta"><span class="badge">${escapeHtml(place.category)}</span>${place.family_friendly ? `<span class="badge">${copy('family')}</span>` : ''}</div>
        <h1>${escapeHtml(place.name)}</h1>
        <p>${escapeHtml(place.location || '')}</p>
      </div>
    </section>
    <section class="detail-layout">
      <article class="panel hero-copy">
        <span class="kicker">About</span>
        <h2>${escapeHtml(place.name)}</h2>
        <p>${escapeHtml(place.full_description || place.short_description || '')}</p>
        <div class="hero-actions">
          ${place.website ? `<a class="primary-btn" href="${escapeHtml(place.website)}" target="_blank" rel="noopener">Website</a>` : ''}
          ${place.whatsapp ? `<a class="primary-btn" href="https://wa.me/${String(place.whatsapp).replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          <a class="primary-btn" href="${escapeHtml(googleMapsUrl(place))}" target="_blank" rel="noopener">${copy('maps')}</a>
          <button class="secondary-btn" type="button" onclick="toggleFavorite('${escapeHtml(place.slug)}')">${isSaved(place.slug) ? copy('saved') : copy('save')}</button>
        </div>
      </article>
      <aside class="info-list">
        <div class="info-item"><strong>${copy('location')}</strong>${escapeHtml(place.address || place.location || '—')}<br><a href="${escapeHtml(googleMapsUrl(place))}" target="_blank" rel="noopener">${copy('maps')} →</a></div>
        <div class="info-item"><strong>${copy('price')}</strong>${escapeHtml(place.price_range || '—')}</div>
        <div class="info-item"><strong>Hours</strong>${escapeHtml(place.hours || '—')}</div>
        <div class="info-item"><strong>Best time</strong>${escapeHtml(place.best_time_to_visit || '—')}</div>
        <div class="info-item"><strong>Parking</strong>${escapeHtml(place.parking_info || '—')}</div>
        <div class="info-item"><strong>Safety tips</strong>${escapeHtml(place.safety_tips || '—')}</div>
      </aside>
    </section>
  `;
}

function renderItineraries() {
  return `
    <section class="panel hero-copy"><span class="kicker">Trip planner</span><h2>${copy('itineraries')}</h2><p>Curated routes for first-time visitors, families, and Salvadorans abroad.</p></section>
    <section class="grid three">${state.itineraries.map(itineraryCard).join('') || '<div class="empty">No itineraries yet.</div>'}</section>
  `;
}

function renderEvents() {
  return `
    <section class="panel hero-copy"><span class="kicker">What is happening</span><h2>${copy('events')}</h2><p>Sample event records are loaded from Supabase. Later this can become a real local events calendar.</p></section>
    <section class="grid three">${state.events.map(eventCard).join('') || '<div class="empty">No events yet.</div>'}</section>
  `;
}

function renderSubmit() {
  return `
    <section class="panel hero-copy">
      <span class="kicker">Business owners</span>
      <h2>${copy('submitTitle')}</h2>
      <p>${copy('submitSubtitle')}</p>
      <div id="formNotice"></div>
      <form id="businessForm" class="form-grid">
        <input class="input" name="business_name" placeholder="Business name *" required />
        <select class="select" name="category">
          <option>Restaurant</option><option>Coffee Shop</option><option>Tour Guide</option><option>Hotel</option><option>Transportation</option><option>Activity</option><option>Event Organizer</option><option>Other</option>
        </select>
        <input class="input" name="contact_name" placeholder="Contact name" />
        <input class="input" name="email" type="email" placeholder="Email" />
        <input class="input" name="phone" placeholder="Phone" />
        <input class="input" name="whatsapp" placeholder="WhatsApp" />
        <input class="input full" name="address" placeholder="Address / Location" />
        <input class="input full" name="website" placeholder="Website" />
        <input class="input full" name="social_media" placeholder="Instagram / Facebook / TikTok" />
        <textarea class="full" name="description" rows="5" placeholder="Briefly describe your business"></textarea>
        <label class="full"><input type="checkbox" name="featured_interest" /> Interested in paid featured placement later</label>
        <button class="primary-btn" type="submit">Send Submission</button>
      </form>
    </section>
    <div class="footer-note"><strong>Admin note:</strong> submissions are inserted into the <code>business_submissions</code> table with <code>status = pending</code>.</div>
  `;
}

function renderAdminLogin() {
  return `
    <section class="panel hero-copy admin-panel">
      <span class="kicker">Ruta SV Admin</span>
      <h2>Admin login</h2>
      <p>Use the email/password account you create in Supabase Auth. After you sign up, run the admin SQL step in the README to approve your email as an admin.</p>
      <div id="adminNotice"></div>
      <form id="adminLoginForm" class="form-grid">
        <input class="input full" name="email" type="email" placeholder="Admin email" required />
        <input class="input full" name="password" type="password" placeholder="Password" required />
        <button class="primary-btn" name="mode" value="login" type="submit">Log In</button>
        <button class="secondary-btn" name="mode" value="signup" type="submit">Create Admin Account</button>
      </form>
      <div class="footer-note"><strong>Important:</strong> creating an account does not automatically make it an admin. You must add the user to <code>admin_users</code> in Supabase once.</div>
    </section>
  `;
}

function adminPlaceRows() {
  const places = state.adminPlaces || [];
  if (!places.length) return '<div class="empty">No places found.</div>';
  return places.map(p => `
    <article class="admin-row">
      <img src="${escapeHtml(img(p.image_url))}" alt="" />
      <div>
        <strong>${escapeHtml(p.name)}</strong>
        <span>${escapeHtml(p.category || 'Place')} · ${escapeHtml(p.status || 'published')} · ${p.is_featured ? 'Featured' : 'Not featured'}</span>
      </div>
      <div class="admin-actions">
        <button class="small-btn edit-place-btn" data-id="${escapeHtml(p.id)}">Edit</button>
        <button class="secondary-btn hide-place-btn" data-id="${escapeHtml(p.id)}">${p.status === 'published' ? 'Hide' : 'Publish'}</button>
      </div>
    </article>
  `).join('');
}

function adminSubmissionRows() {
  const submissions = state.submissions || [];
  if (!submissions.length) return '<div class="empty">No business submissions yet.</div>';
  return submissions.map(s => `
    <article class="admin-row wide">
      <div>
        <strong>${escapeHtml(s.business_name)}</strong>
        <span>${escapeHtml(s.category || 'Business')} · ${escapeHtml(s.status || 'pending')} · ${escapeHtml(s.email || '')} ${escapeHtml(s.phone || '')}</span>
        <p>${escapeHtml(s.description || '')}</p>
      </div>
      <div class="admin-actions">
        <button class="small-btn copy-submission-btn" data-id="${escapeHtml(s.id)}">Use for Place</button>
        <button class="secondary-btn mark-submission-btn" data-id="${escapeHtml(s.id)}" data-status="approved">Approve</button>
        <button class="secondary-btn mark-submission-btn" data-id="${escapeHtml(s.id)}" data-status="rejected">Reject</button>
      </div>
    </article>
  `).join('');
}

function renderPlaceForm(place = {}) {
  return `
    <form id="adminPlaceForm" class="form-grid admin-form" data-id="${escapeHtml(place.id || '')}">
      <input class="input" name="name" placeholder="Place name *" value="${escapeHtml(place.name || '')}" required />
      <input class="input" name="slug" placeholder="slug-auto-generated-if-blank" value="${escapeHtml(place.slug || '')}" />
      <select class="select" name="category">
        ${['Beach','Adventure','Culture','Lake','Towns','Restaurant','Coffee','Family','Nightlife','Hotel','Transportation','Other'].map(c => `<option ${place.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <select class="select" name="status">
        ${['published','draft','hidden'].map(c => `<option ${place.status === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <input class="input" name="location" placeholder="Location" value="${escapeHtml(place.location || '')}" />
      <input class="input" name="department" placeholder="Department" value="${escapeHtml(place.department || '')}" />
      <input class="input full" name="address" placeholder="Address" value="${escapeHtml(place.address || '')}" />
      <input class="input full" name="google_maps_url" placeholder="Google Maps URL" value="${escapeHtml(place.google_maps_url || '')}" />
      <input class="input full" name="image_url" placeholder="Image URL" value="${escapeHtml(place.image_url || '')}" />
      <input class="input" name="phone" placeholder="Phone" value="${escapeHtml(place.phone || '')}" />
      <input class="input" name="whatsapp" placeholder="WhatsApp" value="${escapeHtml(place.whatsapp || '')}" />
      <input class="input" name="website" placeholder="Website" value="${escapeHtml(place.website || '')}" />
      <input class="input" name="instagram" placeholder="Instagram" value="${escapeHtml(place.instagram || '')}" />
      <input class="input" name="hours" placeholder="Hours" value="${escapeHtml(place.hours || '')}" />
      <input class="input" name="price_range" placeholder="Price range, ex: $, $$" value="${escapeHtml(place.price_range || '')}" />
      <input class="input" name="best_time_to_visit" placeholder="Best time to visit" value="${escapeHtml(place.best_time_to_visit || '')}" />
      <input class="input" name="parking_info" placeholder="Parking info" value="${escapeHtml(place.parking_info || '')}" />
      <textarea class="full" name="short_description" rows="3" placeholder="Short description">${escapeHtml(place.short_description || '')}</textarea>
      <textarea class="full" name="full_description" rows="5" placeholder="Full description">${escapeHtml(place.full_description || '')}</textarea>
      <textarea class="full" name="safety_tips" rows="3" placeholder="Safety/practical tips">${escapeHtml(place.safety_tips || '')}</textarea>
      <label><input type="checkbox" name="family_friendly" ${place.family_friendly ? 'checked' : ''} /> Family-friendly</label>
      <label><input type="checkbox" name="is_featured" ${place.is_featured ? 'checked' : ''} /> Featured</label>
      <button class="primary-btn" type="submit">${place.id ? 'Save Place' : 'Add Place'}</button>
      <button class="secondary-btn" id="clearPlaceForm" type="button">Clear Form</button>
    </form>
  `;
}

function renderAdminDashboard() {
  return `
    <section class="panel hero-copy admin-panel">
      <div class="section-head no-margin">
        <div><span class="kicker">Ruta SV Admin</span><h2>Dashboard</h2><p>Logged in as ${escapeHtml(state.user?.email || '')}</p></div>
        <button id="adminLogout" class="secondary-btn" type="button">Log Out</button>
      </div>
      <div id="adminNotice"></div>
      ${state.adminLoading ? '<div class="loading">Loading admin data...</div>' : ''}
    </section>
    <section class="admin-grid">
      <div class="panel hero-copy">
        <span class="kicker">Add / Edit</span>
        <h2>Place listing</h2>
        <p>Use this form to add listings or update images/details.</p>
        ${renderPlaceForm(state.editingPlace || {})}
      </div>
      <div class="panel hero-copy">
        <span class="kicker">Submissions</span>
        <h2>Business requests</h2>
        <p>Review incoming business submissions and mark them approved or rejected.</p>
        <div class="admin-list">${adminSubmissionRows()}</div>
      </div>
    </section>
    <section class="panel hero-copy">
      <span class="kicker">Content</span>
      <h2>Manage places</h2>
      <div class="admin-list">${adminPlaceRows()}</div>
    </section>
  `;
}

function renderAdmin() {
  if (!state.user) return renderAdminLogin();
  if (!state.isAdmin) {
    return `
      <section class="panel hero-copy admin-panel">
        <span class="kicker">Ruta SV Admin</span>
        <h2>Account created, but not approved yet</h2>
        <p>You are logged in as <strong>${escapeHtml(state.user.email)}</strong>, but this user is not in the <code>admin_users</code> table yet.</p>
        <p>Go to Supabase SQL Editor and run the approval script from the README using this email address.</p>
        <div class="hero-actions"><button id="adminLogout" class="secondary-btn" type="button">Log Out</button></div>
      </section>
    `;
  }
  return renderAdminDashboard();
}

function showAdminNotice(message, isError = false) {
  const notice = document.getElementById('adminNotice');
  if (notice) notice.innerHTML = `<div class="notice ${isError ? 'error' : ''}">${escapeHtml(message)}</div>`;
}

function render() {
  langBtn.textContent = state.lang === 'en' ? 'ES' : 'EN';
  if (state.loading) { app.innerHTML = '<div class="loading">Loading Ruta SV from Supabase...</div>'; return; }
  if (state.error) { app.innerHTML = `<div class="notice error">${escapeHtml(state.error)}</div>`; return; }

  const current = route();
  if (current.startsWith('/place/')) app.innerHTML = renderPlace(current.split('/place/')[1]);
  else if (current === '/explore') app.innerHTML = renderExplore();
  else if (current === '/itineraries') app.innerHTML = renderItineraries();
  else if (current === '/events') app.innerHTML = renderEvents();
  else if (current === '/submit') app.innerHTML = renderSubmit();
  else if (current === '/admin') app.innerHTML = renderAdmin();
  else app.innerHTML = renderHome();

  bindPageEvents();
}

function bindPageEvents() {
  document.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => { state.category = btn.dataset.category; render(); });
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.addEventListener('input', e => { state.search = e.target.value; updateExploreResults(); });
  const categorySelect = document.getElementById('categorySelect');
  if (categorySelect) categorySelect.addEventListener('change', e => { state.category = e.target.value; render(); });
  const clearFilters = document.getElementById('clearFilters');
  if (clearFilters) clearFilters.addEventListener('click', () => { state.search = ''; state.category = 'All'; render(); });

  const form = document.getElementById('businessForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const notice = document.getElementById('formNotice');
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.featured_interest = formData.get('featured_interest') === 'on';
      payload.status = 'pending';
      const { error } = await supabaseClient.from('business_submissions').insert(payload);
      if (error) {
        console.error(error);
        notice.innerHTML = `<div class="notice error">${copy('submitError')} Error: ${escapeHtml(error.message)}</div>`;
      } else {
        notice.innerHTML = `<div class="notice">${copy('submitSuccess')}</div>`;
        form.reset();
      }
    });
  }

  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitter = e.submitter?.value || 'login';
      const formData = new FormData(adminLoginForm);
      const email = formData.get('email');
      const password = formData.get('password');
      showAdminNotice(submitter === 'signup' ? 'Creating account...' : 'Logging in...');
      const res = submitter === 'signup'
        ? await supabaseClient.auth.signUp({ email, password })
        : await supabaseClient.auth.signInWithPassword({ email, password });
      if (res.error) return showAdminNotice(res.error.message, true);
      state.user = res.data.user || res.data.session?.user || null;
      await refreshAdminStatus(false);
      if (state.isAdmin) await loadAdminData();
      else render();
    });
  }

  const adminLogout = document.getElementById('adminLogout');
  if (adminLogout) adminLogout.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    state.user = null;
    state.isAdmin = false;
    state.submissions = [];
    state.adminPlaces = [];
    state.editingPlace = null;
    render();
  });

  const placeForm = document.getElementById('adminPlaceForm');
  if (placeForm) {
    placeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(placeForm);
      const id = placeForm.dataset.id;
      const name = formData.get('name');
      const payload = Object.fromEntries(formData.entries());
      payload.slug = payload.slug ? slugify(payload.slug) : slugify(name);
      payload.family_friendly = formData.get('family_friendly') === 'on';
      payload.is_featured = formData.get('is_featured') === 'on';
      delete payload.id;
      Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null; });
      const res = id
        ? await supabaseClient.from('places').update(payload).eq('id', id)
        : await supabaseClient.from('places').insert(payload);
      if (res.error) return showAdminNotice(`Save failed: ${res.error.message}`, true);
      state.editingPlace = null;
      showAdminNotice('Place saved successfully.');
      await refreshPublicData();
      await loadAdminData();
    });
  }

  const clearPlaceForm = document.getElementById('clearPlaceForm');
  if (clearPlaceForm) clearPlaceForm.addEventListener('click', () => { state.editingPlace = null; render(); });

  document.querySelectorAll('.edit-place-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editingPlace = (state.adminPlaces || []).find(p => p.id === btn.dataset.id) || null;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.hide-place-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const place = (state.adminPlaces || []).find(p => p.id === btn.dataset.id);
      if (!place) return;
      const nextStatus = place.status === 'published' ? 'hidden' : 'published';
      const { error } = await supabaseClient.from('places').update({ status: nextStatus }).eq('id', place.id);
      if (error) return showAdminNotice(`Status update failed: ${error.message}`, true);
      await refreshPublicData();
      await loadAdminData();
    });
  });

  document.querySelectorAll('.mark-submission-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await supabaseClient.from('business_submissions').update({ status: btn.dataset.status }).eq('id', btn.dataset.id);
      if (error) return showAdminNotice(`Submission update failed: ${error.message}`, true);
      await loadAdminData();
    });
  });

  document.querySelectorAll('.copy-submission-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = (state.submissions || []).find(x => x.id === btn.dataset.id);
      if (!s) return;
      state.editingPlace = {
        name: s.business_name,
        slug: slugify(s.business_name),
        category: s.category || 'Other',
        short_description: s.description || '',
        full_description: s.description || '',
        address: s.address || '',
        location: s.address || '',
        phone: s.phone || '',
        whatsapp: s.whatsapp || '',
        website: s.website || '',
        google_maps_url: '',
        instagram: s.social_media || '',
        status: 'draft',
      };
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

langBtn.addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'es' : 'en';
  localStorage.setItem('rutaLang', state.lang);
  render();
});

supabaseClient?.auth.onAuthStateChange(async (_event, session) => {
  state.user = session?.user || null;
  await refreshAdminStatus(false);
  if (route() === '/admin' && state.isAdmin) await loadAdminData();
  else if (route() === '/admin') render();
});

window.addEventListener('hashchange', async () => {
  if (route() === '/admin' && state.isAdmin && !(state.adminPlaces || []).length) await loadAdminData();
  else render();
});

loadData();
