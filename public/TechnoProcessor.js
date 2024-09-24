class TechnoProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.sampleRate = 48_000;
        this.sampleDuration = 1 / this.sampleRate;
        this.twoPi = Math.PI * 2;
        this.samples = 0;
        this.kickPhase = 0;
        this.bassPhase = 0;
        this.chordPhase1 = 0;
        this.chordPhase2 = 0;
        this.chordPhase3 = 0;
        this.playChords = false;

        this.chordPattern = [
            1, 0, 0, 1,
            0, 1, 0, 0,
            0, 0, 1, 0,
            1, 0, 0, 0
        ];
    }

    phasor(phase, freq) {
        phase += freq * this.sampleDuration;
        phase -= Math.trunc(phase);
        return phase;
    }

    envelope(t, amp, exp) {
        let env = Math.pow(1.0 - t, exp);
        env *= amp;
        return env;
    }

    saw6f(phase) {
        return Math.sin(phase)
            + Math.sin(phase * 2.0) + 0.5
            + Math.sin(phase * 3.0) + 0.33
            + Math.sin(phase * 4.0) + 0.25
            + Math.sin(phase * 5.0) + 0.2
            + Math.sin(phase * 6.0) + 0.16;
    }

    process(_inputs, outputs) {
        const output = outputs[0];
        const channel = output[0];

        for (let i = 0; i < channel.length; ++i) {
            const seconds = this.samples++ * this.sampleDuration;
            const beats = seconds * 2.0;
            const beatFractional = beats - Math.trunc(beats);
            const bar = Math.trunc(beats / 4.0);
            const sixteenths = beats * 4.0;
            const sixteenthFractional = sixteenths - Math.trunc(sixteenths);

            channel[i] = 0;

            const kickFreq = 50.0 + this.envelope(beatFractional, 900.0, 50.0);
            this.kickPhase = this.phasor(this.kickPhase, kickFreq);
            let kick = Math.sin(this.kickPhase * this.twoPi);
            kick *= this.envelope(beatFractional, 0.15, 3.0);

            channel[i] += kick;

            const bassFreq = 50.0;

            if (seconds > 3 && beatFractional === 0) {
                this.playChords = true;
            }

            this.bassPhase = this.phasor(this.bassPhase, bassFreq);
            let bass = Math.sin(this.bassPhase * this.twoPi);
            bass = Math.tanh(bass * 1.5);
            bass *= (0.2 - this.envelope(beatFractional, 0.2, 0.5));

            channel[i] += bass;

            if (this.playChords) {
                let chordFreq = bassFreq * 4.0;

                if (bar % 4 === 2 || bar % 4 === 3) {
                    chordFreq *= 2.0 / 3.0;
                }

                this.chordPhase1 = this.phasor(this.chordPhase1, chordFreq);
                this.chordPhase2 = this.phasor(this.chordPhase2, chordFreq * 3.0 / 2.0);
                this.chordPhase3 = this.phasor(this.chordPhase3, chordFreq * 6.0 / 5.0);
                let chord = this.saw6f(this.chordPhase1 * this.twoPi)
                    + this.saw6f(this.chordPhase2 * this.twoPi)
                    + this.saw6f(this.chordPhase3 * this.twoPi);
                const chordPatternIndex = Math.trunc(sixteenths) % 16;
                const chordHit = this.chordPattern[chordPatternIndex];
                chord *= this.envelope(sixteenthFractional, 0.1, 3.0) * chordHit;

                channel[i] += chord;
            }
        }

        return true;
    }
}

registerProcessor("techno-processor", TechnoProcessor);
