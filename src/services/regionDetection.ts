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
    return null;
  }
};

/**
 * Detects user's region using IP geolocation services
 * Uses multiple services for redundancy
 * Falls back to 'US' if all services fail
 */
export const detectRegion = async (): Promise<string | null> => {
  try {
    // Try to get existing region from settings first
    const existingRegion = await SettingsManager.getRegion();
    if (existingRegion?.iso_3166_1) {
      return existingRegion.iso_3166_1;
    }

    // Try primary service
    const regionCode = await getRegionFromIpApi();
    if (regionCode) {
      // Don't set region here, just return the code
      return regionCode;
    }

    // Fallback to secondary service
    const regionCode2 = await getRegionFromIpInfo();
    if (regionCode2) {
      // Don't set region here, just return the code
      return regionCode2;
    }

    // If all else fails, return null to let the user select their region
    return null;
  } catch (error) {
    return null;
  }
};
