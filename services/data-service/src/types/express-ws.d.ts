declare module 'express-ws' {
  import { Application, Router } from 'express';

  interface WebsocketMethod {
    (path: string, callback: (ws: any, req: any) => void): void;
  }

  interface WebsocketRouter extends Router {
    ws: WebsocketMethod;
  }

  interface WebsocketApplication extends Application {
    ws: WebsocketMethod;
  }

  interface WebsocketInstance {
    app: WebsocketApplication;
    getWss: () => any;
    applyTo: (router: Router) => WebsocketRouter;
  }

  function expressWs(app: Application, server?: any, options?: any): WebsocketInstance;

  export = expressWs;
}
