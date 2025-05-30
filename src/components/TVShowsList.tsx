import React, {useState} from 'react';
import {useTVShowsList} from '../hooks/useTVShows';
import {MediaCard} from './MediaCard';
import {LoadingSpinner} from './LoadingSpinner';
import {ErrorDisplay} from './ErrorDisplay';
import {useInView} from 'react-intersection-observer';

const TV_SHOW_TYPES = [
  {id: 'popular', label: 'Popular'},
  {id: 'top_rated', label: 'Top Rated'},
  {id: 'latest', label: 'Recent'},
] as const;

export const TVShowsList = () => {
  const [selectedType, setSelectedType] = useState<
    'popular' | 'top_rated' | 'latest'
  >('popular');
  const {ref, inView} = useInView();

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTVShowsList(selectedType);

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorDisplay error={error} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-4 mb-8">
        {TV_SHOW_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-4 py-2 rounded-full transition-colors ${
              selectedType === type.id
                ? 'bg-primary text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}>
            {type.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {data?.pages.map((page, i) => (
          <React.Fragment key={i}>
            {page.results.map(show => (
              <MediaCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show?.poster_path}
                type="tv"
                rating={show.vote_average}
                releaseDate={show.first_air_date}
              />
            ))}
          </React.Fragment>
        ))}
      </div>

      <div ref={ref} className="h-10 flex items-center justify-center mt-8">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>
    </div>
  );
};
