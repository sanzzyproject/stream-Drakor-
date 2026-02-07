import * as cheerio from 'cheerio';

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
};

function absUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `https://www.iq.com${url}`;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error('Network response was not ok');
  return res.text();
}

// Handler utama Vercel
export default async function handler(req, res) {
  const { query, url, type } = req.query;

  try {
    // 1. Mode Search
    if (type === 'search' && query) {
      const searchUrl = `https://www.iq.com/search?query=${encodeURIComponent(query)}`;
      const html = await fetchHtml(searchUrl);
      const $ = cheerio.load(html);
      const results = [];
      const seen = new Set();

      $('[data-id][data-chnid]').each((_, el) => {
        const root = $(el);
        const title = root.find('.detail .name').first().text().trim();
        const rawLink = root.find('.detail .name').attr('href');
        
        if (!title || !rawLink) return;

        const albumUrl = absUrl(rawLink);
        if (seen.has(albumUrl)) return;
        seen.add(albumUrl);

        const posterStyle = root.find('a.img').attr('style') || '';
        const posterMatch = posterStyle.match(/url\((.*?)\)/);
        const poster = posterMatch ? absUrl(posterMatch[1]) : 'https://via.placeholder.com/300x450?text=No+Poster';
        
        const score = root.find('.score').text().trim() || 'N/A';

        results.push({ title, albumUrl, poster, score });
      });

      return res.status(200).json({ success: true, data: results });
    }

    // 2. Mode Get Episodes (Detail)
    if (type === 'detail' && url) {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      
      // Ambil detail tambahan
      const desc = $('.desc').text().trim() || 'No description available.';
      const tags = [];
      $('.type-tag').each((_, el) => tags.push($(el).text().trim()));

      const map = new Map();
      
      // Cari episode
      $('a[href*="/play/"]').each((_, el) => {
        const a = $(el);
        const href = a.attr('href');
        if (!href) return;

        const epUrl = absUrl(href);
        if (map.has(epUrl)) return;

        const text = a.text().replace(/\s+/g, ' ').trim();
        const match = text.match(/(\d+)/);
        
        // Hanya ambil jika ada nomor episode
        if (!match) return; 

        const episodeNum = Number(match[1]);
        const img = a.find('img').attr('src');
        const thumbnail = img ? absUrl(img) : null;

        map.set(epUrl, {
          episode: episodeNum,
          title: `Episode ${episodeNum}`,
          url: epUrl,
          thumbnail
        });
      });

      const episodes = [...map.values()].sort((a, b) => a.episode - b.episode);
      
      return res.status(200).json({ 
        success: true, 
        data: { desc, tags, episodes } 
      });
    }

    // Default return
    return res.status(200).json({ message: 'Welcome to Dracin API. Use ?type=search&query=... or ?type=detail&url=...' });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
