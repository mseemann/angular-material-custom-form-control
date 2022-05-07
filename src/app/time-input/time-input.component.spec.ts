import {ComponentFixture, TestBed} from '@angular/core/testing';

import {TimeInputComponent} from './time-input.component';
import {Component, DebugElement} from "@angular/core";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {By} from "@angular/platform-browser";
import {Time24Hours} from "../types";
import {MatFormFieldModule, MatLabel} from "@angular/material/form-field";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {Clipboard} from "@angular/cdk/clipboard";

class TimeInputComponentObject {

  private componentInstance: TimeInputComponent;

  constructor(private debugElement: DebugElement) {
    this.componentInstance = this.debugElement.componentInstance;
  }

  getDisplayValue() {
    const hourString = this.componentInstance.hoursEl?.nativeElement.value
    const minutesString = this.componentInstance.minutesEl?.nativeElement.value
    let timePeriodString = this.componentInstance.twelveHourPeriodsEl?.nativeElement.value ?? '';
    if (timePeriodString) {
      timePeriodString = ' ' + timePeriodString;
    }
    return `${hourString}:${minutesString}${timePeriodString}`;
  }

  blur() {
    this.componentInstance.containerEl?.nativeElement.dispatchEvent(new MouseEvent('focusout'));
  }

  inputHour(inputChar: string) {
    this.debugElement.queryAll(By.css('input'))[0].triggerEventHandler('keydown', {
      key: inputChar,
      preventDefault: () => {
      }
    })
  }

  inputMinute(inputChar: string) {
    this.debugElement.queryAll(By.css('input'))[1].triggerEventHandler('keydown', {
      key: inputChar,
      preventDefault: () => {
      }
    })
  }

  inputTimePeriod(inputChar: string) {
    this.debugElement.queryAll(By.css('input'))[2].triggerEventHandler('keydown', {
      key: inputChar,
      preventDefault: () => {
      }
    })
  }

  isHourInputActiveElement() {
    return (this.componentInstance.hoursEl?.nativeElement as HTMLElement).classList.contains('hours');
  }

  isMinutesInputActiveElement() {
    return (this.componentInstance.minutesEl?.nativeElement as HTMLElement).classList.contains('minutes');
  }

  isPeriodInputActiveElement() {
    return (this.componentInstance.twelveHourPeriodsEl?.nativeElement as HTMLElement).classList.contains('period');
  }

  getHourControl(): FormControl {
    return this.componentInstance.hours;
  }

  getMinutesControl(): FormControl {
    return this.componentInstance.minutes;
  }

  getPeriodControl() {
    return this.componentInstance.twelveHourPeriods;
  }

  isRequired() {
    return this.componentInstance.required;
  }

  setRequired() {
    this.componentInstance.required = true;
  }

  copyEvent() {
    this.debugElement.triggerEventHandler('copy', null);
  }
}

