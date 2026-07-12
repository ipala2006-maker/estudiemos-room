const SPOTIFY_SUPPORTED_TYPES = {
  track: 'Cancion',
  album: 'Album',
  playlist: 'Playlist',
  show: 'Podcast',
  episode: 'Episodio',
  artist: 'Artista'
};

const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{12,32}$/;

export function parseSpotifyUrl(inputValue) {
  const input = String(inputValue ?? '').trim();
  if (!input) {
    return { ok: false, error: 'Pega un link de Spotify.' };
  }

  const uriMatch = input.match(/^spotify:(track|album|playlist|show|episode|artist):([A-Za-z0-9]+)$/i);
  if (uriMatch) {
    return buildSpotifyResult(uriMatch[1].toLowerCase(), uriMatch[2], input);
  }

  let url;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, error: 'El link no parece una URL valida de Spotify.' };
  }

  if (url.hostname !== 'open.spotify.com') {
    return { ok: false, error: 'Usa un link de open.spotify.com.' };
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const embedIndex = parts[0] === 'embed' ? 1 : 0;
  const directType = parts[embedIndex];
  const localizedType = parts[embedIndex + 1];
  const type = SPOTIFY_SUPPORTED_TYPES[directType] ? directType : localizedType;
  const id = SPOTIFY_SUPPORTED_TYPES[directType] ? parts[embedIndex + 1] : parts[embedIndex + 2];

  return buildSpotifyResult(type, id, input);
}

export function isSpotifyContent(zone) {
  return zone?.contentType === 'spotify' && Boolean(zone?.resourceUrl);
}

function buildSpotifyResult(type, id, originalUrl) {
  if (!SPOTIFY_SUPPORTED_TYPES[type]) {
    return { ok: false, error: 'Soporta canciones, playlists, albumes, artistas, podcasts y episodios.' };
  }

  const cleanId = String(id ?? '').split('?')[0].trim();
  if (!SPOTIFY_ID_PATTERN.test(cleanId)) {
    return { ok: false, error: 'No pude leer el ID de Spotify del link.' };
  }

  const embedUrl = `https://open.spotify.com/embed/${type}/${cleanId}?utm_source=estudiemos-room&theme=0`;
  const watchUrl = `https://open.spotify.com/${type}/${cleanId}`;

  return {
    ok: true,
    item: {
      type,
      id: cleanId,
      label: SPOTIFY_SUPPORTED_TYPES[type],
      inputUrl: originalUrl,
      watchUrl,
      embedUrl,
      title: `Spotify - ${SPOTIFY_SUPPORTED_TYPES[type]}`
    }
  };
}
