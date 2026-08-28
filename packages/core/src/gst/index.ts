// Place of supply, GSTIN parse/validate, and financial-year helpers.
// Build spec §5.2. Pure functions — no database, no clock unless injected.

export {
  GSTIN_ERROR_MESSAGES,
  GSTIN_LENGTH,
  gstinCheckDigit,
  isValidGstin,
  normaliseGstin,
  panFromGstin,
  stateCodeFromGstin,
  validateGstin,
  type GstinError,
  type GstinParts,
  type GstinValidation,
} from './gstin';

export {
  placeOfSupplyWarning,
  resolvePlaceOfSupply,
  type PlaceOfSupply,
  type PlaceOfSupplyInput,
} from './place-of-supply';

export {
  currentFinancialYear,
  financialYear,
  financialYearEnd,
  financialYearStart,
  isDateInFinancialYear,
  parseFinancialYear,
  todayInIndia,
  type DateString,
} from './financial-year';
