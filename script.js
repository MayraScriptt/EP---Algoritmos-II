/* =====================================================================
   JOGO DA RECICLAGEM - cada lixeira é uma PILHA (LIFO)

   Além do jogo, este arquivo controla o painel "Código em execução":
   a função passo() destaca, no painel, a linha que está sendo executada
   e espera um pouco para dar tempo de acompanhar.
   ===================================================================== */

const TIPOS = [
  { id: "papel",    nome: "Papel",    emoji: "📄" },
  { id: "vidro",    nome: "Vidro",    emoji: "🍾" },
  { id: "metal",    nome: "Metal",    emoji: "🥫" },
  { id: "plastico", nome: "Plástico", emoji: "🧴" },
];
const CAPACIDADE = 4;        // itens por lixeira (e por tipo)
const LIXEIRAS_VAZIAS = 2;   // lixeiras extras para manobrar

const MSG = {
  igual: "Escolha outra lixeira.",
  vazia: "Essa lixeira está vazia.",
  cheia: "A lixeira de destino está cheia.",
  tipo:  "Só é possível empilhar o MESMO tipo de lixo!",
};

/* ---------- PILHA ---------- */
class Pilha {
  constructor() { this.itens = []; }
  push(x)  { if (this.cheia()) return false; this.itens.push(x); return true; }
  pop()    { return this.vazia() ? null : this.itens.pop(); }
  topo()   { return this.vazia() ? null : this.itens[this.itens.length - 1]; }
  vazia()  { return this.itens.length === 0; }
  cheia()  { return this.itens.length === CAPACIDADE; }
}

/* ---------- ESTADO ---------- */
let lixeiras = [];
let selecionada = null;
let jogadas = 0;
let historico = { itens: [] };   // pilha de movimentos (usada pelo "desfazer")
let terminou = false;
let ocupado = false;             // true enquanto o código está sendo "narrado"
let geracao = 0;                 // muda a cada novo jogo (cancela narração antiga)
const CANCELADO = Symbol("cancelado");

const elLixeiras   = document.getElementById("lixeiras");
const elJogadas    = document.getElementById("jogadas");
const elMsg        = document.getElementById("mensagem");
const elCodigo     = document.getElementById("codigo");
const elExplica    = document.getElementById("explica");
const elVelocidade = document.getElementById("velocidade");
const btnDesfazer  = document.getElementById("btnDesfazer");
const btnReiniciar = document.getElementById("btnReiniciar");

const nomeDe = id => TIPOS.find(t => t.id === id).nome;

/* =====================================================================
   PAINEL DE CÓDIGO
   Cada linha tem uma "tag". passo(["tag"]) destaca todas as linhas
   que possuem aquela tag.
   ===================================================================== */
const CODIGO = [
  ["// Cada lixeira é uma Pilha (LIFO)", ""],
  ["class Pilha {", ""],
  ["  push(x) {", "push"],
  ["    if (this.cheia()) return false;", "push"],
  ["    this.itens.push(x);", "push"],
  ["    return true;", "push"],
  ["  }", "push"],
  ["  pop() {", "pop"],
  ["    return this.itens.pop();", "pop"],
  ["  }", "pop"],
  ["  topo() {", "topo"],
  ["    return this.itens[this.itens.length - 1];", "topo"],
  ["  }", "topo"],
  ["  vazia() { return this.itens.length === 0; }", "vazia"],
  ["  cheia() { return this.itens.length === CAPACIDADE; }", "cheia"],
  ["}", ""],
  ["", ""],
  ["// ── Clique do jogador ──", ""],
  ["function clicouLixeira(i) {", "clique"],
  ["  if (selecionada === null) {", "sel-if"],
  ["    if (lixeiras[i].vazia()) return;", "sel-vazia"],
  ["    selecionada = i;", "sel-set"],
  ["  } else if (selecionada === i) {", "cancel-if"],
  ["    selecionada = null;", "cancel"],
  ["  } else {", ""],
  ["    mover(selecionada, i);", "chama-mover"],
  ["  }", ""],
  ["}", ""],
  ["", ""],
  ["// ── Movimento ──", ""],
  ["function mover(origem, destino) {", "mover"],
  ["  const erro = movimentoValido(origem, destino);", "mover-valida"],
  ["  if (erro) return mostrarMensagem(erro);", "mover-erro"],
  ["  const tipo = lixeiras[origem].pop();", "mover-pop"],
  ["  lixeiras[destino].push(tipo);", "mover-push"],
  ["  historico.itens.push({ origem, destino });", "mover-hist"],
  ["  jogadas++;", "mover-cont"],
  ["  if (venceu()) terminou = true;", "mover-venceu"],
  ["}", ""],
  ["", ""],
  ["// ── Regras do jogo ──", ""],
  ["function movimentoValido(origem, destino) {", "valida"],
  ["  if (origem === destino) return MSG.igual;", "v-igual"],
  ["  if (lixeiras[origem].vazia()) return MSG.vazia;", "v-vazia"],
  ["  if (lixeiras[destino].cheia()) return MSG.cheia;", "v-cheia"],
  ["  const tipo = lixeiras[origem].topo();", "v-topo"],
  ["  if (!lixeiras[destino].vazia() &&", "v-tipo"],
  ["      lixeiras[destino].topo() !== tipo) return MSG.tipo;", "v-tipo"],
  ["  return null; // movimento permitido", "v-ok"],
  ["}", ""],
  ["", ""],
  ["// ── Vitória ──", ""],
  ["function lixeiraOrganizada(p) {", ""],
  ["  if (p.vazia()) return true;", "o-vazia"],
  ["  return p.cheia() && p.itens.every(x => x === p.itens[0]);", "o-cheia"],
  ["}", ""],
  ["function venceu() { return lixeiras.every(lixeiraOrganizada); }", "venceu"],
  ["", ""],
  ["// ── Desfazer (usa a pilha de histórico) ──", ""],
  ["function desfazer() {", "desfazer"],
  ["  const { origem, destino } = historico.itens.pop();", "d-hist"],
  ["  const tipo = lixeiras[destino].pop();", "d-pop"],
  ["  lixeiras[origem].push(tipo);", "d-push"],
  ["  jogadas--;", "d-cont"],
  ["}", ""],
];

