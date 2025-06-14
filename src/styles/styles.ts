import {StyleSheet} from 'react-native';
import {borderRadius, colors, spacing, typography} from './theme';

export const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.modal.background,
  },
  modalContent: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.modal.border,
    backgroundColor: colors.modal.header,
  },
  modalTitle: {
    color: colors.text.primary,
    ...typography.h2,
  },
  closeButton: {
    padding: spacing.sm,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.modal.active,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    ...typography.body1,
  },
  contentTypeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  contentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeButton: {
    borderColor: colors.accent,
    backgroundColor: colors.modal.active,
  },
  contentTypeText: {
    color: colors.text.secondary,
    ...typography.button,
  },
  activeText: {
    color: colors.accent,
  },
  pickerContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    paddingLeft: spacing.sm,
  },
  picker: {
    color: colors.text.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dateButton: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dateButtonText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.modal.active,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: borderRadius.round,
  },
  footerButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: colors.button.reset,
  },
  resetButtonText: {
    color: colors.text.primary,
    ...typography.button,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    color: colors.background.primary,
    ...typography.button,
  },
  applyButton: {
    backgroundColor: colors.accent,
  },
  applyButtonText: {
    color: colors.background.primary,
    ...typography.button,
  },
  loadingContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genresContainer: {
    flex: 1,
    gap: 4,
    alignSelf: 'center',
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
});
