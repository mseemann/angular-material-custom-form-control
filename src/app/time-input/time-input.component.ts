import {Component, ElementRef, HostBinding, Input, OnDestroy, Optional, Self} from '@angular/core';
import {AbstractControl, ControlValueAccessor, FormControl, FormGroup, NgControl, Validators} from "@angular/forms";
import {MatFormField, MatFormFieldControl} from "@angular/material/form-field";
import {Subject} from "rxjs";
import {BooleanInput, coerceBooleanProperty} from "@angular/cdk/coercion";

@Component({
  selector: 'app-time-input',
  templateUrl: './time-input.component.html',
  styleUrls: ['./time-input.component.scss'],
  providers: [{provide: MatFormFieldControl, useExisting: TimeInputComponent}],
})
export class TimeInputComponent implements ControlValueAccessor, MatFormFieldControl<string>, OnDestroy {
  static nextId = 0;

  hours = new FormControl();
  minutes = new FormControl();
  twelveHourPeriods = new FormControl();

  parts = new FormGroup({hours: this.hours, minutes: this.minutes, twelveHourPeriods: this.twelveHourPeriods});

  readonly stateChanges = new Subject<void>();

  @HostBinding() readonly id = `app-time-input-${TimeInputComponent.nextId++}`;
  focused = false;
  touched = false;
  controlType = 'app-time-input';

  @Input('aria-describedby') userAriaDescribedBy: string = '';

  autofilled: boolean = false;

  onChange = (_: any) => {};
  onTouched = () => {};

  constructor(
    @Optional() @Self() public ngControl: NgControl | null,
    private elementRef: ElementRef,
    @Optional() public parentFormField: MatFormField) {
    if (this.ngControl != null) {
      this.ngControl.valueAccessor = this;
    }
  }

  @HostBinding('class.floating')
  get shouldLabelFloat() {
    return this.focused || !this.empty;
  }

  @Input()
  get required(): boolean {
    return this._required ?? this.ngControl?.control?.hasValidator(Validators.required) ?? false;
  }
  set required(value: BooleanInput) {
    this._required = coerceBooleanProperty(value);
  }
  protected _required: boolean | undefined;

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
    return this.parts.invalid && this.touched;
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
  get value(): string | null {
    let n = this.parts.value;
    if (n.hours.length == 2 && n.minutes.length == 2 && n.twelveHourPeriods.length == 2) {
      return `${n.hours}:${n.minutes} ${n.twelveHourPeriods}`;
    }
    return null;
  }

  set value(time: string | null) {
    this.parts.setValue({hours: '00', minutes: '00', twelveHourPeriods: 'AM'});
    this.stateChanges.next();
  }

  get empty() {
    let n = this.parts.value;
    return !n.minutes && !n.hours && !n.twelveHourPeriods;
  }

  onFocusIn(event: FocusEvent) {
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
      this.elementRef.nativeElement.querySelector('input').focus();
    }
  }

  setDescribedByIds(ids: string[]) {
    const controlElement = this.elementRef.nativeElement
      .querySelector('.app-time-input-container')!;
    controlElement.setAttribute('aria-describedby', ids.join(' '));
  }

  handleInput(partControl: AbstractControl) {
    this.onChange(this.value);
  }
}
