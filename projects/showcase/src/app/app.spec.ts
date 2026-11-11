import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

@Component({
  selector: 'app-test-route',
  template: '',
})
class TestRouteComponent {}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: '', component: TestRouteComponent }])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('debe renderizar el encabezado, la navegación y el pie de página', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.showcase-brand__title')?.textContent).toContain(
      'Storage Manager Showcase',
    );
    expect(compiled.querySelector('router-outlet')).toBeTruthy();

    const links = Array.from(compiled.querySelectorAll<HTMLAnchorElement>('.showcase-nav__link'));

    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Inicio',
      'LocalStorage',
      'Cache Storage',
    ]);

    expect(compiled.textContent).toContain('ngx-uceva-storage-manager');
    expect(compiled.textContent).toContain('Proyecto de Arquitectura de Software - UCEVA');
  });
});
