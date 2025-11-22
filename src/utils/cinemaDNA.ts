import {RealmHistoryManager} from '../database/managers';

export interface CinemaDNA {
  totalFilms: number;
  topPerson: {
    name: string;
    type: 'director' | 'actor' | 'composer' | 'cinematographer';
    count: number;
    id: number;
    profile_path?: string;
  };
  otherTop: Array<{
    name: string;
    type: string;
    count: number;
    id: number;
    profile_path?: string;
  }>;
  counts: {
    directors: number;
    actors: number;
    composers: number;
    cinematographers: number;
  };
}

export const getCinemaDNA = async (): Promise<CinemaDNA | null> => {
  try {
    const history = await RealmHistoryManager.getAll();

    if (history.length === 0) {
      return null;
    }

    // Collect all crew members
    const allCrew: Map<
      number,
      {
        name: string;
        type: 'director' | 'actor' | 'composer' | 'cinematographer';
        count: number;
        id: number;
        profile_path?: string;
      }
    > = new Map();

    const counts = {
      directors: new Set<number>(),
      actors: new Set<number>(),
      composers: new Set<number>(),
      cinematographers: new Set<number>(),
    };

    history.forEach(item => {
      // Directors
      if (item.directors) {
        try {
          const directors = JSON.parse(item.directors);
          directors.forEach((d: any) => {
            counts.directors.add(d.id);
            const existing = allCrew.get(d.id) || {
              name: d.name,
              type: 'director' as const,
              count: 0,
              id: d.id,
              profile_path: d.profile_path,
            };
            existing.count++;
            allCrew.set(d.id, existing);
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }

      // Actors
      if (item.cast) {
        try {
          const cast = JSON.parse(item.cast);
          cast.slice(0, 3).forEach((c: any) => {
            // Top 3 actors per film
            counts.actors.add(c.id);
            const existing = allCrew.get(c.id) || {
              name: c.name,
              type: 'actor' as const,
              count: 0,
              id: c.id,
              profile_path: c.profile_path,
            };
            existing.count++;
            allCrew.set(c.id, existing);
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }

      // Composers
      if (item.composer) {
        try {
          const composers = JSON.parse(item.composer);
          if (Array.isArray(composers)) {
            composers.forEach((c: any) => {
              counts.composers.add(c.id);
              const existing = allCrew.get(c.id) || {
                name: c.name,
                type: 'composer' as const,
                count: 0,
                id: c.id,
                profile_path: c.profile_path,
              };
              existing.count++;
              allCrew.set(c.id, existing);
            });
          } else if (composers && composers.id) {
            // Single composer object
            counts.composers.add(composers.id);
            const existing = allCrew.get(composers.id) || {
              name: composers.name,
              type: 'composer' as const,
              count: 0,
              id: composers.id,
              profile_path: composers.profile_path,
            };
            existing.count++;
            allCrew.set(composers.id, existing);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

      // Cinematographers
      if (item.cinematographer) {
        try {
          const cinematographer = JSON.parse(item.cinematographer);
          if (cinematographer && cinematographer.id) {
            counts.cinematographers.add(cinematographer.id);
            const existing = allCrew.get(cinematographer.id) || {
              name: cinematographer.name,
              type: 'cinematographer' as const,
              count: 0,
              id: cinematographer.id,
              profile_path: cinematographer.profile_path,
            };
            existing.count++;
            allCrew.set(cinematographer.id, existing);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });

    // Sort by count
    const sortedCrew = Array.from(allCrew.values()).sort(
      (a, b) => b.count - a.count,
    );

    if (sortedCrew.length === 0) {
      return null;
    }

    return {
      totalFilms: history.length,
      topPerson: sortedCrew[0],
      otherTop: sortedCrew, // All crew (UI will filter by type)
      counts: {
        directors: counts.directors.size,
        actors: counts.actors.size,
        composers: counts.composers.size,
        cinematographers: counts.cinematographers.size,
      },
    };
  } catch (error) {
    return null;
  }
};

// Get type emoji
export const getTypeEmoji = (
  type: 'director' | 'actor' | 'composer' | 'cinematographer',
): string => {
  switch (type) {
    case 'director':
      return '🎬';
    case 'actor':
      return '🎭';
    case 'composer':
      return '🎵';
    case 'cinematographer':
      return '📸';
    default:
      return '🎬';
  }
};
