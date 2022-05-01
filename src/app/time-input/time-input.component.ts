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

type Parts = {
  hours: string,
  minutes: string,
  twelveHourPeriods: string
}

const EMPTY = '––'; // &#8211; –– en dash

const TWELVE_HOUR_PERIOD_VALUES = ['AM', 'PM'];

const KEYS_2_IGNORE = ['Tab'];

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

  focused = false;
  @ViewChild('containerEl', {static: true}) containerEl: ElementRef | undefined;
  @ViewChild('hoursEl', {static: true}) hoursEl: ElementRef | undefined;
  @ViewChild('twelveHourPeriodsEl', {static: true}) twelveHourPeriodsEl: ElementRef | undefined;
  @ViewChild('minutesEl', {static: true}) minutesEl: ElementRef | undefined;
  private touched = false;

  constructor(@Optional() @Self() public ngControl: NgControl | null, private elementRef: ElementRef) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  protected _required: boolean | undefined;

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

  set disabled(value: boolean) {
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
    let parts: Parts = this.parts.value;
    if (parts.hours.length == 2 && parts.minutes.length == 2 && parts.twelveHourPeriods.length == 2) {
      return {hours: Number(parts.hours), minutes: Number(parts.minutes)}
    }
    return null;
  }

  set value(time: Time24Hours | null) {
    this.parts.setValue({hours: EMPTY, minutes: EMPTY, twelveHourPeriods: EMPTY} as Parts);
    this.stateChanges.next();
  }

  get empty() {
    let parts: Parts = this.parts.value;
    return !parts.minutes && !parts.hours && !parts.twelveHourPeriods;
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

  onAnyInput() {
    this.onChange(this.value);
  }

  twelveHourPeriodKeyDown(event: KeyboardEvent) {
    if (KEYS_2_IGNORE.includes(event.key)) {
      return;
    }
    event.preventDefault();
    const {twelveHourPeriods} = (this.parts.value as Parts);
    const currentIdx = TWELVE_HOUR_PERIOD_VALUES.indexOf(twelveHourPeriods);
    let targetValue = twelveHourPeriods;
    if (event.key === 'Backspace') {
      targetValue = EMPTY;
    } else if (event.key === 'ArrowLeft') {
      this.minutesEl?.nativeElement.focus();
      return;
    } else if (event.key === 'ArrowRight') {
      return;
    } else if (event.key === 'ArrowUp') {
      const targetIndex = (currentIdx + 1) % (TWELVE_HOUR_PERIOD_VALUES.length);
      targetValue = TWELVE_HOUR_PERIOD_VALUES[targetIndex];
    } else if (event.key === 'ArrowDown') {
      const targetIndex = Math.abs(currentIdx - 1) % (TWELVE_HOUR_PERIOD_VALUES.length);
      targetValue = TWELVE_HOUR_PERIOD_VALUES[targetIndex];
    } else if (event.key.toLowerCase() === 'a') {
      targetValue = 'AM';
    } else if (event.key.toLowerCase() === 'p') {
      targetValue = 'PM';
    }
    this.parts.patchValue({twelveHourPeriods: targetValue} as Partial<Parts>)
  }

}
