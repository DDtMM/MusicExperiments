import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { startWith, tap } from 'rxjs/operators';
import * as Tone from 'tone';
import { Source } from 'tone/build/esm/source/Source';
import { correctPitch } from '../pitch-corrector';
import { range } from 'ramda';

interface UserParam {
  getter: () => number,
  max: number,
  min: number,
  name: string,
  setter: (value: number) => void;
}
@Component({
  selector: 'app-control-surface',
  templateUrl: './control-surface.component.html',
  styleUrls: ['./control-surface.component.scss']
})
export class ControlSurfaceComponent implements OnInit {
  readonly negInf = Number.NEGATIVE_INFINITY;
  gridStops = range(0, 44).map(x => 21 + x * 13);
  allGenerators: Source<any>[] = [];
  outputNode: Tone.Channel;
  userParams: UserParam[] = [];

  startToneSubj = new Subject();
  stopToneSubj = new Subject();

  main$ = combineLatest([
    this.startToneSubj.pipe(
      tap(() => {
        console.log('starting tone');
        Tone.start();
        if (!this.allGenerators.length) {
          this.initGenerators();
        }
        this.allGenerators.forEach(x => x.start());
        //Tone.Destination.volume.value = 0;
      }), 
      startWith()
    ),
    this.stopToneSubj.pipe(
      tap(() => {
        this.allGenerators.forEach(x => x.stop());
      }), 
      startWith()
    )
  ])
  constructor() { }

  ngOnInit(): void {
    this.main$.subscribe();
  }

  startTone() {
    this.startToneSubj.next();
  }
  stopTone() {
    this.stopToneSubj.next();
  }

  private createUserParam(name: string, min: number, max: number, getter: () => number, setter: (value: number) => void) {
    return { getter, max, min, name, setter } as UserParam
  }

  private initGenerators() {
    this.outputNode = new Tone.Channel().toDestination();
    const fmOsc = new Tone.FMOscillator({
      frequency: 'a4',
      type: "square",
      modulationType: 'sine',
      harmonicity: 1,
      modulationIndex: 3
    }).connect(this.outputNode);
    this.allGenerators = [fmOsc];
    console.log('generators initted'); 
    this.userParams = [
      this.createUserParam('Inst Vol', -64, 0, () => fmOsc.volume.value, (val) => fmOsc.volume.value = val),
      this.createUserParam('Inst Freq', 1, 14000, () => fmOsc.frequency.value as number, 
        (val) => fmOsc.set({ frequency: correctPitch(val, .9) })),
      this.createUserParam('Mod INdex', 0, 10, () => fmOsc.modulationIndex.value, (val) => fmOsc.modulationIndex.value = val),
      this.createUserParam('Harmonicity', 0, 4, () => fmOsc.harmonicity.value, (val) => fmOsc.harmonicity.value = val),
    ]
  }
}
