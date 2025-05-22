import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

export const BannerSkeleton = () => (
  <SkeletonPlaceholder>
    <SkeletonPlaceholder.Item
      width="100%"
      height={200}
      borderRadius={12}
      marginBottom={16}
    />
  </SkeletonPlaceholder>
);

export const HeadingSkeleton = () => (
  <SkeletonPlaceholder
    highlightColor="rgba(0,0,0,0.8)"
    backgroundColor="rgba(26, 0, 78, 0.19)">
    <SkeletonPlaceholder.Item
      width={250}
      height={50}
      borderRadius={12}
      marginBottom={16}
    />
  </SkeletonPlaceholder>
);

export const HorizontalListSkeleton = () => (
  <SkeletonPlaceholder
    highlightColor="rgba(0,0,0,0.8)"
    backgroundColor="rgba(26, 0, 78, 0.19)">
    <SkeletonPlaceholder.Item
      flexDirection="row"
      alignItems="center"
      marginBottom={48}>
      {[...Array(3)].map((_, idx) => (
        <SkeletonPlaceholder.Item
          key={idx}
          width={150}
          height={180}
          borderRadius={8}
          marginRight={12}
        />
      ))}
    </SkeletonPlaceholder.Item>
  </SkeletonPlaceholder>
);

export const GridSkeleton = () => (
  <SkeletonPlaceholder
    highlightColor="rgba(0,0,0,0.8)"
    backgroundColor="rgba(26, 0, 78, 0.19)">
    <SkeletonPlaceholder.Item
      flexDirection="row"
      flexWrap="wrap"
      alignItems="center"
      gap={5}>
      {[...Array(15)].map((_, idx) => (
        <SkeletonPlaceholder.Item
          key={idx}
          width={80}
          height={120}
          borderRadius={8}
        />
      ))}
    </SkeletonPlaceholder.Item>
  </SkeletonPlaceholder>
);
