import {useEffect, useState} from 'react';
import {generateTagsForContent} from '../services/gemini';
import {thematicTagsManager} from '../store/thematicTags';
import {useAIEnabled} from './useAIEnabled';

interface ContentTagsParams {
  title: string;
  overview: string;
  genres: string;
  type: 'movie' | 'tv';
  enabled?: boolean;
}

/**
 * Hook to generate and store thematic/emotional tags for a content item
 * Called on details screen to incrementally build tag database
 */
export function useContentTags({
  title,
  overview,
  genres,
  type,
  enabled = true,
}: ContentTagsParams) {
  const {isAIEnabled} = useAIEnabled();
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [tags, setTags] = useState<{
    thematicTags: Array<{tag: string; description: string; confidence: number}>;
    emotionalTags: Array<{tag: string; description: string; confidence: number}>;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !isAIEnabled || !title || !overview || hasGenerated) {
      return;
    }

    const generateAndStoreTags = async () => {
      try {
        setIsGenerating(true);
        console.log(`[ContentTags] 🤖 Fetching tags for "${title}"`);

        // Generate tags for this content
        // The AI call itself is cached for 6 months in gemini.ts
        // Even if cached, we count every visit to build accurate preference profile
        const result = await generateTagsForContent(
          title,
          overview,
          genres,
          type,
        );

        if (result) {
          console.log(`[ContentTags] ✅ Got tags (${result.thematicTags.length} thematic, ${result.emotionalTags.length} emotional)`);

          // Set tags for display (only if component still mounted)
          setTags(result);

          // Store tags globally for pattern analysis
          // Count EVERY visit - visiting same movie 10 times = counted 10 times
          const allTags = [
            ...result.thematicTags.map(t => ({
              ...t,
              category: 'thematic' as const,
            })),
            ...result.emotionalTags.map(t => ({
              ...t,
              category: 'emotional' as const,
            })),
          ];

          // This runs async - even if user leaves, it will complete
          await thematicTagsManager.addTags(allTags);
          console.log(
            `[ContentTags] ✅ Counted tags for "${title}" (visit recorded)`,
          );
        } else {
          console.log(`[ContentTags] ❌ No tags returned for "${title}"`);
        }

        setHasGenerated(true);
      } catch (error) {
        console.error('[ContentTags] ❌ Error generating tags:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    // Start immediately (no delay needed)
    generateAndStoreTags();
  }, [title, overview, genres, type, enabled, isAIEnabled, hasGenerated]);

  return {
    isGenerating,
    hasGenerated,
    tags,
  };
}
