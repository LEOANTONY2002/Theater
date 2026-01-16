import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';
import Papa from 'papaparse';
import {diaryManager, IDiaryEntry} from '../store/diary';
import {Alert, Platform, PermissionsAndroid} from 'react-native';

class DiaryImportExportService {
  private async generateCSV(): Promise<{path: string; fileName: string}> {
    const entries = diaryManager.getAllEntries();
    const csv = Papa.unparse(entries);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `theater_diary_${timestamp}.csv`;
    const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(path, csv, 'utf8');
    return {path, fileName};
  }

  async shareDiary() {
    try {
      const {path, fileName} = await this.generateCSV();

      await Share.open({
        url: `file://${path}`,
        type: 'text/csv',
        filename: fileName,
        title: 'Share Diary',
        message: 'Here is my Theater App Diary export!',
      });
    } catch (error: any) {
      console.error('Share error:', error);
      if (error?.message !== 'User did not share') {
        // Alert.alert('Share Failed', error.message || 'Unknown error');
      }
    }
  }

  async downloadDiary() {
    try {
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Download',
          'On iOS, please use the "Share" option and select "Save to Files".',
        );
        this.shareDiary();
        return {success: false};
      }

      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission Required',
              message: 'App needs access to save to Downloads folder.',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log(
              'Permission denied, attempting anyway (might be scoped storage)',
            );
          }
        } catch (err) {
          console.warn(err);
        }
      }

      const {path, fileName} = await this.generateCSV();
      const dest = `${RNFS.DownloadDirectoryPath}/${fileName}`;

      await RNFS.copyFile(path, dest);

      try {
        await RNFS.scanFile(dest);
      } catch (e) {
        console.log('Scan file error', e);
      }

      return {success: true, fileName, path: dest};
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', error.message || 'Unknown error');
      return {success: false};
    }
  }

  async importDiary() {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.plainText,
          DocumentPicker.types.csv,
          'public.comma-separated-values-text',
          'text/csv',
          'application/csv',
        ],
        copyTo: 'cachesDirectory',
      });

      const uri = res.fileCopyUri || res.uri;
      const fileContent = await RNFS.readFile(uri, 'utf8');

      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          try {
            const imported = results.data;
            let count = 0;

            for (const row of imported) {
              if (!row.id || !row.title) continue;

              // Validate/Map types
              const entry: IDiaryEntry = {
                id: Number(row.id),
                type:
                  row.type === 'movie' || row.type === 'tv'
                    ? row.type
                    : 'movie',
                title: row.title,
                poster_path: row.poster_path || undefined,
                backdrop_path: row.backdrop_path || undefined,
                status: row.status || 'watching',
                progress: Number(row.progress) || 0,
                rating: Number(row.rating) || 0,
                note: row.note || '',
                mood: row.mood || undefined,
                started_at:
                  row.started_at ||
                  row.last_updated_at ||
                  new Date().toISOString(),
                last_updated_at:
                  row.last_updated_at || new Date().toISOString(),
                last_season: row.last_season ? Number(row.last_season) : 1,
                last_episode: row.last_episode ? Number(row.last_episode) : 1,
                total_seasons: row.total_seasons
                  ? Number(row.total_seasons)
                  : 1,
                total_episodes: row.total_episodes
                  ? Number(row.total_episodes)
                  : 1,
              };

              await diaryManager.updateEntry(entry);
              count++;
            }

            Alert.alert(
              'Import Success',
              `Successfully imported ${count} entries.`,
            );
          } catch (err: any) {
            console.error('Import processing error:', err);
            Alert.alert('Import Failed', 'Failed to process CSV data.');
          }
        },
        error: (err: any) => {
          console.error('CSV Parse error:', err);
          Alert.alert('Import Failed', 'Invalid CSV format.');
        },
      });
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        console.error('Document Picker error:', err);
        Alert.alert('Import Failed', 'Could not pick file.');
      }
    }
  }
}

export const diaryImportExportService = new DiaryImportExportService();
