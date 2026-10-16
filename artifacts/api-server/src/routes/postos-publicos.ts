import { Router, type IRouter } from "express";
import { postoAmenidadesPublicasRouter } from "./posto-amenidades";

const router: IRouter = Router();
router.use(postoAmenidadesPublicasRouter);

export default router;
