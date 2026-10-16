# Status e amenidades dos postos

## Uso no Admin Console

Abra **Postos → detalhe do posto → Status e amenidades**. A equipe ICL com papel master pode editar; outros papéis não acessam o catálogo interno nem os endpoints de edição.

Cada atributo possui valor, fonte, data de verificação, prazo opcional de revisão e autorização individual de exibição pública. O responsável e o instante da última alteração são registrados pelo servidor. **Sim**, **Não** e **Não verificado** são estados distintos; ausência de dados nunca significa ausência do serviço.

### Catálogo

| Categoria | Informações |
| --- | --- |
| Operação | Em operação, fechado temporariamente, encerrado permanentemente, suspenso ou não verificado; fuso local; horários semanais |
| Cadastro regulatório | Situação confirmada do cadastro ANP: autorizado, suspenso, revogado ou não verificado |
| Bandeira | Bandeira atual informada pela equipe e histórico de alterações, sem apagar valores anteriores |
| Combustíveis e mobilidade | Gasolina, etanol, diesel S10, diesel S500, GNV, recarga elétrica |
| Conveniência e alimentação | Conveniência, restaurante, cafeteria/lanchonete, água potável |
| Apoio ao motorista | Banheiro, chuveiro, estacionamento de caminhão, pernoite, área de descanso, Wi-Fi |
| Serviços automotivos | Calibragem, borracharia, mecânica, troca de óleo, lavagem |
| Acessibilidade | Acesso para cadeira de rodas e banheiro acessível |
| Pagamentos | Pix, cartão e convênio/cartão de frota |
| Verificação ICL | Indicador público genérico de verificação de equipamento, mediante confirmação e autorização do ICL |
| Segurança interna | Bomba criptografada: apenas registro interno; nunca enviado ao cliente |

O catálogo não faz uma inspeção nem importa automaticamente uma confirmação da ANP. A fonte deve ser registrada pela equipe responsável. O indicador genérico de verificação é independente do campo interno de criptografia e não é ativado automaticamente por ele.

## Funcionamento e horários

“Em operação” descreve a situação do estabelecimento, enquanto “aberto agora” depende de horário e fuso confirmados. Os horários aceitam dias fechados, atendimento 24h e um período por dia, inclusive atravessando a meia-noite. Horários em branco permanecem desconhecidos. As opções de fuso representam os quatro horários brasileiros atuais.

Para calcular a abertura pública, os horários e o fuso precisam estar confirmados e autorizados. Um fechamento/suspensão operacional público e confirmado prevalece sobre os horários. `abertoAgora: null` significa **não há confirmação suficiente**, não significa “fechado”. As datas de verificação/revisão são dias de calendário `YYYY-MM-DD`, avaliados pelo calendário de São Paulo.

## Publicação e integração com o ICL App

**GET `/api/postos-publicos/{id}/amenidades`** é uma leitura pública, sem necessidade de conta do Admin Console. Retorna somente atributos do catálogo autorizados individualmente, com fonte e data de verificação válidas e revisão em dia. Valores desconhecidos, vazios, privados, futuros ou vencidos são omitidos. Fonte, responsável, histórico e configurações internas nunca são retornados.

Resposta:

```json
{
  "postoId": "id-do-posto",
  "abertoAgora": null,
  "itens": [
    {
      "chave": "restaurante",
      "rotulo": "Restaurante",
      "grupo": "Conveniência e alimentação",
      "valor": "sim",
      "verificadoEm": "2026-10-16"
    }
  ]
}
```

Valores booleanos do catálogo são as strings `sim` ou `nao`; o cliente não deve tratar qualquer string como um booleano JavaScript. A bandeira é texto. O horário é um objeto com os sete dias: `segunda`, `terca`, `quarta`, `quinta`, `sexta`, `sabado`, `domingo`; cada dia possui `fechado`, `diaTodo`, `abertura` e `fechamento`. Nos dias fechados ou 24h, as horas são `null`. Campos adicionais inesperados do horário são removidos pelo servidor.

O backend do ICL App pode consumir esse endpoint de servidor para servidor. Este projeto não configura CORS amplo nem altera a tela do app cliente. A integração visual deve ser feita no repositório próprio do ICL App usando o mesmo ID do posto, respeitando campos ausentes e `abertoAgora: null`.

## Persistência e edição segura

- O catálogo e o histórico são armazenados **no banco próprio do backoffice** (`DATABASE_URL`), nunca em `APP_DATABASE_URL`.
- A bandeira complementar não sobrescreve o cadastro original do app/ANP.
- Não há DDL no início da aplicação nem migração automática para o banco externo do app.
- GET/PUT `/api/postos/{id}/amenidades` exigem login e papel master.
- O PUT aceita `itens` com `chave`, `valor`, `fonte`, `verificadoEm`, `revisarEm`, `publico` e `versao` (o `atualizadoEm` recebido na leitura, ou `null` para um atributo ainda não salvo).
- Edições do mesmo posto são serializadas; versões antigas retornam 409 e a transação inteira é desfeita. O usuário pode descartar alterações e recarregar antes de editar de novo.
- Para remover um valor confirmado, volte para “Não verificado”, limpe o texto ou deixe todos os horários em branco; desative a autorização pública quando necessário. O histórico da bandeira não é apagado.
- O formulário evita atualização automática enquanto há alterações locais e atualiza os dados visíveis após um salvamento bem-sucedido.

## Verificações de regressão

```sh
pnpm run typecheck
pnpm --filter @workspace/backoffice exec tsx --test \
  src/lib/posto-amenidades-form.test.ts \
  ../api-server/src/lib/posto-amenidades.test.ts
```
