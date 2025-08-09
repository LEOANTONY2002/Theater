import {UIManager} from 'react-native';

export const isTV = () => {
  const uiModeManager = UIManager.getViewManagerConfig('TV');
  console.log('uiModeManager', uiModeManager);
  return uiModeManager;
};

export const isMobile = () => {
  return !isTV();
};
