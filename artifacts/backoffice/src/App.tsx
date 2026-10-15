import { useEffect, useRef, type ComponentType, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useGetSessao } from "@workspace/api-client-react";
import { queryClient } from "./lib/queryClient";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/shell";
import { ErrorState } from "@/components/kit";
import { SessaoProvider, useSessao } from "@/lib/sessao";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import { AcessoNegado, RestritoMaster, SessaoCarregando } from "@/pages/system";
import Mapa from "@/pages/mapa";
import Denuncias from "@/pages/denuncias";
import DenunciaDetalhe from "@/pages/denuncia-detalhe";
import Conformidade from "@/pages/conformidade";
import Recall from "@/pages/recall";
import Usuarios from "@/pages/usuarios";
import UsuarioDetalhe from "@/pages/usuario-detalhe";
import Ranking from "@/pages/ranking";
import Acessos from "@/pages/acessos";
import Painel from "@/pages/painel";
import Postos from "@/pages/postos";
import PostoDetalhe from "@/pages/posto-detalhe";
import Anp from "@/pages/anp";
import Recompensas from "@/pages/recompensas";
import Resgates from "@/pages/resgates";
import { Fuel } from "lucide-react";

// REQUIRED — copy verbatim.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(22 94% 48%)",
    colorForeground: "hsl(205 45% 11%)",
    colorMutedForeground: "hsl(205 14% 38%)",
    colorDanger: "hsl(356 74% 46%)",
    colorBackground: "hsl(42 40% 98.5%)",
    colorInput: "hsl(42 40% 99%)",
    colorInputForeground: "hsl(205 45% 11%)",
    colorNeutral: "hsl(205 30% 30%)",
    fontFamily: "'Instrument Sans', sans-serif",
    borderRadius: "0.375rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(42_40%_98.5%)] rounded-lg w-[420px] max-w-full overflow-hidden border border-[hsl(38_18%_82%)] shadow-[0_30px_60px_-30px_hsl(203_48%_11%/.45)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-['Bricolage_Grotesque'] text-[22px] font-bold text-[hsl(205_45%_11%)]",
    headerSubtitle: "text-[hsl(205_14%_38%)]",
    socialButtonsBlockButtonText: "text-[hsl(205_45%_11%)] font-semibold",
    formFieldLabel: "text-[hsl(205_45%_11%)] font-medium",
    footerActionLink: "text-[hsl(22_94%_44%)] font-semibold",
    footerActionText: "text-[hsl(205_14%_38%)]",
    dividerText: "text-[hsl(205_14%_38%)]",
    identityPreviewEditButton: "text-[hsl(22_94%_44%)]",
    formFieldSuccessText: "text-[hsl(158_55%_30%)]",
    alertText: "text-[hsl(205_45%_11%)]",
    logoBox: "h-11 justify-start",
    logoImage: "h-11 w-11",
    socialButtonsBlockButton: "border border-[hsl(38_18%_78%)] bg-[hsl(42_40%_99%)]",
    formButtonPrimary: "bg-[hsl(22_94%_48%)] text-[hsl(40_60%_98%)] font-semibold shadow-none",
    formFieldInput: "border border-[hsl(38_18%_76%)] bg-[hsl(42_40%_99%)] text-[hsl(205_45%_11%)]",
    footerAction: "bg-[hsl(40_22%_92%)] py-3",
    dividerLine: "bg-[hsl(38_18%_82%)]",
    alert: "border border-[hsl(356_74%_46%/.3)] bg-[hsl(356_74%_46%/.06)]",
    otpCodeFieldInput: "border border-[hsl(38_18%_76%)] text-[hsl(205_45%_11%)]",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

