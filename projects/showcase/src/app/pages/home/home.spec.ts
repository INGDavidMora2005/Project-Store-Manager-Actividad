import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home';

describe('HomePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomePage);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('debe mostrar la descripción, el comando de instalación y los enlaces', async () => {
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.home__command')?.textContent).toContain(
      'npm install ngx-uceva-storage-manager',
    );
    expect(compiled.textContent).toContain('LocalStorage');
    expect(compiled.textContent).toContain('Cache Storage');

    const links = Array.from(compiled.querySelectorAll<HTMLAnchorElement>('.home__card-link'));

    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toContain('local-storage');
    expect(links[1].getAttribute('href')).toContain('cache-storage');
  });
});
