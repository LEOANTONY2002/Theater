import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import FastImage from 'react-native-fast-image';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl} from '../services/tmdb';
import {ProductionCompany, SpokenLanguage} from '../types/movie';
import {ReleaseDate, ContentRating} from '../types/movie';

interface ProductionInfoProps {
  productionCompanies?: ProductionCompany[];
  spokenLanguages?: SpokenLanguage[];
  budget?: number;
  revenue?: number;
  certification?: string;
}

export const ProductionInfo: React.FC<ProductionInfoProps> = ({
  productionCompanies,
  spokenLanguages,
  budget,
  revenue,
  certification,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasAnyData =
    (productionCompanies && productionCompanies.length > 0) ||
    (spokenLanguages && spokenLanguages.length > 0) ||
    (budget && budget > 0) ||
    (revenue && revenue > 0) ||
    certification;

  if (!hasAnyData) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Production Info</Text>

      {/* Budget & Revenue */}
      {((budget || 0) > 0 || (revenue || 0) > 0) && (
        <View style={styles.infoBlock}>
          <View style={styles.financialRow}>
            {(budget || 0) > 0 && (
              <View style={styles.financialItem}>
                <Text style={styles.label}>Budget</Text>
                <Text style={styles.value}>{formatCurrency(budget!)}</Text>
              </View>
            )}
            {(revenue || 0) > 0 && (
              <View style={styles.financialItem}>
                <Text style={styles.label}>Revenue</Text>
                <Text style={styles.value}>{formatCurrency(revenue!)}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Certification */}
      {certification && (
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Content Rating</Text>
          <Text style={styles.value}>{certification}</Text>
        </View>
      )}

      {/* Production Companies */}
      {productionCompanies && productionCompanies.length > 0 && (
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Production Companies</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.companiesList}>
            {productionCompanies.map(company => (
              <View key={company.id} style={styles.companyItem}>
                {company.logo_path ? (
                  <FastImage
                    source={{uri: getImageUrl(company.logo_path, 'w185')}}
                    style={styles.companyLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.companyPlaceholder}>
                    <Text style={styles.companyInitial}>
                      {company.name.charAt(0)}
                    </Text>
                  </View>
                )}
                <Text style={styles.companyName} numberOfLines={2}>
                  {company.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Spoken Languages */}
      {spokenLanguages && spokenLanguages.length > 0 && (
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Spoken Languages</Text>
          <View style={styles.languagesContainer}>
            {spokenLanguages.map((lang, index) => (
              <Text key={lang.iso_639_1} style={styles.language}>
                {lang.english_name}
                {index < spokenLanguages.length - 1 && ', '}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoBlock: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body2,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  value: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  financialRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  financialItem: {
    flex: 1,
  },
  companiesList: {
    gap: spacing.md,
  },
  companyItem: {
    width: 120,
    alignItems: 'center',
  },
  companyLogo: {
    width: 100,
    height: 60,
    marginBottom: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  companyPlaceholder: {
    width: 100,
    height: 60,
    marginBottom: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInitial: {
    ...typography.h2,
    color: colors.text.muted,
  },
  companyName: {
    ...typography.caption,
    color: colors.text.primary,
    textAlign: 'center',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  language: {
    ...typography.body2,
    color: colors.text.primary,
  },
});
