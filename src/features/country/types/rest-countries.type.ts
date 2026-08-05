/**
 * @description Subset of the REST Countries v5 payload we request via `response_fields`.
 * https://api.restcountries.com/countries/v5?q=<query>
 * */
export interface RestCountriesTranslation {
  common: string;
  official: string;
}

export interface RestCountriesObject {
  names: {
    common: string;
    official: string;
    /** Keyed by ISO 639-3 code. Romanian (`ron`) is absent from the dataset. */
    translations?: Record<string, RestCountriesTranslation | undefined>;
  };
  codes: {
    alpha_3: string;
  };
  flag?: {
    emoji?: string;
  };
}

export interface RestCountriesResponse {
  data: {
    objects: RestCountriesObject[];
    meta: {
      total: number;
      count: number;
      limit: number;
      offset: number;
      more: boolean;
    };
  };
}
