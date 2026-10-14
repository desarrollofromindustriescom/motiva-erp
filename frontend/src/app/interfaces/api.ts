export type CustomHeaders = 'ignoreError' | 'resourceKey';

export interface EndpointData {
   route: string;
   method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'QUERY';
}

export interface ApiErrorDetail {
   field: string;
   detail: string;
}

export interface ApiError {
   message: string;
   details: ApiErrorDetail[];
}

export interface PayloadResponse {
   success: boolean;
   data: object | null;
   error: ApiError | null;
}
