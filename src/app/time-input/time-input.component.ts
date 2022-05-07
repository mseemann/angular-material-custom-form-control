import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding, HostListener,
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
import {Clipboard} from "@angular/cdk/clipboard";

const number22DigitString = (n: number): string => n < 10 ? '0' + n : String(n);

const EMPTY = '––'; // &#8211; –– en dash

const TWELVE_HOUR_PERIOD_VALUES = ['AM', 'PM'] as const;
const HOURS_12_HOUR = [...Array(12).keys()].map(hour => hour + 1).map(number22DigitString); // 01..12
const HOURS_24_HOUR = [...Array(24).keys()].map(number22DigitString); // 00..23
const MINUTES = [...Array(60).keys()].map(number22DigitString); // 00..59
const NUMBERS = [...Array(10).keys()].map(String); // 0..9

type Period = typeof TWELVE_HOUR_PERIOD_VALUES[number] | typeof EMPTY | null;
type Parts = {
  hours: string,
  minutes: string,
  twelveHourPeriods: Period
}

interface HourModeStrategy {
  convert2Time(parts: Parts): Time24Hours | null;

  convert2Parts(time: Time24Hours | null): Parts;

  isEmpty(parts: Parts): boolean;

  isHoursBufferFull(hoursBuffer: string[]): boolean;

  restrictOrConvertHourToMaxValue(hours: number): number;

  getDisplayValue(hourEl: ElementRef | undefined, minuteEl: ElementRef | undefined, period: ElementRef | undefined): string;
}

class TwelveHourModeStrategy implements HourModeStrategy {
  convert2Time(parts: Parts): Time24Hours | null {
    if (this.isEmpty(parts)) {
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
    if (time) {
      let hours = time.hours;
      let minutes = time.minutes;

      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; //hour '0' is  '12'
      return {
        hours: number22DigitString(hours),
        minutes: number22DigitString(minutes),
        twelveHourPeriods: period
      };
    } else {
      return {hours: EMPTY, minutes: EMPTY, twelveHourPeriods: EMPTY}
    }
  }

  isHoursBufferFull(hoursBuffer: string[]): boolean {
    return hoursBuffer.length === 2 || (hoursBuffer.length === 1 && Number(hoursBuffer[0]) >= 2);
  }

  isEmpty(parts: Parts): boolean {
    return parts.minutes === EMPTY || parts.hours === EMPTY || parts.twelveHourPeriods === EMPTY;
  }

  restrictOrConvertHourToMaxValue(hours: number): number {
    return hours <= 12 ? hours : hours - 12;
  }

  getDisplayValue(hourEl: ElementRef | undefined, minuteEl: ElementRef | undefined, period: ElementRef | undefined): string {
    return `${hourEl?.nativeElement.value}:${minuteEl?.nativeElement.value} ${period?.nativeElement.value}`;
  }
}

class TwentyForHourModeStrategy implements HourModeStrategy {

