import { Component, OnInit } from '@angular/core';
import * as Tone from 'tone';

@Component({
  selector: 'app-song1',
  templateUrl: './song1.component.html',
  styleUrls: ['./song1.component.scss']
})
export class Song1Component implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  startTone() {
    const synth = new Tone.Synth().toDestination();

    const osc2 = new Tone.Oscillator('c4', 'triangle').toDestination();
    const osc3 = new Tone.Oscillator('c4', 'sawtooth1').toDestination();
    const baseDrum = new Tone.Oscillator('c1', 'sine2').toDestination();
    const noise = new Tone.Noise("pink").toDestination();
    noise.volume.value = -6;
    const snareFilter = new Tone.Filter(8000, 'lowpass').toDestination();
    const snare = new Tone.NoiseSynth({
      noise: {
        type: 'white'
      },
      envelope: {
        attack: 0.001,
        decay: 0.005,
        sustain: 0.005,
        release: 0
      },
      volume: 0
    }).connect(snareFilter);
    let index: number = 0;
    const seq = new Tone.Sequence((time, note) => {
      const freq = Tone.Frequency(note);
      const transposeAmt = Math.floor(index / 4) * 2;
      synth.triggerAttackRelease(freq.transpose(transposeAmt).toFrequency(), .002, time);
      index = (index + 1) % 16;
    }, ["c3", "G4"]).start(0);
    let index2: number = 0;
    Tone.Transport.scheduleRepeat(time => {
      const freq = Tone.Frequency('g4').transpose(2 * (index2 % 3));
      osc3.start(time).stop(time + 0.95);
      osc3.frequency.value = freq.toFrequency();

      index2 = (index2 + 1) % 4;
    }, "1n");
    Tone.Transport.scheduleRepeat(time => {
      baseDrum.start(time).stop(time + 0.05);
    }, "4n");
    Tone.Transport.scheduleRepeat(time => {
      noise.start(time).stop(time + 0.05);
    }, "4n", '8n');
    Tone.Transport.scheduleRepeat(time => {
      console.log(time);
      snare.triggerAttackRelease(time, time + 0.01);
    }, '2n', '4n');
    Tone.Transport.bpm.value = 125;
    Tone.Transport.start();
  }

  stopTone() {
    Tone.Transport.stop();
  }
}