function AuthFrame({ children, title, sub }: { children: ReactNode; title: string; sub: string }) {
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="hazard absolute inset-x-0 top-0 h-2" />
        <div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded bg-sidebar-primary text-sidebar-primary-foreground"><Fuel className="size-4" /></div><span className="font-display text-lg font-bold">ICL Backoffice</span></div>
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-sidebar-primary">Rede Regular</div>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.03em]">{title}</h1>
          <p className="mt-4 max-w-sm text-[14px] text-sidebar-foreground/70">{sub}</p>
        </div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sidebar-foreground/40">Horário de Brasília · America/Sao_Paulo</div>
      </div>
      <div className="grid-paper flex items-center justify-center px-4 py-10">{children}</div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthFrame title="De volta à sala de controle." sub="Entre com seu e-mail ou conta Google para acompanhar as denúncias do seu escopo.">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame title="Responda quem abastece no seu posto." sub="Crie sua conta com o e-mail liberado pela equipe ICL. Sem liberação, o acesso fica bloqueado.">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthFrame>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/mapa" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function master(C: ComponentType) {
  return function MasterOnly() {
    const { isMaster } = useSessao();
    return isMaster ? <C /> : <RestritoMaster />;
  };
}
const MConformidade = master(Conformidade);
const MUsuarios = master(Usuarios);
const MUsuarioDetalhe = master(UsuarioDetalhe);
const MRanking = master(Ranking);
const MAcessos = master(Acessos);
const MPainel = master(Painel);
const MAnp = master(Anp);
const MRecompensas = master(Recompensas);
const MResgates = master(Resgates);

function AppRoutes() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/mapa" component={Mapa} />
        <Route path="/denuncias" component={Denuncias} />
        <Route path="/denuncias/:id" component={DenunciaDetalhe} />
        <Route path="/conformidade" component={MConformidade} />
        <Route path="/recall" component={Recall} />
        <Route path="/usuarios" component={MUsuarios} />
        <Route path="/usuarios/:id" component={MUsuarioDetalhe} />
        <Route path="/ranking" component={MRanking} />
        <Route path="/acessos" component={MAcessos} />
        <Route path="/painel" component={MPainel} />
        <Route path="/postos" component={Postos} />
        <Route path="/postos/:id" component={PostoDetalhe} />
        <Route path="/anp" component={MAnp} />
        <Route path="/recompensas" component={MRecompensas} />
        <Route path="/resgates" component={MResgates} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function SessaoGate() {
  const q = useGetSessao();
  const { user } = useUser();
  if (q.isLoading) return <SessaoCarregando />;
  if (q.error?.status === 403) return <AcessoNegado email={user?.primaryEmailAddress?.emailAddress} />;
  if (q.isError || !q.data) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background"><div className="rounded-md border border-border bg-card"><ErrorState onRetry={() => q.refetch()} message="Não foi possível carregar sua sessão." /></div></div>;
  }
  return (
    <SessaoProvider value={q.data}>
      <Shell><AppRoutes /></Shell>
    </SessaoProvider>
  );
}

function Protected() {
  return (
    <>
      <Show when="signed-in"><SessaoGate /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        locale: "pt-BR",
        signIn: {
          start: { title: "Entrar no ICL Backoffice", subtitle: "Use seu e-mail ou conta Google", actionText: "Não tem conta?", actionLink: "Criar conta" },
          password: { title: "Digite sua senha", subtitle: "para continuar no ICL Backoffice", actionLink: "Usar outro método" },
          forgotPasswordAlternativeMethods: { title: "Esqueceu a senha?" },
        },
        signUp: {
          start: { title: "Criar sua conta", subtitle: "Use o e-mail liberado pela equipe ICL", actionText: "Já tem conta?", actionLink: "Entrar" },
          emailCode: { title: "Confirme seu e-mail", subtitle: "Digite o código enviado para seu e-mail", formTitle: "Código de verificação", resendButton: "Reenviar código" },
        },
        socialButtonsBlockButton: "Continuar com {{provider|titleize}}",
        dividerText: "ou",
        formFieldLabel__emailAddress: "E-mail",
        formFieldLabel__password: "Senha",
        formFieldLabel__firstName: "Nome",
        formFieldLabel__lastName: "Sobrenome",
        formFieldInputPlaceholder__emailAddress: "voce@empresa.com.br",
        formFieldInputPlaceholder__password: "Sua senha",
        formButtonPrimary: "Continuar",
        footerPageLink__help: "Ajuda",
        footerPageLink__privacy: "Privacidade",
        footerPageLink__terms: "Termos",
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={Protected} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
