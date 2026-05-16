/** @deprecated Import from ./imageGeneration — kept for existing imports. */
export {
  isPosterRequest,
  isTextToImageRequest,
  isVisualGenerationRequest,
  parseVisualSpec,
  parseVisualSpec as parsePosterSpec,
  generateVisualFromText,
  tryGenerateVisualFromMessage,
  tryGenerateVisualFromMessage as tryGeneratePosterFromMessage,
  type VisualGenerationResult,
  type VisualGenerationResult as PosterGenerationResult,
} from "./imageGeneration";

export { posterResponseToDataUrl } from "./api";
