/** The seam the *Api classes depend on; paths are relative to the API base URL. */
export interface HttpClient {
  get<T>(path: string): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}
