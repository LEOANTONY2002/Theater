import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Linking,
  Share,
  Alert,
  TextInput,
} from 'react-native';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import packageJson from '../../package.json';
import {useResponsive} from '../hooks/useResponsive';

const AboutLegalScreen: React.FC = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const {isTablet, orientation} = useResponsive();

  // Reuse the same report/support mail behavior as AIReportFlag
  const REPORT_EMAIL = 'la.curations@gmail.com';
  const openSupportMail = async (message?: string) => {
    const subject = 'Theater Support / Report';
    const prompt = 'Please describe your issue or feedback here:';
    const divider = '\n----------------------------------------\n';
    const userNote = message?.trim() ? `User Message:\n${message.trim()}\n${divider}` : '';
    const body = `App: Theater\nVersion: ${packageJson.version}\n${divider}${userNote}${prompt}\n`;

    const MAX_MAILTO_BODY_LENGTH = 1800;
    const encodedBody = encodeURIComponent(body);
    const safeEncodedBody =
      encodedBody.length > MAX_MAILTO_BODY_LENGTH
        ? encodedBody.slice(0, MAX_MAILTO_BODY_LENGTH) +
          encodeURIComponent(
            '\n\n[Truncated. You can continue typing in the email draft.]',
          )
        : encodedBody;

    const variants = [
      // Gmail app deep link
      `googlegmail://co?to=${encodeURIComponent(REPORT_EMAIL)}&subject=${encodeURIComponent(
        subject,
      )}&body=${safeEncodedBody}`,
      // Outlook app deep link
      `ms-outlook://compose?to=${encodeURIComponent(
        REPORT_EMAIL,
      )}&subject=${encodeURIComponent(subject)}&body=${safeEncodedBody}`,
      // Some devices prefer the explicit to= query param first
      `mailto:?to=${encodeURIComponent(REPORT_EMAIL)}&subject=${encodeURIComponent(
        subject,
      )}&body=${safeEncodedBody}`,
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
        return; // success
      } catch (_e) {
        // try next variant
      }
    }

    // Final fallback: show an alert asking the user to install/open an email app
    Alert.alert(
      'Open Email App',
      `No email app was detected. Please install or open your mail app and send a message to ${REPORT_EMAIL}.`,
      [
        {text: 'OK', style: 'default'},
      ],
    );
  };

  const styles = StyleSheet.create({
    section: {
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
      bottom: isTablet ? 10 : 2,
      left: 0,
      right: 0,
    },
    tmdbLogoWrapper: {
      borderRadius: 4,
    },
    tmdbLogo: {width: 25, height: 25, opacity: 0.5, marginRight: spacing.xs},
    footerText: {
      color: colors.text.tertiary || '#aaa',
      fontSize: 10,
      textAlign: 'center',
      marginTop: spacing.xs,
      fontFamily: 'Inter',
      opacity: 0.5,
      maxWidth: '90%',
    },
    linkCard: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    gradientBtn: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: 'row',
    },
    outlineBtn: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: 'row',
      borderWidth: 1,
    },
    linkText: {
      ...typography.button,
      color: colors.text.primary,
    },
    supportRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: isTablet ? 150 : 100, // slightly above bottom tab height
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      gap: spacing.xs,
    },
    supportInline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    supportHint: {
      ...typography.caption,
      color: colors.text.tertiary,
      opacity: 0.9,
      textAlign: 'center',
    },
    supportBtn: {
      borderWidth: 1,
      borderColor: colors.modal.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      backgroundColor: colors.modal.blur,
    },
    supportBtnText: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '600',
    },
    versionText: {
      color: colors.text.tertiary,
      fontSize: 12,
      textAlign: 'center',
      fontFamily: 'Inter',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContent: {
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      height: '90%',
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.background.secondary,
    },
    modalTitle: {
      color: colors.text.primary,
      ...typography.h3,
      paddingVertical: spacing.sm,
    },
    modalBody: {
      flex: 1,
    },
    privacyContent: {
      padding: spacing.md,
      color: colors.text.primary,
      ...typography.body1,
    },
    privacySectionTitle: {
      color: colors.text.primary,
      ...typography.h3,
      marginBottom: spacing.sm,
    },
    privacyText: {
      color: colors.text.secondary,
      ...typography.body2,
      paddingVertical: spacing.sm,
    },
    supportTextArea: {
      minHeight: 120,
      borderWidth: 1,
      borderColor: colors.modal.border,
      backgroundColor: colors.modal.blur,
      color: colors.text.primary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      textAlignVertical: 'top',
    },
    supportActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.background.secondary,
    },
    supportActionBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: colors.modal.border,
      backgroundColor: colors.modal.blur,
    },
    supportActionPrimary: {
      backgroundColor: colors.text.primary,
      borderColor: 'transparent',
    },
    supportActionText: {
      ...typography.body2,
      color: colors.text.secondary,
    },
    supportActionPrimaryText: {
      ...typography.body2,
      color: 'black',
      fontWeight: '600',
    },
  });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Image
        source={require('../assets/symbol.webp')}
        style={{
          marginHorizontal: spacing.xxl,
          width: isTablet ? '70%' : '85%',
          marginBottom: isTablet ? 0 : -spacing.xxl,
        }}
        resizeMode="contain"
      />

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setShowPrivacyModal(true);
          }}>
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.privacyText}>|</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setShowTosModal(true)}>
          <Text style={styles.privacyText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>App Version {packageJson.version}</Text>

      <View style={styles.section}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            const url = 'https://www.themoviedb.org/';
            const Linking = require('react-native').Linking;
            Linking.openURL(url);
          }}
          accessibilityLabel="Visit TMDB website"
          style={styles.tmdbLogoWrapper}>
          <Image
            source={require('../assets/tmdb.webp')}
            style={styles.tmdbLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.footerText}>
          This app uses the TMDB API but is not endorsed or certified by TMDB.
        </Text>
      </View>

      <Image
        source={require('../assets/LA.webp')}
        style={{
          marginHorizontal: spacing.xxl,
          marginTop: spacing.xl,
          width: isTablet ? 150 : 100,
          height: isTablet ? 170 : 120,
        }}
        resizeMode="contain"
      />

      {/* Support / Report row above bottom tab */}
      <View style={styles.supportRow} pointerEvents="box-none">
        <View style={styles.supportInline}>
          <Text style={styles.supportHint}>Need help or found an issue?</Text>
          <TouchableOpacity
            onPress={() => setShowSupportModal(true)}
            activeOpacity={0.85}
            style={styles.supportBtn}
            accessibilityLabel="Contact support via email">
            <Text style={styles.supportBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{height: 20}} />

      {/* Support Modal */}
      <Modal
        visible={showSupportModal}
        animationType="slide"
        statusBarTranslucent
        transparent
        onRequestClose={() => setShowSupportModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Support</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={{paddingHorizontal: spacing.md}}
                onPress={() => setShowSupportModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={{padding: spacing.md}}>
              <Text style={styles.privacyText}>
                Briefly describe the issue or feedback. Your text will be included in the email draft.
              </Text>
              <TextInput
                style={styles.supportTextArea}
                placeholder="Type your message here..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                numberOfLines={5}
                value={supportMessage}
                onChangeText={setSupportMessage}
              />
            </View>
            <View style={styles.supportActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowSupportModal(false);
                  setSupportMessage('');
                }}
                style={styles.supportActionBtn}
                activeOpacity={0.85}>
                <Text style={styles.supportActionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const msg = supportMessage;
                  setShowSupportModal(false);
                  setSupportMessage('');
                  openSupportMail(msg);
                }}
                style={[styles.supportActionBtn, styles.supportActionPrimary]}
                activeOpacity={0.85}>
                <Text style={styles.supportActionPrimaryText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        statusBarTranslucent
        transparent
        onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={{paddingHorizontal: spacing.md}}
                onPress={() => setShowPrivacyModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.privacyContent}>
                <Text style={styles.privacySectionTitle}>
                  Privacy Policy for Theater App{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  Information We Collect{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  Theater does not collect, store, or transmit any personal
                  information from users. We do not track your browsing history,
                  personal preferences, or any other identifiable data.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>Data Usage{'\n'}</Text>
                <Text style={styles.privacyText}>
                  The app displays movie and TV show information sourced from
                  The Movie Database (TMDB) API. All content is provided by TMDB
                  and we do not store or cache any user-specific data.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  Third-Party Services{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  This app uses the TMDB API to provide movie and TV show
                  information. Please refer to TMDB's privacy policy for
                  information about how they handle data.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  Generative AI Chat Feature{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  This app includes a chat feature powered by Google's Gemini
                  API. The app facilitates communication with the Gemini API
                  using an API key that you, the user, provide.{'\n\n'}
                  When you use this feature, your chat prompts and the AI's
                  responses are sent to and processed by Google's services in
                  accordance with their privacy policy and terms. We do not
                  store or save your chat history on our servers.{'\n\n'}
                  Since you are using your own API key, you are responsible for
                  this usage. For more information on how Google handles data
                  from the Gemini API, please refer to Google's Privacy Policy
                  and the Gemini API's terms of service.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>Contact{'\n'}</Text>
                <Text style={styles.privacyText}>
                  If you have any questions about this privacy policy, please
                  contact us through the app store.{'\n\n'}
                </Text>

                {/* <Text style={styles.privacyText}>
                  Last updated: {new Date().toLocaleDateString()}
                </Text> */}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTosModal}
        animationType="slide"
        statusBarTranslucent
        transparent
        onRequestClose={() => setShowTosModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms of Service</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                style={{paddingHorizontal: spacing.md}}
                onPress={() => setShowTosModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.privacyContent}>
                <Text style={styles.privacySectionTitle}>
                  Terms of Service{'\n\n'}
                </Text>

                <Text style={styles.privacyText}>
                  Welcome to Theater! By using this application, you agree to
                  these Terms of Service.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  1. User Responsibility for API Keys{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  This app relies on a Google Gemini API key that you, the user,
                  must provide. You are solely responsible for all API usage
                  associated with your key, including any potential costs
                  incurred. By using your key, you agree to and are bound by
                  Google’s Generative AI terms of service.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  2. AI-Generated Content Disclaimer{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  The chat responses in this app are generated by an artificial
                  intelligence model. The content is for informational and
                  entertainment purposes only and should not be considered
                  factual, professional, or definitive. We do not guarantee the
                  accuracy, completeness, or usefulness of any information
                  provided.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  3. Prohibited Conduct{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  You agree not to use this app to generate content that is
                  illegal, hateful, harassing, violent, sexually explicit, or
                  misleading. Any violation of these terms may result in the
                  termination of your access to the app.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  4. Third-Party Services{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  This app utilizes the TMDB API to provide movie and TV show
                  information. All such content is sourced from and subject to
                  the terms of The Movie Database (TMDB).{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  5. No Warranty{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  This app is provided "as is" and without any warranty. We are
                  not liable for any damages or issues that may arise from your
                  use of the application.{'\n\n'}
                </Text>

                {/* <Text style={styles.privacyText}>
                  Last updated: {new Date().toLocaleDateString()}
                </Text> */}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AboutLegalScreen;
