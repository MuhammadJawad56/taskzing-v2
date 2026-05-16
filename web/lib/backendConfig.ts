/**
 * App data layer uses the TaskZing REST API (not Firebase).
 * Default base URL matches Flutter — Railway production.
 */
export {
  getApiBaseUrl,
  getServerBackendBaseUrl,
  isBackendConfigured,
  API_BASE_URL,
  BROWSER_API_PROXY_PREFIX,
  resolveApiRequestUrl,
  TASKZING_API_DEFAULT_BASE_URL,
} from "./api/http";