function escapar(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// colore comentários, textos, palavras reservadas e números
function colorir(texto) {
  const re = /(\/\/.*$)|("[^"]*")|\b(class|function|const|if|else|return|null|true|false|let)\b|\b(\d+)\b/g;
  return escapar(texto).replace(re, (m, com, str, kw, num) => {
    if (com) return `<span class="tk-com">${com}</span>`;
    if (str) return `<span class="tk-str">${str}</span>`;
    if (kw)  return `<span class="tk-kw">${kw}</span>`;
    if (num) return `<span class="tk-num">${num}</span>`;
    return m;
  });
}

function montarCodigo() {
  elCodigo.innerHTML = "";
  CODIGO.forEach(([texto, tag]) => {
    const div = document.createElement("div");
    div.className = "linha";
    if (tag) div.dataset.tag = tag;
    div.innerHTML = colorir(texto) || " ";
    elCodigo.appendChild(div);
  });
}

function limparDestaques() {
  elCodigo.querySelectorAll(".linha").forEach(l => {
    l.classList.remove("ativa", "ativo", "ok", "erro", "secundaria");
  });
}

const dormir = ms => new Promise(r => setTimeout(r, ms));

/* Destaca as linhas de `tags`, mostra a explicação e espera.
   estado: "ativo" (amarelo) | "ok" (verde) | "erro" (vermelho)
   sec: tags de métodos chamados (azul) */
async function passo(tags, texto, estado = "ativo", sec = []) {
  const minha = geracao;
  limparDestaques();

  let primeira = null;
  tags.forEach(t => {
    elCodigo.querySelectorAll(`.linha[data-tag="${t}"]`).forEach(l => {
      l.classList.add("ativa", estado);
      if (!primeira) primeira = l;
    });
  });
  sec.forEach(t => {
    elCodigo.querySelectorAll(`.linha[data-tag="${t}"]`).forEach(l => l.classList.add("secundaria"));
  });

  elExplica.textContent = texto;
  elExplica.className = "explica " + estado;

  // rola só o painel de código (não a página) para a linha ficar visível
  if (primeira) {
    const alvo = primeira.offsetTop - elCodigo.clientHeight / 2 + primeira.offsetHeight / 2;
    elCodigo.scrollTo({ top: Math.max(0, alvo), behavior: "smooth" });
  }

  await dormir(Number(elVelocidade.value));
  if (minha !== geracao) throw CANCELADO;   // novo jogo iniciado: aborta
}

/* Executa uma ação narrada, impedindo cliques enquanto ela acontece */
async function executar(acao) {
  if (ocupado) return;
  ocupado = true;
  atualizarBotoes();
  const minha = geracao;
  try {
    await acao();
  } catch (e) {
    if (e !== CANCELADO) throw e;
  } finally {
    if (minha === geracao) ocupado = false;
    atualizarBotoes();
  }
}

/* =====================================================================
   LÓGICA DO JOGO (narrada com passo())
   ===================================================================== */
function novoJogo() {
  geracao++;
  ocupado = false;

  const todos = [];
  TIPOS.forEach(t => { for (let i = 0; i < CAPACIDADE; i++) todos.push(t.id); });
  for (let i = todos.length - 1; i > 0; i--) {            // Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    [todos[i], todos[j]] = [todos[j], todos[i]];
  }

  lixeiras = [];
  let k = 0;
  for (let i = 0; i < TIPOS.length; i++) {
    const p = new Pilha();
    for (let j = 0; j < CAPACIDADE; j++) p.push(todos[k++]);
    lixeiras.push(p);
  }
  for (let i = 0; i < LIXEIRAS_VAZIAS; i++) lixeiras.push(new Pilha());

  selecionada = null;
  jogadas = 0;
  historico = { itens: [] };
  terminou = false;

  limparDestaques();
  elCodigo.scrollTo({ top: 0 });
  elExplica.textContent = "Novo jogo: as pilhas foram criadas e preenchidas em ordem aleatória. Clique em uma lixeira!";
  elExplica.className = "explica";
  mostrarMensagem("");
  desenhar();
}

function clicouLixeira(i) {
  if (terminou) return;
  executar(async () => {
    await passo(["clique"], `Você clicou na lixeira ${i + 1}.`);

    if (selecionada === null) {
      await passo(["sel-if"], "Ainda não há nenhuma lixeira selecionada: este clique escolhe a ORIGEM.");
      if (lixeiras[i].vazia()) {
        await passo(["sel-vazia"], "A lixeira está vazia, não há lixo para pegar.", "erro", ["vazia"]);
        mostrarMensagem(MSG.vazia, "erro");
        return;
      }
      selecionada = i;
      desenhar();
      const t = nomeDe(lixeiras[i].topo());
      await passo(["sel-set"], `Lixeira ${i + 1} selecionada. O lixo do topo é: ${t}.`, "ok", ["topo"]);
      mostrarMensagem("");

    } else if (selecionada === i) {
      await passo(["cancel-if"], "Você clicou na mesma lixeira que já estava selecionada.");
      selecionada = null;
      desenhar();
      await passo(["cancel"], "Seleção cancelada.");

    } else {
      const origem = selecionada;
      selecionada = null;
      desenhar();
      await passo(["chama-mover"], `Já havia uma origem (lixeira ${origem + 1}): este clique escolhe o DESTINO e chama mover().`);
      await mover(origem, i);
    }
  });
}

async function mover(origem, destino) {
  await passo(["mover"], `mover(${origem + 1}, ${destino + 1}): tenta passar o lixo do topo da lixeira ${origem + 1} para a ${destino + 1}.`);
  await passo(["mover-valida"], "Antes de mexer nas pilhas, pergunta às regras se o movimento é permitido.");

  const erro = await movimentoValido(origem, destino);
  if (erro) {
    await passo(["mover-erro"], `Movimento recusado: ${erro} Nada foi alterado nas pilhas.`, "erro");
    mostrarMensagem(erro, "erro");
    return;
  }
  mostrarMensagem("");

  const tipo = lixeiras[origem].pop();
  desenhar();
  await passo(["mover-pop"], `pop(): retirou ${nomeDe(tipo)} do topo da lixeira ${origem + 1}.`, "ativo", ["pop"]);

  lixeiras[destino].push(tipo);
  desenhar();
  await passo(["mover-push"], `push(): colocou ${nomeDe(tipo)} no topo da lixeira ${destino + 1}.`, "ativo", ["push"]);

  historico.itens.push({ origem, destino });
  await passo(["mover-hist"], "Guarda o movimento em outra pilha (histórico), que o botão Desfazer usa.");

  jogadas++;
  desenhar();
  await passo(["mover-cont"], `Conta a jogada (total: ${jogadas}).`);

  const ganhou = venceu();
  if (ganhou) terminou = true;
  await passo(
    ["mover-venceu"],
    ganhou ? `venceu() = true: todas as lixeiras estão organizadas! 🎉` : "venceu() = false: ainda há lixeiras misturadas, continue jogando.",
    ganhou ? "ok" : "ativo",
    ["venceu", "o-vazia", "o-cheia"]
  );
  if (ganhou) mostrarMensagem(`🎉 Parabéns! Você separou tudo em ${jogadas} jogadas!`, "ok");
}

/* Cada checagem mostra no painel se "passou" (verde) ou "falhou" (vermelho) */
async function checar(tag, falhou, textoFalha, textoOk, sec = []) {
  await passo([tag], falhou ? textoFalha : textoOk, falhou ? "erro" : "ok", sec);
  return falhou;
}

async function movimentoValido(origem, destino) {
  const O = lixeiras[origem];
  const D = lixeiras[destino];

  await passo(["valida"], "movimentoValido(): aplica as regras, uma por vez.");

  if (await checar("v-igual", origem === destino,
      "Origem e destino são a mesma lixeira.", "Origem e destino são diferentes ✔")) return MSG.igual;

  if (await checar("v-vazia", O.vazia(),
      "A origem está vazia.", "A origem tem lixo ✔", ["vazia"])) return MSG.vazia;

  if (await checar("v-cheia", D.cheia(),
      "O destino está cheio.", "O destino ainda tem espaço ✔", ["cheia"])) return MSG.cheia;

  const tipo = O.topo();
  await passo(["v-topo"], `Lê o topo da origem sem retirar: ${nomeDe(tipo)}.`, "ativo", ["topo"]);

  const topoDestino = D.topo();
  if (await checar("v-tipo", !D.vazia() && topoDestino !== tipo,
      `O topo do destino é ${topoDestino ? nomeDe(topoDestino) : ""}, diferente de ${nomeDe(tipo)}. Só pode empilhar o MESMO tipo!`,
      D.vazia() ? "O destino está vazio: qualquer lixo pode entrar ✔" : `O topo do destino também é ${nomeDe(tipo)} ✔`,
      ["vazia", "topo"])) return MSG.tipo;

  await passo(["v-ok"], "Nenhuma regra foi violada: movimento permitido.", "ok");
  return null;
}

function desfazer() {
  if (terminou || historico.itens.length === 0) return;
  executar(async () => {
    await passo(["desfazer"], "Desfazer: vai reverter a última jogada.");

    const { origem, destino } = historico.itens.pop();
    await passo(["d-hist"], "Retira (pop) o último movimento da pilha de histórico.");

    const tipo = lixeiras[destino].pop();
    selecionada = null;
    desenhar();
    await passo(["d-pop"], `pop(): retirou ${nomeDe(tipo)} da lixeira ${destino + 1}.`, "ativo", ["pop"]);

    lixeiras[origem].push(tipo);
    desenhar();
    await passo(["d-push"], `push(): devolveu ${nomeDe(tipo)} para a lixeira ${origem + 1}.`, "ativo", ["push"]);

    jogadas--;
    desenhar();
    await passo(["d-cont"], `Desconta a jogada (total: ${jogadas}).`);
    mostrarMensagem("");
  });
}

/* ---------- Regras de vitória ---------- */
function lixeiraOrganizada(p) {
  if (p.vazia()) return true;
  return p.cheia() && p.itens.every(x => x === p.itens[0]);
}
function venceu() { return lixeiras.every(lixeiraOrganizada); }

/* =====================================================================
   INTERFACE
   ===================================================================== */
function mostrarMensagem(texto, classe = "") {
  elMsg.textContent = texto;
  elMsg.className = classe;
}

function atualizarBotoes() {
  btnDesfazer.disabled = ocupado || terminou || historico.itens.length === 0;
}

function desenhar() {
  elLixeiras.innerHTML = "";
  lixeiras.forEach((pilha, i) => {
    const div = document.createElement("div");
    div.className = "lixeira";
    if (selecionada === i) div.classList.add("selecionada");
    if (!pilha.vazia() && lixeiraOrganizada(pilha)) div.classList.add("completa");
    div.addEventListener("click", () => clicouLixeira(i));

    pilha.itens.forEach((tipoId, pos) => {
      const tipo = TIPOS.find(t => t.id === tipoId);
      const item = document.createElement("div");
      item.className = `lixo ${tipo.id}`;
      if (pos === pilha.itens.length - 1) item.classList.add("topo");
      item.textContent = tipo.emoji;
      item.title = tipo.nome;
      div.appendChild(item);
    });

    const num = document.createElement("span");
    num.className = "numero";
    num.textContent = i + 1;
    div.appendChild(num);

    elLixeiras.appendChild(div);
  });

  elJogadas.textContent = jogadas;
  atualizarBotoes();
}

function montarLegenda() {
  const el = document.getElementById("legenda");
  TIPOS.forEach(t => {
    const s = document.createElement("span");
    s.style.background = `var(--${t.id})`;
    s.textContent = `${t.emoji} ${t.nome}`;
    el.appendChild(s);
  });
}

btnDesfazer.addEventListener("click", desfazer);
btnReiniciar.addEventListener("click", novoJogo);

montarLegenda();
montarCodigo();
novoJogo();