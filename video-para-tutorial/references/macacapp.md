# Importação como Passo a passo no macacapp

O editor do macacapp usa `kind: "STEPPED"` e salva `content.steps`, com um `id`, um `title` e um documento TipTap em `content` para cada passo. Um artigo com títulos numerados importado como `DOCUMENT` continua sendo um único documento; a numeração não cria passos separados.

## Pacote gerado

O helper produz `tutorial.json` e `passos/NN-etapa.html`, além dos PNGs, texto editável e prévia HTML. O manifesto usa este contrato:

```json
{
  "format": "macacapp-tutorial",
  "version": 1,
  "kind": "STEPPED",
  "title": "Título do procedimento",
  "summary": "Resumo do que o leitor vai realizar",
  "steps": [
    {
      "title": "Abra a função",
      "contentFile": "passos/01-etapa.html"
    },
    {
      "title": "Confira o resultado",
      "contentFile": "passos/02-etapa.html"
    }
  ]
}
```

- A ordem de `steps` define a ordem dos passos. O título geral e o de cada passo têm até 200 caracteres; o resumo tem até 500. O contrato aceita de 1 a 100 passos por pacote, sem impor uma quantidade editorial fixa.
- `contentFile` é relativo à pasta de `tutorial.json`, mesmo quando o ZIP contém uma pasta raiz. Cada caminho aponta para um arquivo próprio. Não use caminhos absolutos, `..`, URLs ou arquivos repetidos entre passos.
- As imagens são relativas a cada HTML. Em `passos/01-etapa.html`, use `../imagens/01-etapa.png`. O título do passo fica no manifesto; o HTML contém instruções, imagem, texto alternativo e legenda, sem repetir o título.
- O resumo usa a introdução. Para preservar o contexto completo no formato existente do editor, a introdução e as observações aparecem também no primeiro passo; a conclusão aparece no último. Não crie passos extras só para introdução ou conclusão.
- O importador converte cada HTML para um documento TipTap independente e troca as referências locais pelas imagens armazenadas no sistema. Os IDs dos passos são gerados pelo importador. Nenhum dado de autoria ou publicação do pacote controla o post.

## Uso no site

Use **Importar ZIP**, mantenha a fonte **Passo a passo** (`tutorial.json`) e confira a quantidade de etapas detectada. Crie o rascunho e revise os títulos, conteúdos e imagens no editor de passos antes de publicar. A escolha explícita de um HTML, Markdown ou TXT completo importa um documento único.

A habilidade gera os arquivos; importar ou publicar no sistema exige solicitação do usuário. Não execute a importação em produção como parte da validação do pacote. Para testar alterações no gerador, use fixtures ou armazenamento temporário.
