import type { SessionGateway } from '../../application/ports/SessionGateway';
import type { SessionSummary } from '../../domain/types';
import type { HttpClient } from '../http/HttpClient';

export class SessionApi implements SessionGateway {
  constructor(private readonly http: HttpClient) {}

  today(): Promise<SessionSummary> {
    return this.http.get('/api/session/today');
  }

  start(skipNewCards: boolean): Promise<SessionSummary> {
    return this.http.post('/api/session/start', { skipNewCards });
  }
}
