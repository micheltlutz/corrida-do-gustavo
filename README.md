# Corrida do Gustavo

Corrida de carrinho em 3D para crianças pequenas, **sem propagandas, sem compras e sem coleta de dados**.
O carro de corrida vermelho do Gustavo (com o **G** na porta) corre sozinho numa pista de 3 faixas. A cada rodada aparecem 3 portões com letras, e a criança troca de faixa para passar pela **letra certa** e montar o nome **GUSTAVO**.

**Palavras (22):**

- **Nomes:** GUSTAVO, MAMÃE, PAPAI, ERON, ROSANE, SANDRA, LARRY, ROSINHA, SUELI, NELSON, KAREN, MICHEL, SIMBA e SNOW.
- **Palavras com figura:** PATO 🦆, COELHO 🐰, ESCOLA 🏫, PROFESSORA 👩‍🏫, CACHORRO 🐶, PEIXE 🐟, IOGURTE 🥣 e BATATINHA 🥔.

Para colocar mais, é só acrescentar em `src/game/words.ts` (até 10 letras). Quando a lista não cabe na tela inicial, ela rola.

**Jogar:** https://micheltlutz.github.io/corrida-do-gustavo/

## Instalar no iPad

1. Abra o link acima no **Safari**.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra o jogo pelo ícone **uma vez com internet**. Depois disso ele funciona offline.

Funciona deitado e em pé.

## Como se joga

- **Largada:** a voz diz "Vamos montar o nome Gustavo!" e o semáforo acende: vermelho, vermelho, verde!
- **Trocar de faixa:** deslizar o dedo para o lado (ou tocar do lado do carro). Uma faixa por gesto.
- **Portões das letras:** a voz pede "Gustavo, troque de faixa para pegar a letra gê!". No painel lá em cima, o lugar da próxima letra pisca.
  - **Letra certa:** a placa estoura em confete e a letra voa para o painel.
  - **Letra errada:** o carro balança os pneus, a voz diz "Ops! Essa é a letra bê, vamos procurar a letra gê!" e os portões voltam logo à frente.
  - **Sem frustração:** depois de um erro, a letra certa brilha e ganha uma seta; depois do segundo, ela aparece nas 3 faixas.
  - As letras de distração nunca são parecidas com a certa (nada de G com C ou O).
- **Obstáculos para desviar:** cones, pilhas de pneus e caixotes aparecem na pista (com um pulinho) a partir da 2ª letra.
  - Bater não tem castigo: o carro balança, freia um pouquinho e o obstáculo sai voando. A voz diz "Opa! Bateu no cone!".
  - Nunca fecham as 3 faixas, e sempre dá tempo de voltar para a faixa da letra.
  - Nas primeiras vezes, a mãozinha mostra para que lado desviar.
  - Com o turbo ligado, o carro derruba tudo sem frear.
  - O botão do cone, na tela inicial, liga e desliga os obstáculos.
- **Turbo (botão grande de fogo):** acelera e o **ímã** puxa a próxima letra certa direto para o carro. Começa cheio; depois enche pegando **3 estrelas** na pista.
- **Pit Stop da Pipoca** (no meio da palavra): o carro passa numa poça de lama e entra na garagem.
  - **Pneus:** tocar nas rodas velhas para trocar por rodas novas.
  - **Lava-rápido:** esfregar a esponja até o carro brilhar.
  - **Adesivo:** escolher um (G, GUSTAVO, estrela, coração ou fogo). Ele fica no carro, também na pista.
- **Chegada:** o painel fica dourado, a voz soletra "Gê, U, Ésse, Tê, Á, Vê, Ó! Gustavo! Parabéns, campeão Gustavo! Você montou seu nome!" e o carro dá um **cavalo de pau** com confete, buzina e torcida.

A voz é a do próprio iPad (português), sem gravações. As músicas e os efeitos são sintetizados na hora.

## Desenvolvimento

Requer Node 24 ou mais novo.

```sh
npm install
npm run dev -- --host   # abre na rede local (teste no iPad pela Wi-Fi)
npm test                # a corrida inteira simulada (pilotos de teste), distrações e voz
npm run build           # versão final em dist/
npm run icons           # gera os ícones PNG a partir de public/icon.svg
```

- `src/game/race.ts`: a corrida sem desenho (faixas, portões, erros, ajuda, turbo, estrelas, lama, Pit Stop, chegada).
- `src/game/words.ts`: as palavras, o nome de cada letra para a voz e as letras de distração.
- `src/render/`: a cena 3D com Three.js — pista, cenário, carro, portões, partículas e o "mundo curvo".
- `src/ui/race.ts`: a tela da corrida (painel, turbo, gestos, narrador, festa).
- `src/ui/pitstop.ts`: o Pit Stop (pneus, esponja, adesivos).
- `src/audio/`: efeitos, motor, músicas e a voz.

Cada push na branch `main` roda os testes e publica no GitHub Pages.
