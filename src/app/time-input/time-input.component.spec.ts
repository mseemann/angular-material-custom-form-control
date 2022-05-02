import {ComponentFixture, TestBed} from '@angular/core/testing';

import {TimeInputComponent} from './time-input.component';
import {Component} from "@angular/core";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatIconModule} from "@angular/material/icon";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {By} from "@angular/platform-browser";
import {Time24Hours} from "../types";

@Component({
  template: `
    <div [formGroup]="form">
      <app-time-input [formControl]="time" [twelveHourFormat]="twelveHourFormat"></app-time-input>
    </div>
  `
})
class TestComponent {
  time = new FormControl(null, Validators.required);
  form = new FormGroup({time: this.time})
  twelveHourFormat = false;
}

describe('TimeInputComponent', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let timeInputComponet: TimeInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TimeInputComponent, TestComponent],
      imports: [
        ReactiveFormsModule
      ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    timeInputComponet = fixture.debugElement.query(By.directive(TimeInputComponent)).componentInstance
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('24 hour format', () => {

    beforeEach(() => {
      component.twelveHourFormat = false;
    })

    it('should have dashes if the input is null', () => {
      component.time.setValue(null);

      fixture.detectChanges();

      expect(timeInputComponet.hoursEl?.nativeElement.value).toEqual('––');
      expect(timeInputComponet.minutesEl?.nativeElement.value).toEqual('––');
      expect(timeInputComponet.twelveHourPeriodsEl).not.toBeDefined();
    });

    it('should have the time part values if the input is not null', () => {
      component.time.setValue({hours: 2, minutes: 10} as Time24Hours);
      fixture.detectChanges();

      expect(timeInputComponet.hoursEl?.nativeElement.value).toEqual('02');
      expect(timeInputComponet.minutesEl?.nativeElement.value).toEqual('10');
      expect(timeInputComponet.twelveHourPeriodsEl).not.toBeDefined();
    });

  });


});
