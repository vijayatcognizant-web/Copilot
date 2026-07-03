import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Link {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class LinksService {
  private http = inject(HttpClient);
  // Relative URL works for every deployment (bundle at :3000, Railway, Docker, etc.)
  // In development (ng serve at :4200) the proxy.conf.json forwards /api → :3000.
  private api = '/api/links';

  create(url: string): Observable<Link> {
    return this.http.post<Link>(this.api, { url });
  }

  getAll(): Observable<Link[]> {
    return this.http.get<Link[]>(this.api);
  }
}
