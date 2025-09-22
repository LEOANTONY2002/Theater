import {UIManager} from 'react-native';

export const isTV = () => {
  const uiModeManager = UIManager.getViewManagerConfig('TV');
  return uiModeManager;
};

export const isMobile = () => {
  return !isTV();
};