@Component({
  template: `
    <div [formGroup]="form">
      <mat-form-field>
        <mat-label>Time</mat-label>
        <app-time-input [formControl]="time" [twelveHourFormat]="twelveHourFormat"></app-time-input>
      </mat-form-field>
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
  let timeInputComponent: TimeInputComponentObject;
  let clipboard: Clipboard;

  beforeEach(async () => {
    clipboard = jasmine.createSpyObj<Clipboard>('clipboard', ['copy']);

    await TestBed.configureTestingModule({
      declarations: [TimeInputComponent, TestComponent],
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatFormFieldModule
      ],
      providers: [{provide: Clipboard, useValue: clipboard}]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    timeInputComponent = new TimeInputComponentObject(fixture.debugElement.query(By.directive(TimeInputComponent)));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable all parts if the control ist disabled', () => {
    component.time.disable();
    expect(timeInputComponent.getHourControl().disabled).toBeTruthy();
    expect(timeInputComponent.getMinutesControl().disabled).toBeTruthy();
    expect(timeInputComponent.getPeriodControl().disabled).toBeTruthy();
  });

  it('should enable all parts if the control ist enabled', () => {
    component.time.enable();
    expect(timeInputComponent.getHourControl().enabled).toBeTruthy();
    expect(timeInputComponent.getMinutesControl().enabled).toBeTruthy();
    expect(timeInputComponent.getPeriodControl().enabled).toBeTruthy();
  });

  it('should be required if the required validator is configured', () => {
    expect(timeInputComponent.isRequired()).toBeTruthy();
  });

  it('should be possible to set the required state manually', () => {
    component.time.clearValidators();
    expect(timeInputComponent.isRequired()).toBeFalsy();
    timeInputComponent.setRequired();
    expect(timeInputComponent.isRequired()).toBeTruthy();
  });

  it('should keep the hour value if an other key than a number is typed', () => {
    timeInputComponent.inputHour('1');
    expect(timeInputComponent.getDisplayValue()).toEqual('01:––');

    timeInputComponent.inputHour('x');
    expect(timeInputComponent.getDisplayValue()).toEqual('01:––');
  });

  it('should keep the minute value if an other key than a number is typed', () => {
    timeInputComponent.inputMinute('1');
    expect(timeInputComponent.getDisplayValue()).toEqual('––:01');

    timeInputComponent.inputMinute('x');
    expect(timeInputComponent.getDisplayValue()).toEqual('––:01');
  });

  it('should activate the next input if tab is typed', () => {
    fixture.debugElement.query(By.directive(MatLabel)).nativeElement.click();

    timeInputComponent.inputMinute('Tab');
    expect(timeInputComponent.isMinutesInputActiveElement()).toBeTruthy();
  });

  describe('24 hour format', () => {

    beforeEach(() => {
      component.twelveHourFormat = false;
    })

    it('should have dashes if the input is null', () => {
      component.time.setValue(null);

      expect(timeInputComponent.getDisplayValue()).toEqual('––:––');
    });

    it('should display the time if the input is not null', () => {
      component.time.setValue({hours: 2, minutes: 10} as Time24Hours);

      expect(timeInputComponent.getDisplayValue()).toEqual('02:10');
    });

    it('should copy the display value', () => {
      component.time.setValue({hours: 2, minutes: 10} as Time24Hours);

      timeInputComponent.copyEvent();

      expect(clipboard.copy).toHaveBeenCalledWith('02:10');
    });

    it('should active the hour part if the control is clicked', () => {
      fixture.debugElement.query(By.directive(MatLabel)).nativeElement.click();

      expect(timeInputComponent.isHourInputActiveElement()).toBeTruthy();
    });

    it('should display 22 if 2 is typed twice', () => {
      timeInputComponent.inputHour('2');
      expect(timeInputComponent.getDisplayValue()).toEqual('02:––');
      timeInputComponent.inputHour('2');
      expect(timeInputComponent.getDisplayValue()).toEqual('22:––');
    });

    it('should active minutes element if the hour element get the input 4 (because 23 is max)', () => {
      timeInputComponent.inputHour('4');

      expect(timeInputComponent.isMinutesInputActiveElement()).toBeTruthy();
      expect(timeInputComponent.getDisplayValue()).toEqual('04:––');
    });

    it('should result in 04:02 if 4 and 2 is typed', () => {
      timeInputComponent.inputHour('4');
      timeInputComponent.inputMinute('2');

      expect(timeInputComponent.isMinutesInputActiveElement()).toBeTruthy();
      expect(timeInputComponent.getDisplayValue()).toEqual('04:02');
    });

    it('should result in 04:09 if 4 and 9 is typed - and 9 is typed again', () => {
      timeInputComponent.inputHour('4');
      timeInputComponent.inputMinute('9');
      timeInputComponent.inputMinute('9');

      expect(timeInputComponent.isMinutesInputActiveElement()).toBeTruthy();
      expect(timeInputComponent.getDisplayValue()).toEqual('04:09');
      expect(component.time.value).toEqual({hours: 4, minutes: 9} as Time24Hours);
    });

    it('should result in 00:-- if arrow up is pressed on the hour input', () => {
      timeInputComponent.inputHour('ArrowUp');

      expect(timeInputComponent.getDisplayValue()).toEqual('00:––');
    });

    it('should increase the hour if arrow up is pressed', () => {
      component.time.setValue({hours: 2, minutes: 10} as Time24Hours);

      timeInputComponent.inputHour('ArrowUp');

      expect(timeInputComponent.getDisplayValue()).toEqual('03:10');
    });

    it('should mark the input as touched if the control los the focus', () => {
      expect(component.time.touched).toBeFalsy();
      timeInputComponent.blur();
      expect(component.time.touched).toBeTruthy();
    })
  });

  describe('12 hour format', () => {

    beforeEach(() => {
      component.twelveHourFormat = true;
      fixture.detectChanges();
    })

    it('should have dashes if the input is null', () => {
      component.time.setValue(null);

      expect(timeInputComponent.getDisplayValue()).toEqual('––:–– ––');
    });

    it('should display the time if the input is not null', () => {
      component.time.setValue({hours: 14, minutes: 10} as Time24Hours);

      expect(timeInputComponent.getDisplayValue()).toEqual('02:10 PM');
      expect(component.time.value).toEqual({hours: 14, minutes: 10} as Time24Hours);
    });

    it('should copy the display value', () => {
      component.time.setValue({hours: 14, minutes: 10} as Time24Hours);

      timeInputComponent.copyEvent();

      expect(clipboard.copy).toHaveBeenCalledWith('02:10 PM');
    });

    it('should increase the hour if ArrowUp is typed', () => {
      component.time.setValue({hours: 14, minutes: 10} as Time24Hours);

      timeInputComponent.inputHour('ArrowUp');

      expect(component.time.value).toEqual({hours: 15, minutes: 10} as Time24Hours);
    });

    it('should set time period to AM if a is typed', () => {
      timeInputComponent.inputTimePeriod('a');

      expect(timeInputComponent.getDisplayValue()).toEqual('––:–– AM');
    });

    it('should set time period to PM if p is typed', () => {
      timeInputComponent.inputTimePeriod('p');

      expect(timeInputComponent.getDisplayValue()).toEqual('––:–– PM');
    });

    it('should keep the period value if an other key as a or p is typed', () => {
      timeInputComponent.inputTimePeriod('p');
      expect(timeInputComponent.getDisplayValue()).toEqual('––:–– PM');

      timeInputComponent.inputTimePeriod('x');
      expect(timeInputComponent.getDisplayValue()).toEqual('––:–– PM');
    });

    it('should set time period to PM if a is typed and then ArrowDown', () => {
      timeInputComponent.inputTimePeriod('a');
      timeInputComponent.inputTimePeriod('ArrowDown');

      expect(timeInputComponent.getDisplayValue()).toEqual('––:–– PM');
    });

    it('should delete the minute if backspace is clicked', () => {
      component.time.setValue({hours: 14, minutes: 10} as Time24Hours);
      timeInputComponent.inputMinute('Backspace');
      expect(timeInputComponent.getDisplayValue()).toEqual('02:–– PM');
    });

    it('should convert 24 hour input to the correspondig 12 hour', () => {
      timeInputComponent.inputHour('1');
      timeInputComponent.inputHour('7');
      // 17:00 24 Hours is 5 PM
      expect(timeInputComponent.getDisplayValue()).toEqual('05:–– ––');
      expect(component.time.value).toBeNull();
    });

    it('should activate the hour input if arrow left is typed in minutes', () => {
      timeInputComponent.inputMinute('ArrowLeft');

      expect(timeInputComponent.isMinutesInputActiveElement()).toBeTruthy();
    });

    it('should activate the period input if arrow right is typed in minutes', () => {
      timeInputComponent.inputMinute('ArrowRight');

      expect(timeInputComponent.isPeriodInputActiveElement()).toBeTruthy();
    });

    it('should convert 12 AM to 0 for 24 hour mode - abd vice versa', () => {
      component.time.setValue({hours: 0, minutes: 10} as Time24Hours);
      expect(timeInputComponent.getDisplayValue()).toEqual('12:10 AM');

      timeInputComponent.inputMinute('ArrowDown');
      expect(component.time.value).toEqual({hours: 0, minutes: 9} as Time24Hours)
    });

  });

});
