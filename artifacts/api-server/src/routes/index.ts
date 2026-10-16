import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessaoRouter from "./sessao";
import mapaRouter from "./mapa";
import denunciasRouter from "./denuncias";
import antifraudeRouter from "./antifraude";
import usuariosRouter from "./usuarios";
import acessosRouter from "./acessos";
import painelRouter from "./painel";
import postosRouter from "./postos";
import anpRouter from "./anp";
import recompensasRouter from "./recompensas";
import postoAmenidadesRouter from "./posto-amenidades";
import postosPublicosRouter from "./postos-publicos";
import { exigirAcesso } from "../middlewares/acesso";

const router: IRouter = Router();

// Publico
router.use(healthRouter);
router.use(postosPublicosRouter);

// Tudo abaixo exige login e cadastro de acesso
router.use(exigirAcesso);
router.use(sessaoRouter);
router.use(mapaRouter);
router.use(denunciasRouter);
router.use(antifraudeRouter);
router.use(usuariosRouter);
router.use(acessosRouter);
router.use(painelRouter);
router.use(postoAmenidadesRouter);
router.use(postosRouter);
router.use(anpRouter);
router.use(recompensasRouter);

export default router;
