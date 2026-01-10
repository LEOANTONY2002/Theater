import React, {useState, useEffect} from 'react';
import {TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {diaryManager} from '../store/diary';
import {colors} from '../styles/theme';
import {ContextualNoteModal} from './modals/ContextualNoteModal';

interface EpisodeActionButtonsProps {
  showId: number;
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  posterPath?: string;
  backdropPath?: string;
  totalSeasons?: number;
  seasonData?: {season_number: number; episode_count: number}[];
}

export const EpisodeActionButtons: React.FC<EpisodeActionButtonsProps> = ({
  showId,
  showTitle,
  seasonNumber,
  episodeNumber,
  episodeTitle,
  posterPath,
  backdropPath,
  totalSeasons,
  seasonData,
}) => {
  const [isWatched, setIsWatched] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState('');

  useEffect(() => {
    checkStatus();
    diaryManager.addChangeListener(checkStatus);
    return () => diaryManager.removeChangeListener(checkStatus);
  }, [showId, seasonNumber, episodeNumber]);

  const checkStatus = () => {
    const entry = diaryManager.getEntry(showId);
    if (!entry) {
      setIsWatched(false);
      setCurrentNote('');
      return;
    }
    // "Up To" logic
    const lastS = entry.last_season || 0;
    const lastE = entry.last_episode || 0;

    if (lastS > seasonNumber) {
      setIsWatched(true);
    } else if (lastS === seasonNumber && lastE >= episodeNumber) {
      setIsWatched(true);
    } else {
      setIsWatched(false);
    }

    // Get note for this specific episode/season
    const isSeason = episodeTitle.includes('Season');
    if (isSeason) {
      const sNotes = entry.season_notes || {};
      setCurrentNote(sNotes[seasonNumber.toString()] || '');
    } else {
      const epNotes = entry.episode_notes || {};
      const rawNote = epNotes[`s${seasonNumber}e${episodeNumber}`];

      // Try parsing as JSON first (new format)
      try {
        if (rawNote && rawNote.startsWith('{')) {
          const parsed = JSON.parse(rawNote);
          setCurrentNote(parsed.text || '');
        } else {
          // Legacy format (just string)
          setCurrentNote(rawNote || '');
        }
      } catch (e) {
        setCurrentNote(rawNote || '');
      }
    }
  };

  const handleToggleWatch = async () => {
    const entry = diaryManager.getEntry(showId);
    let targetS = seasonNumber;
    let targetE = episodeNumber;

    const isSeasonButton = episodeTitle.includes('Season');

    // STEP BACK LOGIC: If clicking the current "head" of progress
    if (
      entry &&
      entry.last_season === seasonNumber &&
      entry.last_episode === episodeNumber
    ) {
      if (isSeasonButton || episodeNumber === 1) {
        // Season level de-watch or first episode: go to end of previous season
        const prevSeasonData = (seasonData || [])
          .filter(s => s.season_number < seasonNumber && s.season_number > 0)
          .sort((a, b) => b.season_number - a.season_number)[0];

        if (prevSeasonData) {
          targetS = prevSeasonData.season_number;
          targetE = prevSeasonData.episode_count;
        } else {
          // No previous season, remove entry entirely
          await diaryManager.deleteEntry(showId);
          setTimeout(() => checkStatus(), 100);
          return;
        }
      } else {
        // Standard episode de-watch: move back one episode
        targetE = episodeNumber - 1;
      }
    }

    // Calculate real progress for the new target
    let calculatedProgress = 0;
    const sData = seasonData || [];
    const totalEpisodes = sData.reduce(
      (acc, s) => acc + (s.season_number > 0 ? s.episode_count : 0),
      0,
    );

    if (sData.length > 0) {
      let watchedEps = 0;
      sData.forEach(s => {
        if (s.season_number > 0 && s.season_number < targetS) {
          watchedEps += s.episode_count;
        }
      });
      watchedEps += targetE;
      if (totalEpisodes > 0) {
        calculatedProgress = Math.min((watchedEps / totalEpisodes) * 100, 100);
      }
    }

    await diaryManager.updateEntry({
      id: showId,
      type: 'tv',
      title: showTitle,
      last_season: targetS,
      last_episode: targetE,
      poster_path: posterPath,
      backdrop_path: backdropPath,
      total_seasons: totalSeasons || 1,
      total_episodes: totalEpisodes,
      progress: calculatedProgress,
      status: calculatedProgress >= 100 ? 'completed' : 'watching',
    });

    // Slight delay to ensure Realm listeners and state are synchronized
    setTimeout(() => checkStatus(), 100);
  };

  const handleSaveNote = async (noteText: string) => {
    const entry = diaryManager.getEntry(showId);
    const updatePayload: any = {
      id: showId,
      type: 'tv',
      title: showTitle,
      poster_path: posterPath,
      backdrop_path: backdropPath,
    };

    const isSeason = episodeTitle.includes('Season');
    if (isSeason) {
      const sNotes = {...(entry?.season_notes || {})};
      sNotes[seasonNumber.toString()] = noteText;
      updatePayload.season_notes = sNotes;
    } else {
      const epNotes = {...(entry?.episode_notes || {})};

      // Store object with text and title
      const noteData = {
        text: noteText,
        title: episodeTitle, // Contains actual episode name now if passed correctly
        date: new Date().toISOString(),
      };

      epNotes[`s${seasonNumber}e${episodeNumber}`] = JSON.stringify(noteData);
      updatePayload.episode_notes = epNotes;
    }

    await diaryManager.updateEntry(updatePayload);
    checkStatus(); // Force local update
  };

  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      {!isWatched ? (
        <TouchableOpacity
          onPress={handleToggleWatch}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          style={{padding: 8}}>
          <Ionicons name="eye-outline" size={24} color={colors.text.muted} />
        </TouchableOpacity>
      ) : (
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <TouchableOpacity
            onPress={handleToggleWatch}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            style={{padding: 8}}>
            <Ionicons name="eye" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            style={{padding: 8}}>
            <Ionicons
              name={currentNote ? 'document-text' : 'document-text-outline'}
              size={24}
              color={currentNote ? colors.primary : colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      )}

      <ContextualNoteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveNote}
        title={
          episodeTitle.includes('Season')
            ? episodeTitle
            : `S${seasonNumber} E${episodeNumber} ${episodeTitle}`
        }
        initialNote={currentNote}
      />
    </View>
  );
};
