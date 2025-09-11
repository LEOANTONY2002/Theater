import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import packageJson from '../../package.json';
import {useResponsive} from '../hooks/useResponsive';

const AboutLegalScreen: React.FC = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTosModal, setShowTosModal] = useState(false);
  const {isTablet, orientation} = useResponsive();

  const styles = StyleSheet.create({
    section: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tmdbLogoWrapper: {
      padding: 2,
      borderRadius: 4,
      alignSelf: 'center',
    },
    tmdbLogo: {width: 30, height: 30, opacity: 0.5},
    footerText: {
      color: colors.text.tertiary || '#aaa',
      fontSize: 10,
      textAlign: 'center',
      marginTop: spacing.xs,
      fontFamily: 'Inter',
      opacity: 0.5,
      marginVertical: spacing.xxl,
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
          width: isTablet ? '60%' : '85%',
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
          width: isTablet ? 150 : 100,
          height: isTablet ? 170 : 120,
          position:
            isTablet && orientation === 'portrait' ? 'absolute' : 'relative',
          bottom: isTablet && orientation === 'portrait' ? 170 : 0,
        }}
        resizeMode="contain"
      />

      <View style={{height: 20}} />

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
