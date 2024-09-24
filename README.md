# shader-testing

Trying to test out some WebGL and WebAudio stuff. I guess you could call this a demo, but I'd say that's being very generous. The goal was to make one, the end result... Well, it's something.

## Running

Locally you can get Vite to serve the app by running

```
pnpm install
pnpm dev
```

## Building

`pnpm build` will produce a single artifact called `index.html` under `dist` folder. Note that the code isn't especially optimized, shaders and the audio worklet don't get minified at all and are just stored as a string within the script tags.

## Visuals

Was hoping to do some 3D inside a fragment shader but uh.. Yeah, that's a ways off. Could somewhat wrap my head around [a 2D SDF of a circle](https://iquilezles.org/articles/distfunctions2d/), so there's not much to see here. Previous to this there was a sin wave on the red channel so an improvement, I suppose.

## Audio

WebAudio using Audio Worklets, JS version of [Tero's WASM techno presentation worklet](https://github.com/teropa/wasm-techno). Seems like a neat low level API for audio stuff, not sure if it's best for playing audio on a demo. Can't say I understand much of what's going on here, wish I'd had more time to play around with it. Since it runs on its own thread it's pretty annoying to load the processor(s), the default API pretty much forces you to load a separate file. And debugging becomes even more annoying due to this. Errors are easy enough to notice, but producing wrong values is pretty much just something you hear (or don't). Need to fiddle around more with this.