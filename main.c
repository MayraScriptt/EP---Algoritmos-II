/*
 * JOGO DA RECICLAGEM (estilo Water Sort) - usando o conceito de PILHA (LIFO)
 *
 * Cada lixeira e uma pilha de lixos. Só o lixo do TOPO pode ser movido.
 * Regra: só pode colocar um lixo sobre outro do MESMO tipo (ou em lixeira vazia).
 * Vitória: cada tipo de lixo está junto em uma única lixeira.
 *
 * Compilar: gcc reciclagem.c -o reciclagem
 * Executar: ./reciclagem
 */

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define NUM_TIPOS      4              /* papel, vidro, metal, plastico */
#define CAPACIDADE     4              /* itens por lixeira (e por tipo) */
#define LIXEIRAS_VAZIAS 2             /* lixeiras extras para manobrar */
#define NUM_LIXEIRAS   (NUM_TIPOS + LIXEIRAS_VAZIAS)

/* Cada tipo tem uma letra e um nome */
static const char  SIMBOLOS[NUM_TIPOS] = {'P', 'V', 'M', 'L'};
static const char *NOMES[NUM_TIPOS]    = {"Papel", "Vidro", "Metal", "Plastico"};

/* ---------- PILHA ---------- */
typedef struct {
    int itens[CAPACIDADE];  /* guarda o tipo do lixo (0..NUM_TIPOS-1) */
    int topo;               /* indice do topo; -1 = pilha vazia */
} Pilha;

void inicializa(Pilha *p)        { p->topo = -1; }
int  vazia(const Pilha *p)       { return p->topo == -1; }
int  cheia(const Pilha *p)       { return p->topo == CAPACIDADE - 1; }

int push(Pilha *p, int tipo) {
    if (cheia(p)) return 0;
    p->itens[++p->topo] = tipo;
    return 1;
}

int pop(Pilha *p, int *tipo) {
    if (vazia(p)) return 0;
    *tipo = p->itens[p->topo--];
    return 1;
}

int topoDaPilha(const Pilha *p) {
    return vazia(p) ? -1 : p->itens[p->topo];
}

/* ---------- LOGICA DO JOGO ---------- */

/* Sorteia os lixos (embaralhamento Fisher-Yates) e distribui nas lixeiras */
void preencheLixeiras(Pilha lixeiras[]) {
    int total = NUM_TIPOS * CAPACIDADE;
    int todos[NUM_TIPOS * CAPACIDADE];
    int k = 0;

    for (int t = 0; t < NUM_TIPOS; t++)
        for (int i = 0; i < CAPACIDADE; i++)
            todos[k++] = t;

    for (int i = total - 1; i > 0; i--) {
        int j = rand() % (i + 1);
        int tmp = todos[i]; todos[i] = todos[j]; todos[j] = tmp;
    }

    for (int i = 0; i < NUM_LIXEIRAS; i++) inicializa(&lixeiras[i]);

    k = 0;
    for (int i = 0; i < NUM_TIPOS; i++)          /* as lixeiras extras ficam vazias */
        for (int j = 0; j < CAPACIDADE; j++)
            push(&lixeiras[i], todos[k++]);
}

/* Valida e executa o movimento do topo de 'origem' para 'destino' */
int moverLixo(Pilha lixeiras[], int origem, int destino) {
    if (origem == destino)               { printf("\n> Origem e destino iguais.\n"); return 0; }
    if (vazia(&lixeiras[origem]))        { printf("\n> A lixeira %d esta vazia.\n", origem + 1); return 0; }
    if (cheia(&lixeiras[destino]))       { printf("\n> A lixeira %d esta cheia.\n", destino + 1); return 0; }

    int tipo = topoDaPilha(&lixeiras[origem]);

    /* REGRA PRINCIPAL: so empilha se o destino estiver vazio ou tiver o mesmo tipo no topo */
    if (!vazia(&lixeiras[destino]) && topoDaPilha(&lixeiras[destino]) != tipo) {
        printf("\n> Movimento invalido: so e possivel empilhar o MESMO tipo de lixo.\n");
        return 0;
    }

    pop(&lixeiras[origem], &tipo);
    push(&lixeiras[destino], tipo);
    return 1;
}

/* Lixeira "resolvida": vazia, ou cheia com um unico tipo */
int lixeiraOrganizada(const Pilha *p) {
    if (vazia(p)) return 1;
    if (!cheia(p)) return 0;
    for (int i = 1; i <= p->topo; i++)
        if (p->itens[i] != p->itens[0]) return 0;
    return 1;
}

int venceu(Pilha lixeiras[]) {
    for (int i = 0; i < NUM_LIXEIRAS; i++)
        if (!lixeiraOrganizada(&lixeiras[i])) return 0;
    return 1;
}

/* ---------- INTERFACE ---------- */

void desenha(Pilha lixeiras[]) {
    printf("\n==============================\n");
    printf("      JOGO DA RECICLAGEM\n");
    printf("==============================\n");
    printf("Legenda: ");
    for (int t = 0; t < NUM_TIPOS; t++)
        printf("[%c]=%s  ", SIMBOLOS[t], NOMES[t]);
    printf("\n\n");

    /* desenha de cima para baixo */
    for (int nivel = CAPACIDADE - 1; nivel >= 0; nivel--) {
        for (int i = 0; i < NUM_LIXEIRAS; i++) {
            if (nivel <= lixeiras[i].topo)
                printf(" | %c |  ", SIMBOLOS[lixeiras[i].itens[nivel]]);
            else
                printf(" |   |  ");
        }
        printf("\n");
    }
    for (int i = 0; i < NUM_LIXEIRAS; i++) printf(" \\___/  ");
    printf("\n");
    for (int i = 0; i < NUM_LIXEIRAS; i++) printf("   %d    ", i + 1);
    printf("\n");
}

int main(void) {
    Pilha lixeiras[NUM_LIXEIRAS];
    int jogadas = 0;

    srand((unsigned)time(NULL));
    preencheLixeiras(lixeiras);

    printf("Mova o lixo do topo de uma lixeira para outra.\n");
    printf("Voce so pode empilhar o MESMO tipo de lixo (ou usar lixeira vazia).\n");
    printf("Digite: origem destino (ex: 1 5). Digite 0 0 para sair.\n");

    while (!venceu(lixeiras)) {
        desenha(lixeiras);
        printf("\nJogadas: %d\nMover de qual para qual? ", jogadas);

        int o, d;
        if (scanf("%d %d", &o, &d) != 2) {
            int c;
            while ((c = getchar()) != '\n' && c != EOF);   /* limpa buffer */
            printf("\n> Entrada invalida.\n");
            continue;
        }
        if (o == 0 && d == 0) { printf("\nAte a proxima!\n"); return 0; }
        if (o < 1 || o > NUM_LIXEIRAS || d < 1 || d > NUM_LIXEIRAS) {
            printf("\n> Escolha lixeiras entre 1 e %d.\n", NUM_LIXEIRAS);
            continue;
        }
        if (moverLixo(lixeiras, o - 1, d - 1)) jogadas++;
    }

    desenha(lixeiras);
    printf("\nPARABENS! Voce separou todo o lixo em %d jogadas! \n", jogadas);
    return 0;
}