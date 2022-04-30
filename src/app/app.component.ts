import {Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  name = new FormControl(null, Validators.required);
  time = new FormControl(null, Validators.required);
  form = new FormGroup({name: this.name, time: this.time})

  constructor() {
    this.form.valueChanges.subscribe((value) => {
      console.log(value)
    })
  }

  getNameErrorMessage(): string {
    if (this.name.hasError('required')) {
      return 'You must enter a value';
    }
    return '';
  }

  getTimeErrorMessage(): string {
    if (this.time.hasError('required')) {
      return 'You must enter a value';
    }
    return '';
  }
}
