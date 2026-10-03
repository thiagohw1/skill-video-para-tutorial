# Helper de vídeo e tutorial

`scripts/tutorial.cjs` usa Node, `sharp`, `ffmpeg` e `ffprobe`. Se Node não encontrar `sharp`, configure `NODE_PATH` com o diretório de pacotes retornado por `load_workspace_dependencies`. Use caminhos reais retornados pelo ambiente, sem copiar os caminhos de uma execução anterior.

```sh
node <skill>/scripts/tutorial.cjs inspect <video>
node <skill>/scripts/tutorial.cjs sample <video> <pasta-work> [intervalo-em-segundos]
node <skill>/scripts/tutorial.cjs build <video> <manifesto.json> <pasta-final> <pasta-work>
```

`inspect` retorna metadados. `sample` extrai quadros com timestamps explícitos e cria folhas de contato de 12 quadros. O intervalo automático visa cerca de 32 quadros; vídeos complexos exigem refinamento. Os quadros amostrados ficam reduzidos para análise. `build` extrai novamente cada quadro selecionado em resolução original, aplica recortes e anotações, e gera os arquivos finais e o ZIP ao lado da pasta final. Não sobrescreve uma pasta final com arquivos: para revisão, use uma nova pasta e substitua a versão anterior somente depois de validar.

O manifesto de análise recebido por `build` é diferente do `tutorial.json` gerado para importação. O primeiro contém timestamps e coordenadas; o segundo referencia o conteúdo separado de cada passo. Leia [macacapp.md](macacapp.md) para o contrato de saída. `build` gera automaticamente os dois formatos de apresentação: pacote “Passo a passo” para o macacapp e artigo HTML completo para prévia/outros sites.

## Manifesto

Os textos são texto simples, não HTML. Determine as coordenadas após ver as capturas originais. `crop` usa pixels do quadro original; `rect` usa pixels relativos à origem do recorte. Máximo de três destaques por imagem para manter as legendas legíveis. Divida a etapa se mais destaques forem necessários.

```json
{
  "title": "Como realizar o procedimento",
  "subtitle": "SISTEMA · GUIA PASSO A PASSO",
  "intro": "O que este tutorial ensina e qual resultado o leitor terá.",
  "note": "Observação baseada no vídeo, se necessária.",
  "conclusion": "Resultado comprovado na gravação e como conferi-lo.",
  "steps": [
    {
      "title": "Abra a função",
      "text": "Clique no menu observado e selecione a função mostrada.",
      "time": 3.2,
      "crop": [0, 100, 1200, 800],
      "marks": [
        {
          "rect": [300, 120, 220, 50],
          "title": "Selecione a função",
          "body": "Esse botão abre a janela do procedimento."
        }
      ]
    }
  ]
}
```

`title`, `intro`, `steps` e os campos de cada etapa são obrigatórios. `subtitle`, `note`, `conclusion` e `marks` são opcionais. Cada etapa deve ter uma captura, mas pode dispensar destaques quando a tela inteira já comprova o resultado. `time` é um segundo real do vídeo, inclusive valores fracionários.

Se for útil examinar um instante adicional, extraia-o diretamente com `ffmpeg -ss <segundos> -i <video> -frames:v 1 <quadro.png>` e veja a imagem. Não altere o timestamp no manifesto para disfarçar uma captura escolhida em outro momento.

O visual usa fundo claro, cabeçalho azul e destaques laranja. O CSS do artigo fica em `assets/article.css`. Preferências adicionais do usuário podem ajustar o estilo sem mudar os dados das telas. Para publicar em um CMS, envie os PNGs à biblioteca de mídia e substitua `imagens/<arquivo>.png` pelos endereços retornados pelo site.
