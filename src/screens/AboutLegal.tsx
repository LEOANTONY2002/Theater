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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import packageJson from '../../package.json';
import {useResponsive} from '../hooks/useResponsive';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {GradientButton} from '../components/GradientButton';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {BlurPreference} from '../store/blurPreference';

const AboutLegalScreen: React.FC = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const {isTablet, orientation} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  // Reuse the same report/support mail behavior as AIReportFlag
  const REPORT_EMAIL = 'la.curations@gmail.com';
  const openSupportMail = async (message?: string) => {
    const subject = 'Theater Support / Report';
    const body = message?.trim() || '';

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
      `googlegmail://co?to=${encodeURIComponent(
        REPORT_EMAIL,
      )}&subject=${encodeURIComponent(subject)}&body=${safeEncodedBody}`,
      // Outlook app deep link
      `ms-outlook://compose?to=${encodeURIComponent(
        REPORT_EMAIL,
      )}&subject=${encodeURIComponent(subject)}&body=${safeEncodedBody}`,
      // Some devices prefer the explicit to= query param first
      `mailto:?to=${encodeURIComponent(
        REPORT_EMAIL,
      )}&subject=${encodeURIComponent(subject)}&body=${safeEncodedBody}`,
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
      [{text: 'OK', style: 'default'}],
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
      fontFamily: 'Inter_18pt-Regular',
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
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    supportBtnText: {
      ...typography.caption,
      color: colors.text.secondary,
      fontWeight: '600',
    },
    versionText: {
      color: colors.text.tertiary,
      fontSize: 12,
      textAlign: 'center',
      fontFamily: 'Inter_18pt-Regular',
    },
    modalContainer: {
      marginTop: 60,
      flex: 1,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      overflow: 'hidden',
    },
    modalContent: {
      flex: 1,
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
    },
    modalBody: {
      flex: 1,
    },
    privacyContent: {
      padding: spacing.md,
      color: colors.text.primary,
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
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      color: colors.text.primary,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      textAlignVertical: 'top',
    },
    supportActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    supportActionBtn: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: colors.modal.border,
      backgroundColor: colors.modal.blur,
      marginTop: -20,
    },
    supportActionText: {
      ...typography.body2,
      color: colors.text.secondary,
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
      <View style={{height: 40}} />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          Linking.openURL('https://lacurations.vercel.app/?redirect=theater')
        }
        accessibilityLabel="Open LA Curations website">
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
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowSupportModal(true)}
        activeOpacity={0.85}
        style={{marginTop: spacing.sm}}
        accessibilityLabel="Contact support via email">
        <LinearGradient
          colors={['rgba(192, 171, 255, 0.1)', 'rgba(255, 163, 206, 0.1)']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.supportBtn}>
          <Icon name="pencil" size={12} color={colors.text.secondary} />
          <Text style={styles.supportBtnText}>Write Me</Text>
        </LinearGradient>
      </TouchableOpacity>

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

      {/* Support Modal */}
      <Modal
        visible={showSupportModal}
        animationType="slide"
        statusBarTranslucent
        backdropColor={colors.modal.blurDark}
        onRequestClose={() => setShowSupportModal(false)}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: isSolid ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
          }}
          activeOpacity={1}
          onPress={() => setShowSupportModal(false)}>
          <KeyboardAvoidingView
            style={{flex: 1, justifyContent: 'flex-end'}}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}>
            <View
              style={{
                margin: isTablet ? spacing.xl : spacing.md,
                borderRadius: borderRadius.xl,
                backgroundColor: 'transparent',
              }}>
              <MaybeBlurView
                header
                style={[
                  {
                    marginTop: 20,
                  },
                ]}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}>
                  <Ionicons name="mail" size={20} color={colors.text.muted} />
                  <View>
                    <Text style={styles.modalTitle}>Write Me</Text>
                    <Text
                      style={{
                        color: colors.text.secondary,
                        fontSize: 12,
                        marginTop: 0,
                        fontFamily: 'Inter_18pt-Regular',
                      }}>
                      Support or Report
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowSupportModal(false)}
                  style={{
                    padding: spacing.sm,
                    backgroundColor: colors.modal.blur,
                    borderRadius: borderRadius.round,
                    borderTopWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: colors.modal.content,
                  }}>
                  <Ionicons
                    name="close"
                    size={20}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </MaybeBlurView>
              <View
                style={{
                  minHeight: 250,
                  maxHeight: 500,
                  overflow: 'hidden',
                  borderRadius: borderRadius.xl,
                }}>
                <MaybeBlurView body style={{flex: 1}}>
                  <View style={{padding: spacing.md}}>
                    <Text style={styles.privacyText}>
                      Tell me about your theater experience
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
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.supportActions}
                      onPress={() => {
                        const msg = supportMessage;
                        setShowSupportModal(false);
                        setSupportMessage('');
                        openSupportMail(msg);
                      }}>
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={styles.supportActionBtn}>
                        <Text style={styles.supportActionText}>Send</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </MaybeBlurView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        backdropColor={colors.modal.blurDark}
        statusBarTranslucent
        onRequestClose={() => setShowPrivacyModal(false)}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
        <View
          style={{
            flex: 1,
            margin: isTablet ? spacing.xl : spacing.md,
            borderRadius: borderRadius.xl,
            backgroundColor: 'transparent',
          }}>
          <MaybeBlurView
            header
            style={[
              {
                marginTop: 20,
              },
            ]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={colors.text.muted}
              />
              <Text style={styles.modalTitle}>Privacy Policy</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowPrivacyModal(false)}
              style={{
                padding: spacing.sm,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.round,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: colors.modal.content,
              }}>
              <Ionicons name="close" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </MaybeBlurView>
          <View
            style={{
              flex: 1,
              overflow: 'hidden',
              borderRadius: borderRadius.xl,
            }}>
            <MaybeBlurView body style={{flex: 1}}>
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}>
                <View style={styles.privacyContent}>
                  <Text style={styles.privacySectionTitle}>
                    Privacy Policy for Theater App{'\n\n'}
                  </Text>

                  <Text style={styles.privacySectionTitle}>
                    Information We Collect{'\n'}
                  </Text>
                  <Text style={styles.privacyText}>
                    Theater does not collect, store, or transmit any personal
                    information from users. We do not track your browsing
                    history, personal preferences, or any other identifiable
                    data.{'\n\n'}
                  </Text>

                  <Text style={styles.privacySectionTitle}>
                    Data Usage{'\n'}
                  </Text>
                  <Text style={styles.privacyText}>
                    The app displays movie and TV show information sourced from
                    The Movie Database (TMDB) API. All content is provided by
                    TMDB and we do not store or cache any user-specific data.
                    {'\n\n'}
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
                    Since you are using your own API key, you are responsible
                    for this usage. For more information on how Google handles
                    data from the Gemini API, please refer to Google's Privacy
                    Policy and the Gemini API's terms of service.{'\n\n'}
                  </Text>

                  <Text style={styles.privacySectionTitle}>Contact{'\n'}</Text>
                  <Text style={styles.privacyText}>
                    If you have any questions about this privacy policy, please
                    contact us through the app store.{'\n\n'}
                  </Text>

                  {/* <Text style={styles.privacyText}>
                  Last updated: {new Date().toLocaleDateString()}
                </Text> */}
                </View>
              </ScrollView>
            </MaybeBlurView>
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
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
        <View
          style={{
            flex: 1,
            margin: isTablet ? spacing.xl : spacing.md,
            borderRadius: borderRadius.xl,
            backgroundColor: 'transparent',
          }}>
          <MaybeBlurView
            header
            style={[
              {
                marginTop: 20,
              },
            ]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}>
              <Ionicons
                name="document-text"
                size={20}
                color={colors.text.muted}
              />
              <Text style={styles.modalTitle}>Terms of Service</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowTosModal(false)}
              style={{
                padding: spacing.sm,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.round,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: colors.modal.content,
              }}>
              <Ionicons name="close" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </MaybeBlurView>
          <View
            style={{
              flex: 1,
              overflow: 'hidden',
              borderRadius: borderRadius.xl,
            }}>
            <MaybeBlurView body style={{flex: 1}}>
              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}>
                <View style={styles.privacyContent}>
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
                    This app relies on a Google Gemini API key that you, the
                    user, must provide. You are solely responsible for all API
                    usage associated with your key, including any potential
                    costs incurred. By using your key, you agree to and are
                    bound by Google’s Generative AI terms of service.{'\n\n'}
                  </Text>

                  <Text style={styles.privacySectionTitle}>
                    2. AI-Generated Content Disclaimer{'\n'}
                  </Text>
                  <Text style={styles.privacyText}>
                    The chat responses in this app are generated by an
                    artificial intelligence model. The content is for
                    informational and entertainment purposes only and should not
                    be considered factual, professional, or definitive. We do
                    not guarantee the accuracy, completeness, or usefulness of
                    any information provided.{'\n\n'}
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
                    This app is provided "as is" and without any warranty. We
                    are not liable for any damages or issues that may arise from
                    your use of the application.{'\n\n'}
                  </Text>

                  {/* <Text style={styles.privacyText}>
                  Last updated: {new Date().toLocaleDateString()}
                </Text> */}
                </View>
              </ScrollView>
            </MaybeBlurView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AboutLegalScreen;
