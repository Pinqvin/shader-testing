import './style.css'

import vertexShaderString from './vertex.glsl?raw';
import fragmentShaderString from './fragment.glsl?raw';

const processorCode = `
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

        this.delayLine = new Float32Array(this.sampleRate).fill(0);
        this.delayIndex = 0;
    }

    processDelay(input, feedback, delayTime) {
        this.delayLine[this.delayIndex] = input + this.delayLine[this.delayIndex] * feedback;
        this.delayIndex++;
        this.delayIndex %= Math.trunc(delayTime * this.sampleRate);
        return this.delayLine[this.delayIndex];
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
                let chordFreq = bassFreq * 5.0;

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
                chord = chord + this.processDelay(chord, 0.5, 0.375) * 0.4;

                channel[i] += chord;
            }
        }

        return true;
    }
}

registerProcessor("techno-processor", TechnoProcessor);
`;

type ShaderType = WebGL2RenderingContext["VERTEX_SHADER"] | WebGL2RenderingContext["FRAGMENT_SHADER"]

function createShader(gl: WebGL2RenderingContext, type: ShaderType, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  // Check if the canvas is not the same size.
  const needResize = canvas.width !== displayWidth ||
    canvas.height !== displayHeight;

  if (needResize) {
    // Make the canvas the same size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}

async function main() {
  const canvas = document.querySelector("#app") as HTMLCanvasElement;
  const button = document.querySelector("#button") as HTMLButtonElement;
  const gl = canvas.getContext("webgl2");

  if (gl === null) {
    alert("WebGL2 not available");
    return;
  }

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderString);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderString);

  if (vertexShader === undefined || fragmentShader === undefined) {
    console.log("Shader compilation failed");
    return;
  }

  const program = createProgram(gl, vertexShader, fragmentShader);

  if (program === undefined) {
    console.log("Creating program failed");
    return;
  }

  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  // first triangle
    1, -1,
    -1, 1,
    -1, 1,  // second triangle
    1, -1,
    1, 1,]
  ), gl.STATIC_DRAW);

  const resUniformLocation = gl.getUniformLocation(program, "res");
  const timeUniformLocation = gl.getUniformLocation(program, "time");

  const vertexArrayObject = gl.createVertexArray();
  gl.bindVertexArray(vertexArrayObject);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  const textCanvas = document.querySelector("#text") as HTMLCanvasElement;
  const ctx = textCanvas.getContext("2d");

  if (ctx === null) {
    alert("Couldn't instantiate 2D context for text canvas");
    return;
  }

  const audioContext = new AudioContext({ sampleRate: 48_000 });
  const volume = audioContext.createGain();
  await audioContext.audioWorklet.addModule('data:text/javascript,' + encodeURI(processorCode));
  const worklet = new AudioWorkletNode(audioContext, "techno-processor");

  worklet.connect(volume).connect(audioContext.destination)

  const stopTime = 20;

  function render(time: DOMHighResTimeStamp) {
    time *= 0.001;

    resizeCanvasToDisplaySize(gl!.canvas as HTMLCanvasElement);
    resizeCanvasToDisplaySize(ctx!.canvas);
    gl!.viewport(0, 0, gl!.canvas.width, gl!.canvas.height);

    // Clear canvas
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);

    // Clear the 2D canvas
    ctx!.clearRect(0, 0, ctx!.canvas.width, ctx!.canvas.height);
    ctx!.font = "48px sans-serif";

    if (time > 3 && time < stopTime) {
      ctx!.fillText("I wish I knew", 10, ctx!.canvas.height * (1 / 4));
    }

    if (time > 5 && time < stopTime) {
      ctx!.fillText("how to code", 10, ctx!.canvas.height * (1 / 4) + 40);
    }

    if (time > 15 && time < stopTime) {
      ctx!.fillText("That's all folks", ctx!.canvas.width * (3 / 4), ctx!.canvas.height * (1 / 4));
    }

    if (time > stopTime) {
      ctx!.fillText("FIN", ctx!.canvas.width * (1 / 2), ctx!.canvas.height * (1 / 2));
      volume.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
    } else {
      gl!.useProgram(program!);
      gl!.bindVertexArray(vertexArrayObject);

      gl!.uniform2f(resUniformLocation, gl!.canvas.width, gl!.canvas.height);
      gl!.uniform1f(timeUniformLocation, time);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    }
    requestAnimationFrame(render);
  }

  button.addEventListener("click", () => {
    button.style.display = "none";
    canvas.style.display = "block";
    textCanvas.style.display = "block";
    document.documentElement.requestFullscreen().then(() => {
      audioContext.resume();
      requestAnimationFrame(render);
    });
  }, { once: true });

  button.disabled = false;
  button.style.display = "block";
}

main();