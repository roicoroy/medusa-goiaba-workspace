import { TestBed } from '@angular/core/testing';
import { Store } from '@ngxs/store';
import { of } from 'rxjs';

import { ThemeService } from './theme';

describe('ThemeService', () => {
  let service: ThemeService;

  const storeMock = {
    dispatch: jest.fn().mockReturnValue(of({})),
    select: jest.fn().mockReturnValue(of('system')),
    selectSnapshot: jest.fn().mockReturnValue('system'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Store, useValue: storeMock }],
    });
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
