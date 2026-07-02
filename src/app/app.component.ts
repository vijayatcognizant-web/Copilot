import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LinksService, Link } from './links.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private svc = inject(LinksService);

  url = '';
  submitting = signal(false);
  result = signal<Link | null>(null);
  apiError = signal<string | null>(null);
  inputError = signal<string | null>(null);
  links = signal<Link[]>([]);

  ngOnInit(): void {
    this.loadLinks();
  }

  submit(): void {
    this.apiError.set(null);
    this.result.set(null);
    this.inputError.set(null);

    try {
      const u = new URL(this.url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    } catch {
      this.inputError.set('Please enter a valid http or https URL.');
      return;
    }

    this.submitting.set(true);
    this.svc.create(this.url).subscribe({
      next: (link) => {
        this.result.set(link);
        this.submitting.set(false);
        this.url = '';
        this.loadLinks();
      },
      error: (err) => {
        this.apiError.set(err.error?.error ?? 'Network error — is the backend running?');
        this.submitting.set(false);
      },
    });
  }

  private loadLinks(): void {
    this.svc.getAll().subscribe({
      next: (data) => this.links.set(data),
      error: () => {},
    });
  }
}
