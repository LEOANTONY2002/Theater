import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import {View, Image} from 'react-native';
import ViewShot from 'react-native-view-shot';
import SharePoster, {SharePosterItem} from './SharePoster';

export type PosterDetails = {
  runtime?: number;
  year?: number;
  rating?: number;
  genres?: string[];
};

export type PosterCaptureParams = {
  watchlistName: string;
  items: SharePosterItem[];
  importCode?: string;
  isFilter?: boolean;
  showQR?: boolean;
  details?: PosterDetails;
  streamingIcon?: string | null;
  languages?: string[];
  seasons?: number;
  episodes?: number;
};

type CaptureRequest = {
  params: PosterCaptureParams;
  result: 'tmpfile' | 'base64';
  resolve: (uri: string) => void;
  reject: (e: any) => void;
};

let hostRef: PosterCaptureHostHandle | null = null;

export const requestPosterCapture = async (
  params: PosterCaptureParams,
  result: 'tmpfile' | 'base64' = 'tmpfile',
): Promise<string> => {
  if (!hostRef) throw new Error('PosterCaptureHost not mounted');
  return hostRef.capture(params, result);
};

export type PosterCaptureHostHandle = {
  capture: (
    params: PosterCaptureParams,
    result: 'tmpfile' | 'base64',
  ) => Promise<string>;
};

export const PosterCaptureHost = React.forwardRef<PosterCaptureHostHandle>(
  (_, ref) => {
    const viewShotRef = useRef<ViewShot>(null);
    const [request, setRequest] = useState<CaptureRequest | null>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      capture: (params, result) =>
        new Promise<string>((resolve, reject) => {
          setImageLoaded(false);
          setRequest({params, result, resolve, reject});
          setIsRendered(false);
        }),
    }));

    useEffect(() => {
      hostRef = {
        capture: (params, result) =>
          new Promise<string>((resolve, reject) => {
            setImageLoaded(false);
            setRequest({params, result, resolve, reject});
            setIsRendered(false);
          }),
      };
      return () => {
        hostRef = null;
      };
    }, []);

    useEffect(() => {
      const doCapture = async () => {
        if (!request || !isRendered) return;
        try {
          // Prefetch main image to ensure it's in cache
          const posters = request.params.items.slice(0, 9);
          const posterImages = posters.filter(
            p => !!(p?.poster_path || p?.backdrop_path),
          );

          if (posterImages.length > 0) {
            const path =
              posterImages[0]?.poster_path || posterImages[0]?.backdrop_path;
            const url = `https://image.tmdb.org/t/p/w780${path}`;
            try {
              await Image.prefetch(url);
            } catch (e) {
              console.warn('Prefetch failed', e);
            }
          }

          // Wait for image to load via onLoad callback (as backup/confirmation)
          // We wait up to 60 seconds, but break immediately on load or error
          let attempts = 0;
          while (!imageLoaded && attempts < 600) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;

            // If request was cancelled/cleared, stop waiting
            if (!hostRef) break;
          }

          // Small extra buffer for rendering
          await new Promise(r => setTimeout(r, 500));

          const uri = await (viewShotRef.current as any)?.capture?.({
            format: 'png',
            quality: 1,
            result: request.result,
          });
          if (!uri || typeof uri !== 'string') throw new Error('Empty capture');
          const finalUri =
            request.result === 'base64'
              ? `data:image/png;base64,${uri}`
              : uri.startsWith('file://')
              ? uri
              : `file://${uri}`;
          request.resolve(finalUri);
        } catch (e) {
          request.reject(e);
        } finally {
          // Clear request to unmount SharePoster
          setRequest(null);
          setIsRendered(false);
          setImageLoaded(false);
        }
      };
      doCapture();
    }, [request, isRendered, imageLoaded]);

    // Render nothing if no request pending
    if (!request) return null;

    const {params} = request;

    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          zIndex: -1000, // Push behind everything
          elevation: -1000,
        }}
        renderToHardwareTextureAndroid={true}
        pointerEvents="none"
        onLayout={() => {
          // Mark as rendered when layout is complete
          setIsRendered(true);
        }}
        collapsable={false}>
        <ViewShot
          ref={viewShotRef}
          options={{
            format: 'png',
            quality: 1,
            result: request.result,
            width: 1080,
            height: 1920,
          }}
          captureMode="update">
          <SharePoster
            watchlistName={params.watchlistName}
            items={params.items}
            importCode={params.importCode}
            isFilter={!!params.isFilter}
            showQR={params.showQR}
            details={params.details}
            streamingIcon={params.streamingIcon ?? null}
            languages={params.languages}
            seasons={params.seasons}
            episodes={params.episodes}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </ViewShot>
      </View>
    );
  },
);

export default PosterCaptureHost;
