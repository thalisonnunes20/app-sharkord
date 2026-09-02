# Aplicativo Desktop para Sharkord

<div align="left">
  <img src="https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E" alt="JavaScript" />
  <img src="https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
</div>

<br>

**Aviso Importante:** Este projeto não é uma cópia, um fork (bifurcação) ou um projeto concorrente do Sharkord. Trata-se unicamente de um cliente desktop (wrapper/web app) desenvolvido para facilitar a utilização da interface web original. Este projeto foi feito sem quaisquer fins lucrativos, sendo totalmente código aberto e de livre acesso para a comunidade.

---

## O Que é Este Projeto?

O Aplicativo Desktop para Sharkord é uma solução baseada em Electron que encapsula a interface da web de qualquer servidor Sharkord auto-hospedado em um formato de aplicativo de computador nativo. 

O Sharkord, por padrão, é acessado através de navegadores de internet. Porém, para usuários que preferem a sensação de um aplicativo dedicado — com suporte completo a atalhos independentes, janela separada e gerenciamento de recursos nativo —, esta aplicação atua como a ponte ideal.

### Como Funciona

Ao abrir o aplicativo pela primeira vez, você será recebido por uma tela de configuração limpa e moderna que solicita o endereço (URL) do seu servidor Sharkord pessoal. Uma vez inserido, o aplicativo salvará essa informação localmente. Nas próximas vezes em que você iniciar o aplicativo, ele pulará a etapa de configuração e o conectará diretamente ao seu servidor.

### Funcionalidades Integradas

- **Permissões Nativas Otimizadas:** O aplicativo é pré-configurado para interagir com o sistema operacional e autorizar automaticamente o uso de microfones e câmeras, poupando o usuário dos repetitivos alertas de navegadores.
- **Compartilhamento de Tela Avançado:** Com suporte direto à API do sistema operacional para captura de telas e janelas específicas.
- **Atualizações Silenciosas:** Uma vez empacotado e distribuído, o aplicativo conta com módulos de checagem para baixar instalações mais recentes em segundo plano, mantendo a experiência do usuário fluida.
- **Interface Imersiva:** Remoção da barra de título convencional de navegadores para garantir que o seu servidor receba 100% da sua atenção visual.
- **Controle de Domínios (Whitelist):** Por questões de direcionamento e segurança, a aplicação só permite conexão e navegação em URLs que possuam um subdomínio iniciado obrigatoriamente com a palavra `sharkord` (ex: `https://sharkord.seudominio.com`). Existe também uma exceção padrão que aceita conexões diretas ao servidor oficial em `https://demo.sharkord.com/`.
- **Sistema de Abas Persistente:** O aplicativo conta com suporte para múltiplas abas. Quando você encerra o app, o estado das suas abas é salvo automaticamente para que elas continuem abertas na próxima vez que você iniciá-lo!
- **Ampla Compatibilidade:** Totalmente compatível e rodando de forma lisa e estável nas versões mais atualizadas do **Windows 10** e **Windows 11**.

## Contribuindo

Como esta é uma ferramenta de código aberto focada na comunidade e sem restrições lucrativas, qualquer contribuição para aprimorar a segurança, desempenho ou compatibilidade deste cliente desktop é amplamente encorajada e apreciada. 

Para colaborar, sinta-se livre para clonar o repositório, testar as ferramentas e abrir pull requests.

## Projeto Original

Este aplicativo foi desenvolvido para se conectar a servidores da plataforma Sharkord. Você pode encontrar o código-fonte e toda a documentação do projeto web oficial e original no link abaixo:

[Repositório Original do Sharkord](https://github.com/sharkord/sharkord)

## Aos Desenvolvedores Originais

Este projeto foi criado inteiramente por admiradores da plataforma Sharkord. Nossa única intenção é fornecer uma alternativa de acesso mais prática (um *wrapper* nativo) para facilitar a experiência dos usuários em computadores de mesa, expandindo o alcance e a utilidade da excelente ferramenta original. 

Reforçamos que **não há intenção de plágio, clonagem ou roubo de propriedade intelectual**, e o aplicativo é disponibilizado de forma estritamente gratuita e open-source.

Caso a equipe de desenvolvimento ou o criador original do Sharkord tenha alguma objeção a este cliente desktop ou deseje que este repositório seja removido, pedimos que, por gentileza, entre em contato. Respeitamos totalmente os direitos dos criadores originais e atenderemos prontamente a qualquer solicitação formal de remoção.
