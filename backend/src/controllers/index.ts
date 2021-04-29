import auth from "./auth";
import { Router as ExpressRouter } from "express";

export interface Router {
  router: ExpressRouter;
  path?: string;
}

export default [{ router: auth, path: "/api/auth" }] as Router[];
