export type Categoria = "qualidade_combustivel" | "volume_bomba" | "posto_clone" | "outra";
export type FaixaScore = "confiavel" | "atencao" | "suspeita";
export type FaixaRanking = "ouro" | "prata" | "bronze" | "sem_faixa";
export type PrazoEstado = "sem_prazo" | "no_prazo" | "vencendo" | "vencido" | "encerrado";

export interface PostoRow {
  id: string;
  cnpj: string | null;
  nome: string;
  razaoSocial: string | null;
  bandeira: string | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  lat: number | null;
  lng: number | null;
  tier: string | null;
  score: number | null;
  notaAnp: number | null;
  autuacoes24m: number | null;
  qualidadeConforme: boolean | null;
  bandeiraConsistente: boolean | null;
}

export interface DenunciaRow {
  id: string;
  protocolo: string;
  categoria: string;
  postoId: string | null;
  municipio: string | null;
  descricao: string;
  fotoNome: string | null;
  status: string;
  criadoEm: Date;
  userId: string | null;
  deviceId: string | null;
  lat: number | null;
  lng: number | null;
}

export interface CheckinRow {
  id: string;
  userId: string;
  postoId: string;
  pontos: number;
  distanciaM: number | null;
  criadoEm: Date;
}

export interface UsuarioRow {
  id: string;
  contato: string;
  criadoEm: Date;
  saldoPontos: number;
}

export interface AnpPosto {
  irregularidades: number;
  irregularidadesVolume: number;
  irregularidadesBandeira: number;
  ensaiosNaoConformes: number;
  amostrasNaoConformes: number;
}

export interface Capacidades {
  denunciante: boolean;
  localizacao: boolean;
  anexos: boolean;
  andamentosNoApp: boolean;
}

export interface Fator {
  chave: string;
  nome: string;
  impacto: number;
  neutro: boolean;
  detalhe: string;
}

export interface ScoreResultado {
  score: number;
  faixa: FaixaScore;
  fatores: Fator[];
}

export interface GestaoRow {
  denunciaId: string;
  prazoEm: Date | null;
  decisao: string | null;
  decisaoObservacao: string | null;
  decisaoPor: string | null;
  decisaoEm: Date | null;
  retiradaEm: Date | null;
  retiradaOrigem: string | null;
  retiradaResolucao: string | null;
  retiradaPor: string | null;
}

export interface AndamentoRow {
  id: number;
  denunciaId: string;
  status: string;
  orgao: string | null;
  mensagem: string;
  autorEmail: string;
  autorPapel: string;
  criadoEm: Date;
}

export interface ConfigRanking {
  bronze: number;
  prata: number;
  ouro: number;
}

export interface ReputacaoDenunciante {
  chave: string;
  tipo: "usuario" | "aparelho";
  id: string;
  rotulo: string;
  denuncias: DenunciaRow[];
  procedentes: number;
  improcedentes: number;
  verdadeiras: number;
  ultimos30d: number;
  postosDistintos: number;
  scoreMedio: number;
  motivos: string[];
}

export interface AlertaCampanhaRow {
  postoId: string;
  postoNome: string | null;
  totalDenuncias: number;
  denunciantesDistintos: number;
  janelaHoras: number;
  primeiraEm: Date;
  ultimaEm: Date;
  scoreMedio: number;
  motivo: string;
  denunciaIds: string[];
}
