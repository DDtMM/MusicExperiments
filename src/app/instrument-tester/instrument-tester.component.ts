import { Component, OnInit } from '@angular/core';
import * as Tone from 'tone';
import { isTriggerDown, isTriggerPressed, isTriggerReleased, TriggerDownState, TriggerState } from '../surfaces/trigger-state';

@Component({
  selector: 'app-instrument-tester',
  templateUrl: './instrument-tester.component.html',
  styleUrls: ['./instrument-tester.component.scss']
})
export class InstrumentTesterComponent implements OnInit {
  readonly oscMap = new Map<number, Tone.Synth>();
  readonly delay1 = new Tone.PingPongDelay(.5, .5).toDestination();
  polySynth = new Tone.PolySynth({
    voice: Tone.Synth,
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

  keysChanged(state: TriggerState[]) {
    const pressed = state.filter(isTriggerPressed);
    const released = state.filter(isTriggerReleased);
    if (pressed.length) {
      this.polySynth.triggerAttack(pressed.map(x => x.frequency));
    }
    if (released.length) {
      this.polySynth.triggerRelease(released.map(x => x.frequency));
    }
  }

  radarChange(state: TriggerState[]) {
    state.filter(isTriggerReleased).forEach(x => this.oscMap.get(x.id).triggerRelease());
    state.filter(isTriggerDown).forEach(x => {
      this.oscMap.get(x.id).triggerAttack(x.frequency);
      this.oscMap.get(x.id).volume.rampTo(this.velocityToVolume(x.velocity), .001);
    });
    state.filter(isTriggerPressed).forEach(x => {
      let osc = this.oscMap.get(x.id);
      if (!osc) {
        osc = new Tone.Synth({
          oscillator : {
            type: 'sine4'
          } ,
          envelope: {
            attack: 0.005 ,
            decay : 0.1 ,
            sustain : 1 ,
            release : 0
          },
          portamento: .1
        });
        osc.volume.value = this.velocityToVolume(x.velocity);
        osc.toDestination();
        osc.connect(this.delay1);
        this.oscMap.set(x.id, osc);
      }
      osc.triggerAttack(x.frequency);
    });
  }



  /** Converts pressure % to decibles. */
  private velocityToVolume(pressure: number) {
    const volume = Math.log10(pressure) * 10;
    if (isNaN(volume)) {
      console.log(['nan volume', volume, pressure]);
    }
    return volume;
  }


}