  convert2Time(parts: Parts): Time24Hours | null {
    return this.isEmpty(parts) ? null : {hours: Number(parts.hours), minutes: Number(parts.minutes)};
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

  isHoursBufferFull(hoursBuffer: string[]): boolean {
    return hoursBuffer.length === 2 || (hoursBuffer.length === 1 && Number(hoursBuffer[0]) > 2);
  }

  isEmpty(parts: Parts): boolean {
    return parts.minutes === EMPTY || parts.hours === EMPTY;
  }

  restrictOrConvertHourToMaxValue(hours: number): number {
    return Math.min(hours, 23);
  }

  getDisplayValue(hourEl: ElementRef | undefined, minuteEl: ElementRef | undefined): string {
    return `${hourEl?.nativeElement.value}:${minuteEl?.nativeElement.value}`;
  }
}

@Component({
  selector: 'app-time-input',
  templateUrl: './time-input.component.html',
  styleUrls: ['./time-input.component.scss'],
  providers: [{provide: MatFormFieldControl, useExisting: TimeInputComponent}],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeInputComponent implements ControlValueAccessor, MatFormFieldControl<Time24Hours | null>, OnDestroy {
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
  private hourModeStrategy: HourModeStrategy = new TwentyForHourModeStrategy();
  private minutesBuffer: string[] = [];
  private hoursBuffer: string[] = [];

  constructor(
    @Optional() @Self() public ngControl: NgControl | null,
    private elementRef: ElementRef,
    private clipboard: Clipboard) {
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
    // read the current value before the format is changed
    const currentModelValue = this.value;
    this.hourModeStrategy = this._twelveHourFormat ? new TwelveHourModeStrategy() : new TwentyForHourModeStrategy();
    // assign the old value to be converted to the new format
    this.value = currentModelValue;
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

  // required by MatFormFieldControl - bit this control has no relevant meaning for a placeholder
  @Input() placeholder: string = '';

  @Input()
  get value(): Time24Hours | null {
    return this.hourModeStrategy.convert2Time(this.parts.value as Parts);
  }

  set value(time: Time24Hours | null) {
    this.parts.setValue(this.hourModeStrategy.convert2Parts(time))
    this.stateChanges.next();
  }

  get empty() {
    return this.hourModeStrategy.isEmpty(this.parts.value);
  }

  onChange = (_: any) => {
  };

  onTouched = () => {
  };

  onFocusIn() {
    this.focused = true;
    this.stateChanges.next();
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

  writeValue(obj: Time24Hours | null): void {
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

  @HostListener('copy')
  copy() {
    this.clipboard.copy(this.hourModeStrategy.getDisplayValue(this.hoursEl, this.minutesEl, this.twelveHourPeriodsEl));
  }

  hoursKeyDown(event: KeyboardEvent) {
    const {hours} = (this.parts.value as Parts);
    const specialKeyDownHandler = (key: string, currentValue: string): string => {
      if (NUMBERS.includes(event.key)) {
        this.hoursBuffer.push(event.key);
        const hours = this.hourModeStrategy.restrictOrConvertHourToMaxValue(Number(this.hoursBuffer.join('')));

        const targetValue = number22DigitString(hours);
        if (this.isHoursBufferFull()) {
          this.minutesEl?.nativeElement.focus();
        }
        return targetValue;
      }
      return currentValue;
    }
    const createPatchValue = (hours: string): Partial<Parts> => ({hours} as Partial<Parts>)
    this.defaultKeyDownHandler(
      event,
      this.twelveHourFormat ? HOURS_12_HOUR : HOURS_24_HOUR,
      hours ?? '',
      undefined,
      this.minutesEl,
      specialKeyDownHandler,
      createPatchValue);
  }

  minutesKeyDown(event: KeyboardEvent) {
    const {minutes} = (this.parts.value as Parts);
    const specialKeyDownHandler = (key: string, currentValue: string): string => {
      if (NUMBERS.includes(event.key)) {
        if (this.isMinuteBufferFull()) {
          this.resetMinutesBuffer();
        }
        this.minutesBuffer.push(event.key);
        const minutes = Number(this.minutesBuffer.join(''));
        const targetValue = number22DigitString(minutes);
        if (this.isMinuteBufferFull()) {
          this.twelveHourPeriodsEl?.nativeElement.focus();
        }
        return targetValue;
      }
      return currentValue;
    }
    const createPatchValue = (minutes: string): Partial<Parts> => ({minutes} as Partial<Parts>)
    this.defaultKeyDownHandler(
      event,
      MINUTES,
      minutes ?? '',
      this.hoursEl,
      this.twelveHourPeriodsEl,
      specialKeyDownHandler,
      createPatchValue);
  }

  twelveHourPeriodKeyDown(event: KeyboardEvent) {
    const {twelveHourPeriods} = (this.parts.value as Parts);
    const specialKeyDownHandler = (key: string, currentValue: string): string => {
      if (key.toLowerCase() === 'a') {
        return 'AM';
      } else if (key.toLowerCase() === 'p') {
        return 'PM';
      }
      return currentValue;
    }
    const createPatchValue = (twelveHourPeriods: string): Partial<Parts> => ({twelveHourPeriods} as Partial<Parts>)
    this.defaultKeyDownHandler(
      event,
      TWELVE_HOUR_PERIOD_VALUES,
      twelveHourPeriods ?? '',
      this.minutesEl,
      undefined,
      specialKeyDownHandler,
      createPatchValue);
  }

  private defaultKeyDownHandler(
    event: KeyboardEvent,
    possibleInputValues: readonly string[],
    currentValue: string,
    previousEl: ElementRef | undefined,
    nextEl: ElementRef | undefined,
    specialKeyDownHandler: (key: string, currentValue: string) => string,
    createPatchValue: (value: string) => Partial<Parts>) {
    if (event.key === 'Tab') {
      return;
    }
    //event.preventDefault();
    const currentIdx = possibleInputValues.indexOf(currentValue);
    let targetValue = currentValue;
    if (event.key === 'Backspace') {
      targetValue = EMPTY;
    } else if (event.key === 'ArrowLeft') {
      previousEl?.nativeElement.focus();
      return;
    } else if (event.key === 'ArrowRight') {
      nextEl?.nativeElement.focus();
      return;
    } else if (event.key === 'ArrowUp') {
      const targetIndex = (currentIdx + 1) % (possibleInputValues.length);
      targetValue = possibleInputValues[targetIndex];
    } else if (event.key === 'ArrowDown') {
      const targetIndex = currentIdx === -1 ? possibleInputValues.length - 1 : (currentIdx - 1 + possibleInputValues.length) % (possibleInputValues.length);
      targetValue = possibleInputValues[targetIndex];
    } else {
      targetValue = specialKeyDownHandler(event.key, targetValue);
    }
    this.parts.patchValue(createPatchValue(targetValue))
    this.onChange(this.value);
  }

  resetMinutesBuffer() {
    this.minutesBuffer = [];
  }

  resetHoursBuffer() {
    this.hoursBuffer = [];
  }

  private isMinuteBufferFull() {
    return this.minutesBuffer.length === 2 || (this.minutesBuffer.length === 1 && Number(this.minutesBuffer[0]) >= 6);
  }

  private isHoursBufferFull() {
    return this.hourModeStrategy.isHoursBufferFull(this.hoursBuffer);
  }

}
