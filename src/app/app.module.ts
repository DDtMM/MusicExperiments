import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ControlSurfaceComponent } from './control-surface/control-surface.component';
import { FormsModule } from '@angular/forms';
import { Song1Component } from './song1/song1.component';
import { KeyboardComponent } from './keyboard/keyboard.component';
import { InstrumentTesterComponent } from './instrument-tester/instrument-tester.component';

@NgModule({
  declarations: [
    AppComponent,
    ControlSurfaceComponent,
    Song1Component,
    KeyboardComponent,
    InstrumentTesterComponent
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }