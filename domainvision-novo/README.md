# Domain Vision — Barbearia

Landing page responsiva para agendamento, com foto enviada do Davi, animações leves e consulta de disponibilidade no Google Calendar. Os serviços ocupam uma hora. Um agendamento aceito pelo servidor cria um evento provisório na agenda da barbearia; o cliente pode salvar uma cópia no Google Calendar ou importar um arquivo `.ics`. A confirmação continua pelo WhatsApp.

## Abrir localmente

Dentro desta pasta, execute:

```powershell
npm start
```

Abra [http://localhost:4173](http://localhost:4173). O formulário continua disponível sem as credenciais, mas exibirá preferências para confirmação pelo WhatsApp. Para experimentar a integração real localmente, copie `.env.example` para `.env.local` e preencha as variáveis. O `.env.local` é ignorado pelo Git.

## Configurar o Google Calendar

1. No Google Cloud, crie uma conta de serviço e habilite a Calendar API.
2. Compartilhe a agenda do Davi com o e-mail da conta de serviço, dando permissão para **fazer alterações nos eventos**.
3. Copie o ID dessa agenda e o e-mail da conta de serviço. Armazene a chave privada apenas no `.env.local` local e nas variáveis de ambiente do projeto Vercel:

   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

4. No Vercel, configure as variáveis para os ambientes desejados e faça um novo deploy. Se este site for um projeto separado, configure `domainvision-novo` como o diretório raiz do projeto.

O endpoint de disponibilidade consulta apenas períodos ocupados. Na gravação, o servidor consulta a agenda de novo para evitar salvar um horário que acabou de ser tomado. O evento fica como provisório e ocupa a agenda do Davi; o cliente escolhe **Adicionar ao Google Calendar** ou baixa o `.ics`, e confirma pelo WhatsApp.

Uma conta de serviço não pode incluir participantes externos no evento sem delegação administrativa do Workspace. Por isso, o site oferece um link de inclusão na agenda do cliente em vez de acessar a conta Google pessoal dele. [Google sobre contas de serviço](https://developers.google.com/identity/protocols/oauth2/service-account), [consulta de livre/ocupado](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) e [criação de eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

## Verificações

```powershell
npm test
```

Os testes usam dados simulados do Google Calendar; eles não criam eventos reais.

O retrato da hero permanece uma imagem ilustrativa da Unsplash; o perfil do Davi usa a foto fornecida pelo usuário.
