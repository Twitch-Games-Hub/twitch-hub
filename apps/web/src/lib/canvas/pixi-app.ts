import { Application } from 'pixi.js';

export async function createPixiApp(canvas: HTMLCanvasElement): Promise<Application> {
  const app = new Application();

  await app.init({
    canvas,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio ?? 1,
    autoDensity: true,
    resizeTo: window,
    powerPreference: 'low-power',
  });

  return app;
}
