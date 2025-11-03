/**
 * Cinema Server Configuration
 *
 * Add or remove servers here to dynamically update the UI.
 * Each server needs:
 * - id: unique identifier
 * - title: display name shown in UI
 * - getUrl: function that generates URL based on content type
 */

export interface CinemaServer {
  id: number;
  title: string;
  getUrl: (params: {
    id: string;
    type: 'movie' | 'tv';
    season?: number;
    episode?: number;
  }) => string;
}

export const CINEMA_SERVERS: CinemaServer[] = [
  {
    id: 1,
    title: 'VidFast',
    getUrl: ({id, type, season, episode}) =>
      type === 'movie'
        ? `https://vidfast.pro/movie/${id}?autoplay=true`
        : `https://vidfast.pro/tv/${id}/${season}/${episode}?autoplay=true`,
  },
  {
    id: 2,
    title: 'VidLink',
    getUrl: ({id, type, season, episode}) =>
      type === 'movie'
        ? `https://vidlink.pro/movie/${id}?autoplay=true`
        : `https://vidlink.pro/tv/${id}/${season}/${episode}?autoplay=true`,
  },
  {
    id: 3,
    title: 'Cinezo',
    getUrl: ({id, type, season, episode}) =>
      type === 'movie'
        ? `https://api.cinezo.net/embed/tmdb-movie-${id}?autoplay=true`
        : `https://api.cinezo.net/embed/tmdb-tv-${id}/${season}/${episode}?autoplay=true`,
  },
  {
    id: 4,
    title: 'Videasy',
    getUrl: ({id, type, season, episode}) =>
      type === 'movie'
        ? `https://player.videasy.net/movie/${id}?autoplay=true`
        : `https://player.videasy.net/tv/${id}/${season}/${episode}?autoplay=true`,
  },
  {
    id: 5,
    title: 'VidNest',
    getUrl: ({id, type, season, episode}) =>
      type === 'movie'
        ? `https://vidnest.fun/movie/${id}?autoplay=true`
        : `https://vidnest.fun/tv/${id}/${season}/${episode}?autoplay=true`,
  },
  {
    id: 6,
    title: 'Vidsrc',
    getUrl: ({id, type, season, episode}) =>
      type === 'movie'
        ? `https://vidsrc.cx/embed/movie/${id}?autoplay=true`
        : `https://vidsrc.cx/embed/tv/${id}/${season}/${episode}?autoplay=true`,
  },
  {
    id: 7,
    title: 'Vidzee',
    getUrl: ({id, type, season, episode}) =>
      type === 'movie'
        ? `https://player.vidzee.wtf/embed/movie/${id}?autoplay=true`
        : `https://player.vidzee.wtf/embed/tv/${id}/${season}/${episode}?autoplay=true`,
  },
  {
    id: 8,
    title: 'Rive',
    getUrl: ({id, type, season, episode}) =>
      type === 'movie'
        ? `https://rivestream.net/embed?type=movie&id=${id}&autoplay=true`
        : `https://rivestream.net/embed?type=tv&id=${id}&season=${season}&episode=${episode}`,
  },
];

/**
 * Get server by ID
 */
export const getServerById = (id: number): CinemaServer | undefined => {
  return CINEMA_SERVERS.find(server => server.id === id);
};

/**
 * Get server URL for specific content
 */
export const getServerUrl = (
  serverId: number,
  params: {
    id: string;
    type: 'movie' | 'tv';
    season?: number;
    episode?: number;
  },
): string | undefined => {
  const server = getServerById(serverId);
  return server?.getUrl(params);
};
