export type ApiContext = 'IGNORE_SUCCESS' | 'IGNORE_ERROR';

export type AllowedMethods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'QUERY';

export interface EndpointData {
   route: string;
   method: AllowedMethods;
}

export interface ErrorDetails {
   field: string;
   detail: string;
}

export interface EpError {
   message: string;
   details: ErrorDetails[];
}

export interface EpPreview {
   success: boolean;
   data: object | null;
   error: EpError | null;
}
