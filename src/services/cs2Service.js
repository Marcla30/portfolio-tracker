const axios = require('axios');

const STEAM_INVENTORY_URL = 'https://steamcommunity.com/inventory';
const STEAM_VANITY_URL = 'https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001';
const STEAM_CDN = 'https://community.cloudflare.steamstatic.com/economy/image';

/**
 * Resolve a Steam profile URL to a Steam ID64
 * Supports:
 *   - https://steamcommunity.com/profiles/76561198XXXXXXXXX
 *   - https://steamcommunity.com/id/username
 */
async function resolveSteamId(profileUrl) {
  const trimmed = profileUrl.trim().replace(/\/$/, '');

  // Direct numeric profile URL
  const profileMatch = trimmed.match(/\/profiles\/(\d{17})/);
  if (profileMatch) {
    return profileMatch[1];
  }

  // Vanity URL (e.g. /id/username)
  const vanityMatch = trimmed.match(/\/id\/([^/]+)/);
  if (vanityMatch) {
    const vanityName = vanityMatch[1];

    // Prefer STEAM_API_KEY if available, otherwise fall back to XML profile page
    if (process.env.STEAM_API_KEY) {
      const res = await axios.get(STEAM_VANITY_URL, {
        params: { key: process.env.STEAM_API_KEY, vanityurl: vanityName },
        timeout: 10000
      });
      const data = res.data?.response;
      if (!data || data.success !== 1) {
        throw new Error(`Could not resolve Steam vanity URL: ${vanityName}`);
      }
      return data.steamid;
    }

    // No API key — use the public XML profile page (no key required)
    const xmlRes = await axios.get(`https://steamcommunity.com/id/${vanityName}/?xml=1`, {
      timeout: 10000
    });
    const match = xmlRes.data?.match(/<steamID64>(\d+)<\/steamID64>/);
    if (!match) {
      throw new Error(`Profil Steam introuvable ou privé : "${vanityName}"`);
    }
    return match[1];
  }

  throw new Error(
    'URL Steam invalide. Formats acceptés :\n' +
    'https://steamcommunity.com/profiles/76561198XXXXXXXXX\n' +
    'https://steamcommunity.com/id/username'
  );
}

/**
 * Fetch the CS2 inventory for a given Steam ID64
 * Returns: [{ marketHashName, count, iconUrl }]
 * Throws if inventory is private or empty
 *
 * Uses paginated requests (count=200 per page) because Steam rejects
 * very high count values (≥5000) with 400.
 */
async function fetchSteamInventory(steamId64) {
  const baseUrl = `${STEAM_INVENTORY_URL}/${steamId64}/730/2`;
  const PAGE_SIZE = 200;
  const MAX_PAGES = 15; // safety limit: 15 × 200 = 3000 items max

  const reqHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://steamcommunity.com/'
  };

  const allAssets = [];
  const allDescriptions = [];
  let startAssetId = undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    if (page > 0) {
      // Brief pause between pages to avoid Steam rate limiting
      await new Promise(r => setTimeout(r, 1500));
    }

    const params = { l: 'english', count: PAGE_SIZE };
    if (startAssetId) params.start_assetid = startAssetId;

    let res;
    try {
      res = await axios.get(baseUrl, { params, timeout: 15000, headers: reqHeaders });
    } catch (err) {
      const status = err.response?.status;
      console.error(`[CS2] Steam error ${status} for ${steamId64} (page ${page + 1})`);
      if (status === 403 || status === 401) {
        throw new Error('Steam inventory is private. Make sure your CS2 inventory is set to public in your Steam privacy settings.');
      }
      if (status === 400) {
        throw new Error('Inventaire privé ou inaccessible (Steam 400). Vérifie que ton inventaire CS2 est bien en "Public" dans les paramètres de confidentialité Steam.');
      }
      if (status === 429) {
        throw new Error('Steam rate-limit atteint. Réessaie dans quelques secondes.');
      }
      throw new Error(`Failed to fetch Steam inventory: ${err.message}`);
    }

    const data = res.data;
    if (!data || data.success === false || data.success === 0) {
      throw new Error('Steam inventory is private or not found.');
    }

    allAssets.push(...(data.assets || []));
    allDescriptions.push(...(data.descriptions || []));

    if (!data.more_items || !data.last_assetid) break;
    startAssetId = data.last_assetid;
  }

  // Build a lookup map: classid+instanceid → description
  const descMap = {};
  for (const desc of allDescriptions) {
    const key = `${desc.classid}_${desc.instanceid}`;
    descMap[key] = desc;
  }

  // Group assets by market_hash_name, cumulate counts
  const grouped = {};
  for (const asset of allAssets) {
    const key = `${asset.classid}_${asset.instanceid}`;
    const desc = descMap[key];
    if (!desc) continue;

    const name = desc.market_hash_name;
    if (!name) continue;

    if (!grouped[name]) {
      grouped[name] = {
        marketHashName: name,
        count: 0,
        iconUrl: desc.icon_url
          ? `${STEAM_CDN}/${desc.icon_url}/96fx96f`
          : null
      };
    }
    grouped[name].count += parseInt(asset.amount) || 1;
  }

  const skins = Object.values(grouped);

  if (skins.length === 0) {
    throw new Error('No CS2 items found in this inventory.');
  }

  return skins;
}

module.exports = { resolveSteamId, fetchSteamInventory };
