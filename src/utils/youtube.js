const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeUrl(rawUrl) {
  const input = rawUrl.trim();
  if (!input) {
    return { ok: false, error: 'Pegá un link de YouTube antes de cargar.' };
  }

  const normalizedInput = /^https?:\/\//i.test(input) ? input : `https://${input}`;

  let url;
  try {
    url = new URL(normalizedInput);
  } catch {
    return { ok: false, error: 'El link no tiene un formato válido.' };
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '').replace(/^music\./, '');
  let videoId = '';

  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'watch') {
      videoId = url.searchParams.get('v') ?? '';
    } else if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
      videoId = pathParts[1] ?? '';
    }
  }

  if (!YOUTUBE_ID_PATTERN.test(videoId)) {
    return { ok: false, error: 'Solo se aceptan links válidos de YouTube.' };
  }

  return {
    ok: true,
    video: {
      videoId,
      inputUrl: input,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`
    }
  };
}

export function buildYouTubeEmbedUrl(zone) {
  if (!zone?.embedUrl) return '';

  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    controls: '1',
    autoplay: '1',
    mute: zone.muted ? '1' : '0'
  });

  return `${zone.embedUrl}?${params.toString()}`;
}
