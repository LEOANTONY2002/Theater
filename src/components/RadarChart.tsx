import React from 'react';
import {View, Text} from 'react-native';
import Svg, {Polygon, Line, Circle, Text as SvgText} from 'react-native-svg';

interface RadarData {
  label: string;
  value: number; // 0 to 100 usually, or normalized
}

interface RadarChartProps {
  data: RadarData[];
  size?: number;
  maxVal?: number;
  strokeColor?: string;
  fillColor?: string;
  labelColor?: string;
}

export const RadarChart = ({
  data,
  size = 200,
  maxVal = 100,
  strokeColor = '#fff',
  fillColor = 'rgba(255, 255, 255, 0.4)',
  labelColor = '#aaa',
}: RadarChartProps) => {
  const center = size / 2;
  const radius = (size - 140) / 2; // Leave MORE padding for labels
  const angleSlice = (Math.PI * 2) / data.length;

  // Helper to get coordinates
  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleSlice - Math.PI / 2; // Start from top
    const r = (value / maxVal) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Grid levels (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1];

  // Calculate polygon points for data
  const points = data
    .map((d, i) => {
      const {x, y} = getCoordinates(d.value, i);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg height={size} width={size}>
        {/* Draw Web/Grid */}
        {gridLevels.map((level, lvlIdx) => {
          const levelPoints = data
            .map((_, i) => {
              const {x, y} = getCoordinates(maxVal * level, i);
              return `${x},${y}`;
            })
            .join(' ');
          return (
            <Polygon
              key={`grid-${lvlIdx}`}
              points={levelPoints}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
              fill="transparent"
            />
          );
        })}

        {/* Draw Axes */}
        {data.map((_, i) => {
          const {x, y} = getCoordinates(maxVal, i);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data Polygon */}
        <Polygon
          points={points}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
          fillOpacity={0.5}
        />

        {/* Axis Labels */}
        {data.map((d, i) => {
          // Push labels out a bit further than maxVal
          const angle = i * angleSlice - Math.PI / 2;
          const labelRadius = radius + 25;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);

          // Adjust text anchor based on position
          let textAnchor = 'middle';
          if (Math.abs(x - center) > 10) {
            textAnchor = x > center ? 'start' : 'end';
          }

          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={y}
              fill={labelColor}
              fontSize="10"
              fontWeight="bold"
              textAnchor={textAnchor as 'start' | 'middle' | 'end'}
              alignmentBaseline="middle">
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};
