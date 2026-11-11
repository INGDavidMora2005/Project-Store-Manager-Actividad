import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CacheStoragePanel } from './cache-storage-panel';

describe('CacheStoragePanel', () => {
  let component: CacheStoragePanel;
  let fixture: ComponentFixture<CacheStoragePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CacheStoragePanel],
    }).compileComponents();

    fixture = TestBed.createComponent(CacheStoragePanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
