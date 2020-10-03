import { Component, OnInit } from '@angular/core';
import * as Tone from 'tone';
import { KeyStateChangeEvent } from '../surfaces/keyboard/keyboard.component';
import { RadarState } from '../surfaces/radar/radar.component';

@Component({
  selector: 'app-instrument-tester',
  templateUrl: './instrument-tester.component.html',
  styleUrls: ['./instrument-tester.component.scss']
})
export class InstrumentTesterComponent implements OnInit {
  readonly oscMap = new Map<number, Tone.Synth>();
  readonly delay1 = new Tone.PingPongDelay(.5, .5).toDestination();
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

  constructor() { }

  ngOnInit(): void {
    Tone.start();
    this.polySynth.toDestination();
  }

  keysChanged(state: KeyStateChangeEvent) {
    if (state.pressed.length) {
      this.polySynth.triggerAttack(state.pressed.map(x => x.frequency));
    }
    if (state.released.length) {
      this.polySynth.triggerRelease(state.released.map(x => x.frequency));
    }
  }

  radarChange(state: RadarState) {
    state.released.forEach(x => this.oscMap.get(x).triggerRelease());
    state.down.forEach(x => {
      this.oscMap.get(x.id).triggerAttack(x.frequency);
      this.oscMap.get(x.id).volume.rampTo(x.volume, .001);
    });
    state.pressed.forEach(x => {
      let osc = this.oscMap.get(x.id);
      if (!osc) {
        osc = new Tone.Synth({
          oscillator : {
            type: 'sawtooth32'
          } ,
          envelope: {
            attack: 0.005 ,
            decay : 0.1 ,
            sustain : 1 ,
            release : 0
          },
          portamento: .1
        });
        osc.volume.value = x.volume;
        osc.toDestination();
        osc.connect(this.delay1);
        this.oscMap.set(x.id, osc);
      }
      osc.triggerAttack(x.frequency);
    });
  }


}
