# Utilitário Patrimônio

Ferramenta web para o dia a dia do setor de patrimônio da Polícia Civil do Estado do Pará. Reúne a formatação de RPs e a geração da publicação de bens baixados em um único aplicativo.

🔗 **[Acessar aplicação](https://www.yagowill.com.br/utilitario-patrimonio)**

---

## Funcionalidades

### Formatador de RPs
- Converte listas de RPs separadas por espaços em uma lista separada por vírgulas.
- Remove duplicatas automaticamente e informa a quantidade e os valores repetidos.
- Mantém a ordem original dos RPs informados.
- Botão para copiar o resultado e limpar a entrada.
- Tema claro e escuro com preferência salva no navegador.

### Termo Merge
- Lê o **Termo de Baixa de Bens Móveis** em PDF e extrai número do termo, data, chefias e a tabela de bens baixados.
- Lê o **Laudo de Avaliação de Bens Móveis** em PDF e extrai a situação do bem e a recomendação de cada RP.
- Cruza os dois documentos pelo RP, preservando a ordem original do Termo.
- Exibe um resumo de validação com contagens, RPs ausentes, RPs extras e duplicatas.
- Quando um RP não existe no Laudo, aplica a recomendação padrão **INCINERAÇÃO** e sinaliza o item para conferência.
- Pré-visualiza o resultado antes de gerar o arquivo.
- Gera e baixa a publicação institucional em `.docx`, com tabela, cabeçalho repetido por página e bloco de assinaturas.

> **Privacidade:** os PDFs são processados localmente no navegador. Nenhum documento é enviado para servidores.

## Tecnologias

- [Vue 3](https://vuejs.org/) com `<script setup lang="ts">`
- [Vite](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Vue Router](https://router.vuejs.org/)
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) para leitura dos PDFs
- [docx](https://docx.js.org/) e [file-saver](https://github.com/eligrey/FileSaver.js/) para geração e download do DOCX

## Rodando localmente

Requisitos: Node.js 20.19+ (ou 22.12+) e npm.

```bash
git clone https://github.com/yagowill/utilitario-patrimonio.git
cd utilitario-patrimonio
npm install
npm run dev
```

O Vite exibirá o endereço local da aplicação (normalmente `http://localhost:5173`).

### Scripts disponíveis

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # verificação de tipos + build de produção em dist/
npm run preview    # pré-visualização do build de produção
npm run type-check # apenas a verificação de tipos
```

## Deploy na Vercel

O projeto está configurado para hospedagem estática na [Vercel](https://vercel.com). O arquivo `vercel.json` define:

- framework `vite`;
- build `npm run build`;
- saída em `dist/`;
- rewrite de todas as rotas para `index.html`, permitindo acesso direto a `/termo-merge`.

Não há backend nem variáveis de ambiente obrigatórias.

## Estrutura do projeto

```text
src/
├── components/
│   ├── layout/          # cabeçalho, navegação e rodapé
│   └── ui/              # componentes reutilizáveis
├── features/
│   ├── rp-formatter/    # formatador de RPs
│   └── termo-merge/     # leitura dos PDFs, cruzamento e DOCX
├── router/              # rotas da aplicação
├── App.vue
├── main.ts
└── style.css
```

## Autor

Feito por [Yago Martins](https://github.com/yagowill) para facilitar o dia a dia do setor de patrimônio.
