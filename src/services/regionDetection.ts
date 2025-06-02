import {SettingsManager} from '../store/settings';

interface IpApiResponse {
  countryCode: string;
}

interface IpInfoResponse {
  country: string;
}

const IPAPI_ENDPOINT = 'https://ipapi.co/json';
const IPINFO_ENDPOINT = 'https://ipinfo.io/json';

/**
 * Attempts to get region from ipapi.co
 */
const getRegionFromIpApi = async (): Promise<string | null> => {
  try {
    const response = await fetch(IPAPI_ENDPOINT);
    const data: IpApiResponse = await response.json();
    return data.countryCode || null;
  } catch (error) {
    console.warn('Failed to get region from ipapi.co:', error);
    return null;
  }
};

/**
 * Attempts to get region from ipinfo.io
 */
const getRegionFromIpInfo = async (): Promise<string | null> => {
  try {
    const response = await fetch(IPINFO_ENDPOINT);
    const data: IpInfoResponse = await response.json();
    return data.country || null;
  } catch (error) {
    console.warn('Failed to get region from ipinfo.io:', error);
    return null;
  }
};

/**
 * Detects user's region using IP geolocation services
 * Uses multiple services for redundancy
 * Falls back to 'US' if all services fail
 */
export const detectRegion = async (): Promise<string> => {
  try {
    // Try to get existing region from settings first
    // const existingRegion = await SettingsManager.getRegion();
    // if (existingRegion) {
    //   return existingRegion;
    // }

    // Try ipapi.co first
    const ipapiRegion = await getRegionFromIpApi();
    console.log('ipapiRegion', ipapiRegion);
    if (ipapiRegion) {
      await SettingsManager.setRegion(ipapiRegion);
      return ipapiRegion;
    }

    // Fall back to ipinfo.io
    const ipinfoRegion = await getRegionFromIpInfo();
    console.log('ipinfoRegion', ipinfoRegion);
    if (ipinfoRegion) {
      await SettingsManager.setRegion(ipinfoRegion);
      return ipinfoRegion;
    }

    // If all services fail, default to 'US'
    console.warn('All region detection services failed, defaulting to US');
    await SettingsManager.setRegion('US');
    return 'US';
  } catch (error) {
    console.error('Error detecting region:', error);
    await SettingsManager.setRegion('US');
    return 'US';
  }
};
