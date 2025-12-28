import React, {useEffect, useState} from 'react';

import {ThematicTagsManager} from '../store/thematicTags';
import {useAIEnabled} from './useAIEnabled';

interface ContentTagsParams {
  title: string;
  overview: string;
  genres: string;
  type: 'movie' | 'tv';
  contentId?: number;
  enabled?: boolean;
  poster_path?: string;
  tags?: {
    thematicTags: Array<{tag: string; description: string; confidence: number}>;
    emotionalTags: Array<{
      tag: string;
      description: string;
      confidence: number;
    }>;
  };
}

/**
 * Hook to store thematic/emotional tags for a content item in the manager
 * Now passive: receives tags from useContentAnalysis instead of fetching
 */
export function useContentTags({
  title,
  overview,
  genres,
  type,
  contentId,
  enabled = true,
  poster_path,
  tags,
}: ContentTagsParams) {
  const {isAIEnabled} = useAIEnabled();
  const isGeneratingRef = React.useRef(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  // Reset when content changes
  useEffect(() => {
    isGeneratingRef.current = false;
    setHasRecorded(false);
  }, [contentId]);

  useEffect(() => {
    // Only record if tags are provided and we haven't recorded yet
    if (
      !enabled ||
      !isAIEnabled ||
      !tags ||
      hasRecorded ||
      isGeneratingRef.current
    ) {
      return;
    }

    const recordTags = async () => {
      try {
        isGeneratingRef.current = true;

        // Store tags globally for pattern analysis
        const allTags = [
          ...(tags.thematicTags || []).map(t => ({
            ...t,
            category: 'thematic' as const,
            poster_path,
          })),
          ...(tags.emotionalTags || []).map(t => ({
            ...t,
            category: 'emotional' as const,
            poster_path,
          })),
        ];

        if (allTags.length > 0) {
          await ThematicTagsManager.addTags(allTags);
        }

        setHasRecorded(true);
      } catch (error) {
        console.error('[ContentTags] ❌ Error recording tags:', error);
      } finally {
        isGeneratingRef.current = false;
      }
    };

    recordTags();
  }, [tags, enabled, isAIEnabled, hasRecorded, poster_path]);

  return {
    isGenerating: false,
    hasGenerated: hasRecorded,
    tags: tags || null,
  };
}
