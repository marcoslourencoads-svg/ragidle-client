/**
 * O MODO LEITURA NAO PODE CUSTAR A ENTRADA NO JOGO (D-992, 09/09/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * A CICATRIZ QUE CRIOU ESTE PORTAO
 * ═══════════════════════════════════════════════════════════════════════
 * A primeira versao de D-992 chamava `TelaAcesaNoFarm.ligar()` no
 * `MapEngine`, junto de `HudVertical.ligar()` — e **31 linhas ANTES** de:
 *
 *     Network.sendPacket(new PACKET.CZ.NOTIFY_ACTORINIT());
 *
 * Esse pacote e o aperto de mao que COMPLETA a entrada no mapa: e com ele
 * que o servidor poe o jogador em cena. Tudo que roda antes dele esta no
 * CAMINHO CRITICO — uma excecao ali e o pacote nunca sai, e o jogador nao
 * entra no jogo. Nao havia `try/catch` nenhum no caminho.
 *
 * Foi a producao que pagou: a alteracao subiu e o servidor teve de ser
 * revertido a mao para o commit anterior.
 *
 * **E o projeto JA TINHA essa cicatriz escrita**: o `CLAUDE.md` registra que
 * em 20/08/2026 o `ClassChangeNotice.init` lancou dentro do `MapEngine` e
 * deixou TODO jogador com tela preta, sem conseguir andar, por dias. O
 * padrao foi repetido com outro sujeito.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * POR QUE ELE LE O FONTE
 * ═══════════════════════════════════════════════════════════════════════
 * Porque o que se quer garantir e uma ORDEM e um ISOLAMENTO, e nenhum dos
 * dois aparece no resultado de uma funcao: um teste de comportamento veria
 * o modo leitura funcionando nos dois arranjos. O que separa o certo do
 * errado e onde a linha esta escrita.
 *
 * E o mesmo padrao de `gesto-pausa-missao.test.ts` no servidor, que le o
 * fonte e cobra pacote a pacote.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONTE = readFileSync(join(RAIZ, 'src', 'Engine', 'MapEngine.js'), 'utf8');

const APERTO_DE_MAO = 'PACKET.CZ.NOTIFY_ACTORINIT()';
const LIGAR = 'TelaAcesaNoFarm.ligar()';

describe('o modo leitura fica fora do caminho critico da entrada no mapa', () => {
	it('CONTROLE: as duas ancoras existem no MapEngine', () => {
		// Sem este caso, os dois testes abaixo passariam com o arquivo
		// renomeado ou a chamada removida — o "criterio que passa com zero".
		expect(FONTE.includes(APERTO_DE_MAO), 'o NOTIFY_ACTORINIT sumiu do MapEngine').toBe(true);
		expect(FONTE.includes(LIGAR), 'a chamada do modo leitura sumiu do MapEngine').toBe(true);
	});

	it('`ligar()` e chamado DEPOIS do NOTIFY_ACTORINIT', () => {
		const posAperto = FONTE.indexOf(APERTO_DE_MAO);
		const posLigar = FONTE.indexOf(LIGAR);
		expect(
			posLigar,
			'o modo leitura voltou para ANTES do aperto de mao: uma excecao nele impede o ' +
				'jogador de entrar no mapa. Mova a chamada para depois do NOTIFY_ACTORINIT.',
		).toBeGreaterThan(posAperto);
	});

	it('e a chamada esta dentro de um `try`', () => {
		/*
		 * Recorta a janela entre o aperto de mao e a chamada, e cobra um `try {`
		 * ali dentro. Nao e prova formal de escopo — e um pino barato contra a
		 * remocao distraida da tranca, que e o caso real a evitar.
		 */
		const posLigar = FONTE.indexOf(LIGAR);
		const janela = FONTE.slice(Math.max(0, posLigar - 400), posLigar);
		expect(
			janela.includes('try {'),
			'a chamada do modo leitura perdeu o `try`: sem ele, uma excecao volta a ' +
				'abortar o MapEngine.',
		).toBe(true);
	});

	it('o modulo se protege por dentro tambem, e nao so no chamador', () => {
		// A tranca do `MapEngine` e a de dentro sao redundantes DE PROPOSITO:
		// quem mover a chamada amanha nao precisa lembrar da de la.
		const modulo = readFileSync(join(RAIZ, 'src', 'UI', 'telaAcesaNoFarm.js'), 'utf8');
		const corpoDoLigar = modulo.slice(modulo.indexOf('export function ligar()'));
		expect(
			corpoDoLigar.slice(0, 600).includes('try {'),
			'`ligar()` perdeu a propria tranca',
		).toBe(true);
	});
});
