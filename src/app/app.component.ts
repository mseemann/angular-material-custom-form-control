import { Component } from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  name = new FormControl(null, Validators.required);
  form = new FormGroup({name: this.name})

  constructor() {
    this.form.valueChanges.subscribe((value)=>{
      console.log(value)
    })
  }

  getErrorMessage(): string {
    if (this.name.hasError('required')) {
      return 'You must enter a value';
    }
    return '';
  }
}
