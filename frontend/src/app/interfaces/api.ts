export type CustomHeaders = 'ignoreError';

export interface EndpointData {
   route: string;
   method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'QUERY';
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
