# Guia de Configuração (Pós-Clone)

Se você acabou de baixar ou clonar este repositório em um computador novo, os arquivos de execução do Electron não vêm inclusos por padrão (eles são muito pesados e foram ignorados pelo `.gitignore`). 

Para o aplicativo funcionar e resolver o erro de "electron não é executável", você precisará instalar as dependências.

Siga os passos abaixo:

### Passo 1: Instalar o Node.js
Certifique-se de que o **Node.js** está instalado no computador. Se não estiver, você pode baixar a versão mais recente em [nodejs.org](https://nodejs.org).

### Passo 2: Instalar as Dependências do Projeto
Abra o terminal (ou Prompt de Comando/PowerShell) dentro da pasta onde você clonou este projeto e execute o comando abaixo:

```bash
npm install
```

> **O que isso faz?** O comando vai ler o arquivo `package.json` e baixar todos os pacotes necessários, incluindo o executável do Electron para rodar o app no seu computador.

### Passo 3: Iniciar o Aplicativo
Após a instalação terminar (pode levar alguns segundos), o Electron estará pronto. Inicie o aplicativo com:

```bash
npm start
```

### (Opcional) Gerar o Instalador (.exe)
Se o seu objetivo é criar um arquivo de instalação para enviar para outras pessoas, basta rodar:

```bash
npm run build
```

Isso criará uma pasta chamada `dist/` com o instalador silencioso do aplicativo pronto para ser distribuído.
