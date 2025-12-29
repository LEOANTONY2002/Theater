import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import FastImage from 'react-native-fast-image';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl} from '../services/tmdb';

interface Network {
  id: number;
  name: string;
  logo_path: string | null;
}

interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
}

interface TVShowProductionInfoProps {
  status?: string;
  networks?: Network[];
  productionCompanies?: ProductionCompany[];
  certification?: string;
  firstAirDate?: string;
}

export const TVShowProductionInfo: React.FC<TVShowProductionInfoProps> = ({
  status,
  networks,
  productionCompanies,
  certification,
  firstAirDate,
}) => {
  const formatFirstAirDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const hasAnyData =
    status ||
    (networks && networks.length > 0) ||
    (productionCompanies && productionCompanies.length > 0) ||
    certification ||
    firstAirDate;

  if (!hasAnyData) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Production Info</Text>

      {/* Status */}
      {status && (
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{status}</Text>
        </View>
      )}

      {/* Certification */}
      {certification && (
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Content Rating</Text>
          <Text style={styles.value}>{certification}</Text>
        </View>
      )}

      {/* Networks */}
      {networks && networks.length > 0 && (
        <View style={styles.infoBlock}>
          <Text style={styles.label}>Networks</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.companiesList}>
            {networks.map(network => (
              <View key={network.id} style={styles.companyItem}>
                {network.logo_path ? (
                  <FastImage
                    source={{uri: getImageUrl(network.logo_path, 'w185')}}
                    style={styles.companyLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.companyPlaceholder}>
                    <Text style={styles.companyInitial}>
                      {network.name.charAt(0)}
                    </Text>
                  </View>
                )}
                <Text style={styles.companyName} numberOfLines={2}>
                  {network.name}
                </Text>
              </View>
            ))}
          </ScrollView>
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

      {/* First Air Date */}
      {firstAirDate && (
        <View style={styles.infoBlock}>
          <Text style={styles.label}>First Air Date</Text>
          <Text style={styles.value}>{formatFirstAirDate(firstAirDate)}</Text>
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
});
