import { Component, OnInit } from '@angular/core';
import { KeyStateChangeEvent } from '../keyboard/keyboard.component';
import * as Tone from 'tone';

@Component({
  selector: 'app-instrument-tester',
  templateUrl: './instrument-tester.component.html',
  styleUrls: ['./instrument-tester.component.scss']
})
export class InstrumentTesterComponent implements OnInit {
  polySynth = new Tone.PolySynth({
    options: {
      envelope: {
        attack: .2,
        sustain: .5,
        decay: 1,
        release: 2
      }
    }
  });
  pan2 = new Tone.Panner(-1);
  polySynth2 = new Tone.PolySynth({
    options: {
      envelope: {
        attack: .5,
        sustain: .5,
        decay: 1,
        release: 8
      },
      oscillator: {
        type: 'sine11'
      },
      volume: -6,
    }
  });
  constructor() { }

  ngOnInit(): void {
    Tone.start();
    this.polySynth.toDestination();
    this.polySynth2.connect(this.pan2);
    this.pan2.toDestination();
  }

  keysChanged(state: KeyStateChangeEvent) {
    if (state.pressedKeys.length) {
      this.polySynth.triggerAttack(state.pressedKeys.map(x => x.frequency));
      this.polySynth2.triggerAttack(state.pressedKeys.map(x => Tone.Frequency(x.frequency).transpose(12).toFrequency()));
    }
    if (state.releasedKeys.length) {
      this.polySynth.triggerRelease(state.releasedKeys.map(x => x.frequency));
      this.polySynth2.triggerRelease(state.releasedKeys.map(x => Tone.Frequency(x.frequency).transpose(12).toFrequency()));
    }
  }
}
