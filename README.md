# Limavi Fisioterapia — Sistema de Gestão Clínica

## Como usar no GitHub Pages

1. Faça upload de todos os arquivos para um repositório GitHub
2. Vá em **Settings → Pages → Source: main / (root)**
3. Acesse o link gerado (ex: `https://seuusuario.github.io/limavi-app/`)

## Credencial padrão
- **Usuário:** `admin@limavi.com`
- **Senha:** `limavi2024`

> Troque a senha após o primeiro acesso em **Profissionais → Editar Admin**.

## Funcionalidades

- 🔐 Login por email/senha com persistência de sessão
- 👤 Cadastro completo de pacientes
- 📅 Agenda semanal com navegação por semanas
- 📋 Evoluções no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano)
- 📝 Anamnese detalhada por paciente
- 👨‍⚕️ Cadastro de profissionais (admin only)
- 📊 Relatórios de pacientes, agendamentos e evoluções
- 📱 PWA — pode ser instalado na tela inicial do celular
- 💾 Dados salvos localmente (localStorage)

## Arquivos

| Arquivo | Descrição |
|---|---|
| `index.html` | Estrutura do app |
| `style.css` | Estilos e responsividade |
| `app.js` | Toda a lógica do sistema |
| `manifest.json` | Configuração PWA |
| `sw.js` | Service Worker (offline) |
| `icon-192.png` | Ícone do app |
| `icon-512.png` | Ícone do app (grande) |

