import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  Optional,
  Self,
  ViewChild
} from '@angular/core';
import {ControlValueAccessor, FormControl, FormGroup, NgControl, Validators} from "@angular/forms";
import {MatFormFieldControl} from "@angular/material/form-field";
import {Subject} from "rxjs";
import {BooleanInput, coerceBooleanProperty} from "@angular/cdk/coercion";
import {Time24Hours} from "../types";

const number22DigitString = (n: number): string => {
  return n.toLocaleString("de-DE", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  })
}

type Parts = {
  hours: string,
  minutes: string,
  twelveHourPeriods: string | null
}

const EMPTY = '––'; // &#8211; –– en dash

const TWELVE_HOUR_PERIOD_VALUES = ['AM', 'PM'];

const HOURS_12_HOUR = [...Array(12).keys()].map(hour => hour + 1).map(number22DigitString); // 01..12
const HOURS_24_HOUR = [...Array(24).keys()].map(number22DigitString); // 00..23
const MINUTES = [...Array(60).keys()].map(number22DigitString); // 00..59

const KEYS_2_IGNORE = ['Tab'];
const NAVIGATION_KEYS = ['Backspace', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

interface HourModeStrategy {
  convert2Time(parts: Parts): Time24Hours | null;
  convert2Parts(time: Time24Hours | null): Parts;
}

class TwelveHourModeStrategy implements HourModeStrategy {
  convert2Time(parts: Parts): Time24Hours | null {
    if (parts.minutes === EMPTY || parts.hours === EMPTY || parts.twelveHourPeriods === EMPTY) {
      return null;
    }
    let hours = Number(parts.hours)
    if (hours === 12) {
      hours = 0;
    }
    if (parts.twelveHourPeriods === 'PM') {
      hours = hours + 12;
    }
    return {hours, minutes: Number(parts.minutes)};
  }

  convert2Parts(time: Time24Hours | null): Parts {
    if (!time) {
      return {hours: EMPTY, minutes: EMPTY, twelveHourPeriods: EMPTY}
    } else {
      const timeString12hr = new Date(`1970-01-01T${time.hours}:${time.minutes}:00Z`)
        .toLocaleTimeString('en-US',
          {timeZone: 'UTC', hour12: true, hour: '2-digit', minute: '2-digit'}
        );
      const parts = timeString12hr.match(/([0-9]{2}):([0-9]{2}) ([(A|P)M]{2})/);
      if (!parts) {
        throw new Error(`timeString12hr did not match  hh:mm AP`)
      }
      return {hours: parts[1], minutes: parts[2], twelveHourPeriods: parts[3]};
    }
  }
}

class TwentyForHourModeStrategy implements HourModeStrategy {

  convert2Time(parts: Parts): Time24Hours | null {
    if (parts.minutes === EMPTY || parts.hours === EMPTY) {
      return null;
    }
    return {hours: Number(parts.hours), minutes: Number(parts.minutes)};
  }

  convert2Parts(time: Time24Hours | null): Parts {
    if (time) {
      return {
        hours: number22DigitString(time.hours),
        minutes: number22DigitString(time.minutes),
        twelveHourPeriods: null
      }
    } else {
      return {hours: EMPTY, minutes: EMPTY, twelveHourPeriods: null}
    }
  }
}


@Component({
  selector: 'app-time-input',
  templateUrl: './time-input.component.html',
  styleUrls: ['./time-input.component.scss'],
  providers: [{provide: MatFormFieldControl, useExisting: TimeInputComponent}],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeInputComponent implements ControlValueAccessor, MatFormFieldControl<Time24Hours>, OnDestroy {
  static nextId = 0;

  readonly hours = new FormControl();
  readonly minutes = new FormControl();
  readonly twelveHourPeriods = new FormControl();
  readonly parts = new FormGroup({hours: this.hours, minutes: this.minutes, twelveHourPeriods: this.twelveHourPeriods});
  readonly stateChanges = new Subject<void>();
  @HostBinding() readonly id = `app-time-input-${TimeInputComponent.nextId++}`;
  @ViewChild('containerEl', {static: true}) containerEl: ElementRef | undefined;
  @ViewChild('hoursEl', {static: true}) hoursEl: ElementRef | undefined;
  @ViewChild('twelveHourPeriodsEl', {static: false}) twelveHourPeriodsEl: ElementRef | undefined;
  @ViewChild('minutesEl', {static: true}) minutesEl: ElementRef | undefined;
  focused = false;
  private touched = false;
  private hourModeStrategy = new TwentyForHourModeStrategy();

  constructor(@Optional() @Self() public ngControl: NgControl | null, private elementRef: ElementRef) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  private _twelveHourFormat = false;

  get twelveHourFormat(): boolean {
    return this._twelveHourFormat;
  }

  @Input()
  set twelveHourFormat(value: BooleanInput) {
    this._twelveHourFormat = coerceBooleanProperty(value);
    this.hourModeStrategy = this._twelveHourFormat ? new TwelveHourModeStrategy() : new TwentyForHourModeStrategy();

  };

  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  private _required: boolean | undefined;

  @Input()
  get required(): boolean {
    return this._required ?? this.ngControl?.control?.hasValidator(Validators.required) ?? false;
  }

  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
  }

  private _disabled = false;

  @Input()
  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: BooleanInput) {
    this._disabled = coerceBooleanProperty(value);
    this._disabled ? this.parts.disable() : this.parts.enable();
    this.stateChanges.next();
  }

  get errorState(): boolean {
    return (this.ngControl?.invalid || this.parts.invalid) && this.touched;
  }

  private _placeholder: string = '';

  @Input()
  get placeholder() {
    return this._placeholder;
  }

  set placeholder(plh) {
    this._placeholder = plh;
    this.stateChanges.next();
  }

  @Input()
  get value(): Time24Hours | null {
    return this.hourModeStrategy.convert2Time(this.parts.value as Parts);
  }

  set value(time: Time24Hours | null) {
    this.parts.setValue(this.hourModeStrategy.convert2Parts(time))
    this.stateChanges.next();
  }

  get empty() {
    const parts: Parts = this.parts.value;
    return parts.minutes === EMPTY && parts.hours === EMPTY && parts.twelveHourPeriods === EMPTY;
  }

  onChange = (_: any) => {
  };

  onTouched = () => {
  };

  onFocusIn() {
    if (!this.focused) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  onFocusOut(event: FocusEvent) {
    if (!this.elementRef.nativeElement.contains(event.relatedTarget as Element)) {
      this.touched = true;
      this.focused = false;
      this.onTouched();
      this.stateChanges.next();
    }
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  writeValue(obj: any): void {
    this.value = obj;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onContainerClick(event: MouseEvent) {
    if ((event.target as Element).tagName.toLowerCase() != 'input') {
      this.hoursEl?.nativeElement.focus();
    }
  }

  setDescribedByIds(ids: string[]) {
    this.containerEl?.nativeElement.setAttribute('aria-describedby', ids.join(' '));
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled
  }

  hoursKeyDown(event: KeyboardEvent) {
    if (KEYS_2_IGNORE.includes(event.key)) {
      return;
    }
    event.preventDefault();
    const {hours} = (this.parts.value as Parts);
    let targetValue = hours;
    if (NAVIGATION_KEYS.includes(event.key)) {
      const result = this.navigateByKey(event.key, hours, this.twelveHourFormat ? HOURS_12_HOUR : HOURS_24_HOUR, undefined, this.minutesEl);
      if (!result) {
        return;
      }
      targetValue = result;
    } else {
      if (event.key === '1') {

      }
    }
    this.parts.patchValue({hours: targetValue} as Partial<Parts>)
    this.onChange(this.value);
  }

  minutesKeyDown(event: KeyboardEvent) {
    if (KEYS_2_IGNORE.includes(event.key)) {
      return;
    }
    event.preventDefault();
    const {minutes} = (this.parts.value as Parts);
    let targetValue = minutes;
    if (NAVIGATION_KEYS.includes(event.key)) {
      const result = this.navigateByKey(event.key, minutes, MINUTES, this.hoursEl, this.twelveHourPeriodsEl);
      if (!result) {
        return;
      }
      targetValue = result;
    } else {
      const maxValue = 59;
      if (event.key === '1') {

      }
    }
    this.parts.patchValue({minutes: targetValue} as Partial<Parts>)
    this.onChange(this.value);
  }


  twelveHourPeriodKeyDown(event: KeyboardEvent) {
    if (KEYS_2_IGNORE.includes(event.key)) {
      return;
    }
    event.preventDefault();
    const {twelveHourPeriods} = (this.parts.value as Parts);
    // means the control is not configured to handle AM and PM.
    if (!twelveHourPeriods) {
      return;
    }
    let targetValue = twelveHourPeriods;
    if (NAVIGATION_KEYS.includes(event.key)) {
      const result = this.navigateByKey(event.key, twelveHourPeriods, TWELVE_HOUR_PERIOD_VALUES, this.minutesEl, undefined);
      if (!result) {
        return;
      }
      targetValue = result;
    } else {
      if (event.key.toLowerCase() === 'a') {
        targetValue = 'AM';
      } else if (event.key.toLowerCase() === 'p') {
        targetValue = 'PM';
      }
    }
    this.parts.patchValue({twelveHourPeriods: targetValue} as Partial<Parts>)
    this.onChange(this.value);
  }

  private navigateByKey(key: string, currentValue: string, possibleValues: string[], prevElement: ElementRef | undefined, nextElement: ElementRef | undefined): string | undefined {
    const currentIdx = possibleValues.indexOf(currentValue);
    let targetValue = currentValue;
    if (key === 'Backspace') {
      targetValue = EMPTY;
    } else if (key === 'ArrowLeft') {
      prevElement?.nativeElement.focus();
      return;
    } else if (key === 'ArrowRight') {
      nextElement?.nativeElement.focus();
      return;
    } else if (key === 'ArrowUp') {
      const targetIndex = (currentIdx + 1) % (possibleValues.length);
      targetValue = possibleValues[targetIndex];
    } else if (key === 'ArrowDown') {
      const targetIndex = currentIdx === -1 ? possibleValues.length - 1 : (currentIdx - 1 + possibleValues.length) % (possibleValues.length);
      targetValue = possibleValues[targetIndex];
    }
    return targetValue
  }
}
