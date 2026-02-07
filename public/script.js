const API_BASE = '/api';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const movieGrid = document.getElementById('movieGrid');
const loader = document.getElementById('loader');
const sectionTitle = document.getElementById('sectionTitle');

// Player DOM
const playerSection = document.getElementById('playerSection');
const mainContent = document.getElementById('mainContent');
const closePlayerBtn = document.getElementById('closePlayer');
const playerTitle = document.getElementById('playerTitle');
const mainPlayer = document.getElementById('mainPlayer');
const episodeList = document.getElementById('episodeList');
const fallbackOverlay = document.getElementById('fallbackOverlay');
const directLink = document.getElementById('directLink');

// --- Functions ---

async function fetchMovies(query) {
  showLoader(true);
  try {
    const res = await fetch(`${API_BASE}?type=search&query=${encodeURIComponent(query)}`);
    const json = await res.json();
    renderMovies(json.data);
    sectionTitle.innerText = `Hasil pencarian: "${query}"`;
  } catch (err) {
    console.error(err);
    movieGrid.innerHTML = '<p style="text-align:center; width:100%">Gagal memuat data.</p>';
  }
  showLoader(false);
}

// Initial Load (Rekomendasi default)
fetchMovies('Love'); // Keyword default agar halaman tidak kosong

function showLoader(show) {
  if (show) {
    loader.classList.remove('hidden');
    movieGrid.innerHTML = '';
  } else {
    loader.classList.add('hidden');
  }
}

function renderMovies(movies) {
  if (!movies || movies.length === 0) {
    movieGrid.innerHTML = '<p>Tidak ditemukan.</p>';
    return;
  }
  
  movieGrid.innerHTML = movies.map(movie => `
    <div class="movie-card" onclick="openDetail('${movie.albumUrl}', '${movie.title.replace(/'/g, "\\'")}')">
      <div class="poster-wrapper">
        <img src="${movie.poster}" alt="${movie.title}" loading="lazy">
        <span class="score-badge">${movie.score}</span>
      </div>
      <div class="card-info">
        <h3>${movie.title}</h3>
      </div>
    </div>
  `).join('');
}

// --- Detail & Player Logic ---

window.openDetail = async function(url, title) {
  // Switch View
  mainContent.classList.add('hidden');
  playerSection.classList.remove('hidden');
  window.scrollTo(0,0);
  
  playerTitle.innerText = title;
  episodeList.innerHTML = '<div class="loader"></div>';
  mainPlayer.src = ''; // Clear previous
  fallbackOverlay.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}?type=detail&url=${encodeURIComponent(url)}`);
    const json = await res.json();
    
    if (json.success) {
      document.getElementById('movieDesc').innerText = json.data.desc;
      
      const tagsHtml = json.data.tags.map(t => `<span style="margin-right:10px; color:var(--primary)">#${t}</span>`).join('');
      document.getElementById('metaTags').innerHTML = tagsHtml;

      renderEpisodes(json.data.episodes);
      
      // Auto play episode 1 jika ada
      if (json.data.episodes.length > 0) {
        playEpisode(json.data.episodes[0].url);
      }
    }
  } catch (err) {
    episodeList.innerHTML = 'Gagal memuat episode.';
  }
};

function renderEpisodes(episodes) {
  episodeList.innerHTML = episodes.map((ep, index) => `
    <button class="ep-btn ${index === 0 ? 'active' : ''}" 
      onclick="playEpisode('${ep.url}', this)">
      ${ep.episode}
    </button>
  `).join('');
}

window.playEpisode = function(url, btnElement) {
  // Highlight active button
  if (btnElement) {
    document.querySelectorAll('.ep-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
  }

  // NOTE: iQiyi memblokir embedding iframe (x-frame-options).
  // Kita coba load iQiyi mobile version, tapi jika gagal, tampilkan tombol fallback.
  // URL mobile iQiyi biasanya lebih ramah iframe, atau kita redirect.
  
  // Mengganti www ke m.iq.com kadang membantu, tapi tidak selalu.
  const mobileUrl = url.replace('www.iq.com', 'm.iq.com');
  
  mainPlayer.src = url; // Coba load langsung
  
  // Setup Fallback link
  directLink.href = url;
  
  // Tampilkan overlay fallback jika user merasa error (karena kita tidak bisa detect x-frame error via JS cross-origin)
  // Kita tampilkan tombol fallback secara default setelah 3 detik sebagai opsi
  setTimeout(() => {
    fallbackOverlay.classList.remove('hidden');
  }, 2000);
};

// Close Player
closePlayerBtn.addEventListener('click', () => {
  playerSection.classList.add('hidden');
  mainContent.classList.remove('hidden');
  mainPlayer.src = ''; // Stop video
});

// Search Event
searchBtn.addEventListener('click', () => {
  const q = searchInput.value;
  if(q) fetchMovies(q);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});
