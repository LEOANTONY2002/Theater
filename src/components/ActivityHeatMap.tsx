import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, spacing, typography} from '../styles/theme';

interface ActivityHeatMapProps {
  dates: (string | Date)[];
  title?: string;
  weeks?: number; // Default ~20
}

const CELL_SIZE = 12;
const GAP = 4;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ActivityHeatMap: React.FC<ActivityHeatMapProps> = ({
  dates,
  title = 'Viewing Activity',
  weeks = 20,
}) => {
  // 1. Process Data
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    dates.forEach(d => {
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      if (!isNaN(dateObj.getTime())) {
        const key = dateObj.toISOString().split('T')[0];
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [dates]);

  // 2. Generate Grid
  const {grid, months} = useMemo(() => {
    const today = new Date();
    const result = [];
    const msPerDay = 24 * 60 * 60 * 1000;

    // Determine the Sunday of the first week to show.
    const startSunday = new Date(today);
    // Go back 'weeks' weeks, then find Sunday.
    startSunday.setDate(today.getDate() - (weeks - 1) * 7 - today.getDay());

    const candidates: {label: string; weekIndex: number}[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const weekDays = [];
      const weekStart = new Date(startSunday.getTime() + w * 7 * msPerDay);

      // Check Month
      const currentMonth = weekStart.getMonth();
      if (currentMonth !== lastMonth) {
        if (w < weeks - 1) {
          // Don't label the very last week just to be safe
          candidates.push({
            label: weekStart.toLocaleString('default', {month: 'short'}),
            weekIndex: w,
          });
        }
        lastMonth = currentMonth;
      }

      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart.getTime() + d * msPerDay);
        const str = date.toISOString().split('T')[0];

        // Is it in the future?
        const isFuture = date > today;

        weekDays.push({
          date: str,
          count: activityMap.get(str) || 0,
          isFuture,
        });
      }
      result.push(weekDays);
    }

    // Post-process labels to avoid overlap
    const monthLabels: {label: string; weekIndex: number}[] = [];

    candidates.forEach(c => {
      if (monthLabels.length === 0) {
        monthLabels.push(c);
      } else {
        const prev = monthLabels[monthLabels.length - 1];
        // If overlap (distance < 2 columns)
        if (c.weekIndex - prev.weekIndex < 2) {
          // If the previous label was at start (cutoff), replace it with the new one
          if (prev.weekIndex === 0) {
            monthLabels.pop();
            monthLabels.push(c);
          }
          // Else keep "prev" and skip "c"
        } else {
          monthLabels.push(c);
        }
      }
    });

    return {grid: result, months: monthLabels};
  }, [weeks, activityMap]);

  const getColor = (count: number, isFuture: boolean) => {
    if (isFuture) return 'transparent';
    if (count === 0) return 'rgba(255,255,255,0.05)';
    if (count <= 1) return 'rgba(100, 255, 218, 0.3)';
    if (count <= 2) return 'rgba(100, 255, 218, 0.6)';
    return 'rgba(100, 255, 218, 1.0)';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Last {Math.round(weeks / 4.3)} Months
        </Text>
      </View>

      <View style={styles.contentRow}>
        {/* Left Column: Day Labels */}
        <View style={styles.dayLabelsCol}>
          {DAYS.map((day, index) => (
            <View key={index} style={styles.labelWrapper}>
              {(index === 1 || index === 3 || index === 5) && (
                <Text style={styles.dayLabel}>{day}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Right Block: Heatmap */}
        <View>
          {/* Month Labels */}
          <View style={styles.monthsRow}>
            {months.map((m, i) => (
              <Text
                key={i}
                style={[
                  styles.monthLabel,
                  {
                    left: m.weekIndex * (CELL_SIZE + GAP),
                  },
                ]}>
                {m.label}
              </Text>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {grid.map((week, wIndex) => (
              <View key={wIndex} style={styles.weekCol}>
                {week.map((dayData, dIndex) => (
                  <View
                    key={dIndex}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: getColor(
                          dayData.count,
                          dayData.isFuture,
                        ),
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Footer / Legend */}
      <View style={styles.footer}>
        <Text style={styles.legendLabel}>Less</Text>
        <View
          style={[styles.cell, {backgroundColor: 'rgba(255,255,255,0.05)'}]}
        />
        <View
          style={[styles.cell, {backgroundColor: 'rgba(100, 255, 218, 0.3)'}]}
        />
        <View
          style={[styles.cell, {backgroundColor: 'rgba(100, 255, 218, 0.6)'}]}
        />
        <View
          style={[styles.cell, {backgroundColor: 'rgba(100, 255, 218, 1.0)'}]}
        />
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dayLabelsCol: {
    marginRight: 8,
    marginTop: 20, // Match monthsRow height
    justifyContent: 'flex-start',
    gap: GAP,
  },
  labelWrapper: {
    height: CELL_SIZE,
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    lineHeight: 12,
  },
  monthsRow: {
    height: 20,
    position: 'relative',
    marginBottom: 0,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    color: colors.text.tertiary,
    top: 0,
  },
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  weekCol: {
    gap: GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginHorizontal: 4,
  },
});
