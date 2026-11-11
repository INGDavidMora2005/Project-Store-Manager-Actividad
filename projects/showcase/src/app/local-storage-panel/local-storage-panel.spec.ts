import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocalStoragePanel } from './local-storage-panel';

describe('LocalStoragePanel', () => {
  let component: LocalStoragePanel;
  let fixture: ComponentFixture<LocalStoragePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalStoragePanel],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalStoragePanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
