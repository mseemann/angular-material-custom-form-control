import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Time24Hours} from "./types";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  simpleTime: string|undefined;
  name = new FormControl(null, Validators.required);
  time = new FormControl({
    hours: new Date().getHours(),
    minutes: new Date().getMinutes()
  } as Time24Hours, Validators.required);
  form = new FormGroup({name: this.name, time: this.time})
  twelveHourFormat = window.navigator.language === 'en-US';

  constructor() {
    this.form.valueChanges.subscribe((value) => {
      console.log(JSON.stringify(value))
    })
  }

  getErrorMessage(): string {
    if (this.name.hasError('required')) {
      return 'You must enter a value';
    }
    return '';
  }

}
