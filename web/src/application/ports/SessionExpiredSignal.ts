/** Fires when the server rejects our token, so the app can sign the user out. */
export interface SessionExpiredSignal {
  subscribe(listener: () => void): () => void;
}
