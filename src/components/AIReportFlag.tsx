import React, {useMemo, useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Linking,
  Clipboard,
  Share,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {AISettingsManager} from '../store/aiSettings';

// TODO: Replace with your reporting inbox
import {AI_CONSTANTS} from '../config/aiConstants';

const REPORT_EMAIL = 'la.curations@gmail.com';

export type AIReportFlagProps = {
  aiText: string;
  userText?: string;
  context: string; // e.g., 'OnlineAIScreen', 'MovieAIChatModal', 'PersonAIChatModal'
  threadId?: string;
  timestamp?: number; // ms
  modelHint?: string; // optional override for model name
};

const CATEGORIES = [
  'Hallucination / Incorrect info',
  'Safety / Harmful content',
  'Offensive / Hate / Harassment',
  'Privacy / Sensitive data',
  'Other',
];

export const AIReportFlag: React.FC<AIReportFlagProps> = ({
  aiText,
  userText,
  context,
  threadId,
  timestamp,
  modelHint,
}) => {
  const [visible, setVisible] = useState(false);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [details, setDetails] = useState('');
  const [includeConversation, setIncludeConversation] = useState(true);
  const [model, setModel] = useState<string | null>(modelHint || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!modelHint) {
      (async () => {
        try {
          const settings = await AISettingsManager.getSettings();
          setModel(settings.model || AI_CONSTANTS.DEFAULT_MODEL);
        } catch (e) {
          setModel(AI_CONSTANTS.DEFAULT_MODEL);
        }
      })();
    }
  }, [modelHint]);

  const submittedAt = useMemo(
    () => new Date(timestamp || Date.now()).toISOString(),
    [timestamp],
  );

  const openMailClient = async () => {
    const subject = `Theater AI Report - ${category}`;
    const divider = '\n----------------------------------------\n';

    let body =
      `Model: ${model || 'unknown'}\n` +
      (threadId ? `Thread: ${threadId}\n` : '') +
      `Submitted At: ${submittedAt}\n` +
      divider +
      `Description:\n${details || '(no description)'}\n` +
      divider;

    if (includeConversation) {
      body +=
        `User Prompt (previous message):\n${userText || '(unknown)'}\n` +
        divider +
        `AI Response:\n${aiText}\n` +
        divider;
    }

    // Mail clients on Android can fail when the mailto URL is too long.
    // Keep a conservative limit for the encoded body that goes into the mailto link.
    const MAX_MAILTO_BODY_LENGTH = 1800; // encoded length budget (conservative)
    const encodedBody = encodeURIComponent(body);
    const safeEncodedBody =
      encodedBody.length > MAX_MAILTO_BODY_LENGTH
        ? encodedBody.slice(0, MAX_MAILTO_BODY_LENGTH) +
          encodeURIComponent(
            `\n\n[Truncated. Full details available via Share/Copy inside the app.]`,
          )
        : encodedBody;

    // Try app-specific and generic mailto variants first
    const variants = [
      // Gmail deep link
      `googlegmail://co?to=${encodeURIComponent(
        REPORT_EMAIL,
      )}&subject=${encodeURIComponent(subject)}&body=${safeEncodedBody}`,
      // Outlook deep link
      `ms-outlook://compose?to=${encodeURIComponent(
        REPORT_EMAIL,
      )}&subject=${encodeURIComponent(subject)}&body=${safeEncodedBody}`,
      // Explicit to= param
      `mailto:?to=${encodeURIComponent(
        REPORT_EMAIL,
      )}&subject=${encodeURIComponent(subject)}&body=${safeEncodedBody}`,
      // Standard mailto variants
      `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(
        subject,
      )}&body=${safeEncodedBody}`,
      `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}`,
      `mailto:${REPORT_EMAIL}`,
      `mailto:`,
    ];

    for (const url of variants) {
      try {
        await Linking.openURL(url);
        setVisible(false);
        // reset
        setCategory(CATEGORIES[0]);
        setDetails('');
        setIncludeConversation(true);
        return;
      } catch (_e) {
        // try next
      }
    }

    // Final fallback: instruct user to send an email manually
    Alert.alert(
      'Open Email App',
      `No email app was detected. Please install or open your mail app and send the report to ${REPORT_EMAIL}. You can also use the Share button to export details.`,
      [{text: 'OK'}],
    );
  };

  const buildShareText = () => {
    const divider = '\n----------------------------------------\n';
    let txt =
      `Context: ${context}\n` +
      `Model: ${model || 'unknown'}\n` +
      (threadId ? `Thread: ${threadId}\n` : '') +
      divider +
      `User:\n${userText || '(unknown)'}\n` +
      divider +
      `AI:\n${aiText}`;
    return txt;
  };

  const handleCopy = async () => {
    try {
      await Clipboard.setString(buildShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // no-op
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: buildShareText(),
        title: 'Theater AI Response',
      });
    } catch (e) {
      // user cancelled or error
    }
  };

  return (
    <View style={{marginLeft: spacing.md, opacity: 0.5}}>
      <View style={styles.actionsInlineRow}>
        <TouchableOpacity
          onPress={handleCopy}
          style={styles.iconPill}
          activeOpacity={0.8}>
          <Icon
            name={copied ? 'checkmark' : 'copy-outline'}
            color={copied ? colors.text.primary : colors.text.secondary}
            size={16}
          />
          <Text
            style={[styles.flagText, copied && {color: colors.text.primary}]}>
            Copy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.iconPill}
          activeOpacity={0.8}>
          <Icon
            name="share-social-outline"
            color={colors.text.secondary}
            size={16}
          />
          <Text style={styles.flagText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setVisible(true)}
          style={styles.flagButton}
          activeOpacity={0.8}>
          <Icon name="flag-outline" color={colors.text.secondary} size={16} />
          <Text style={styles.flagText}>Report</Text>
        </TouchableOpacity>
      </View>

      <Modal
        backdropColor={colors.modal.blurDark}
        visible={visible}
        onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <LinearGradient
            colors={['rgba(19,1,45,0.92)', 'rgba(91,2,62,0.92)']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Report AI Response</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.iconButton}>
                <Icon name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, category === c && styles.chipActive]}>
                  <Text
                    style={[
                      styles.chipText,
                      category === c && styles.chipTextActive,
                    ]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Describe the issue</Text>
            <TextInput
              style={styles.textArea}
              placeholder="What went wrong? Help us improve."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
              value={details}
              onChangeText={setDetails}
            />

            <TouchableOpacity
              onPress={() => setIncludeConversation(v => !v)}
              style={styles.checkboxRow}
              activeOpacity={0.8}>
              <Icon
                name={
                  includeConversation ? 'checkbox-outline' : 'square-outline'
                }
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.checkboxText}>
                Include prompt and response
              </Text>
            </TouchableOpacity>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Model: {model || '...'}</Text>
              {!!threadId && (
                <Text style={styles.metaText}>Thread: {threadId}</Text>
              )}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={[styles.actionBtn, styles.cancelBtn]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openMailClient}
                style={[styles.actionBtn, styles.submitBtn]}>
                <Text style={styles.submitText}>Send Report</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  flagButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  actionsInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flagText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 360,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  iconButton: {
    padding: spacing.xs,
    borderRadius: 999,
  },
  label: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.modal.border,
    backgroundColor: colors.modal.blur,
  },
  chipActive: {
    backgroundColor: 'rgba(209, 8, 125, 0.18)',
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.modal.border,
    backgroundColor: colors.modal.blur,
    color: colors.text.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  checkboxText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  metaText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtn: {
    borderColor: colors.modal.border,
    backgroundColor: colors.modal.blur,
  },
  cancelText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  submitBtn: {
    borderColor: 'transparent',
    backgroundColor: colors.text.primary,
  },
  submitText: {
    ...typography.body2,
    color: 'black',
    fontWeight: '600',
  },
});

export default AIReportFlag;
