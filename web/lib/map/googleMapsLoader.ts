/**
 * @react-google-maps/api allows only one useJsApiLoader id per JS runtime.
 * All pages/components must share this id (fixes Next.js static build failures).
 */
export const TASKZING_GOOGLE_MAPS_LOADER_ID = "taskzing-google-maps";

export function taskzingGoogleMapsLoaderConfig(googleMapsApiKey: string) {
  return {
    id: TASKZING_GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey,
  };
}
