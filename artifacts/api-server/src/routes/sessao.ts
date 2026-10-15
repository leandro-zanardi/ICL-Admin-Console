import { Router, type IRouter } from "express";
import { GetSessaoResponse } from "@workspace/api-zod";
import { sessaoDe } from "../lib/escopo";

const router: IRouter = Router();

router.get("/me", (req, res): void => {
  res.json(GetSessaoResponse.parse(sessaoDe(req)));
});

export default router;
