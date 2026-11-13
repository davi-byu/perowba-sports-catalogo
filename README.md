# Perowba Sports — Catálogo de Vendas

Catálogo responsivo de material esportivo com:
- busca e filtros;
- página de produto;
- carrinho persistente;
- pedido direto pelo WhatsApp;
- formulário de contato;
- área administrativa inicial;
- estrutura preparada para integração futura com Firebase.

## Antes de publicar

1. Abra `scripts/config.js`.
2. Altere `WHATSAPP_NUMBER` para o número comercial no formato internacional, sem `+`, espaços ou símbolos.
3. Substitua os SVGs em `imagens/` pelas fotos reais dos produtos.
4. Se desejar Firebase, configure `scripts/firebase-config.js` e conecte o serviço de produtos/pedidos.
5. Publique em GitHub Pages, Firebase Hosting ou outro serviço.

## Estrutura

- `index.html` — página inicial
- `catalogo.html` — catálogo e filtros
- `produto.html` — detalhes do produto
- `carrinho.html` — carrinho e envio ao WhatsApp
- `contato.html` — contato
- `admin.html` — painel administrativo inicial
- `dados/produtos.json` — produtos de demonstração
- `estilos/` — CSS
- `scripts/` — JavaScript
- `imagens/` — logo e imagens dos produtos


## Padrão de cadastro e integração de estoque

- Cada produto possui um único SKU e uma única cor.
- As variações do produto são somente tamanhos, cada um com seu próprio estoque.
- Para cadastrar outra cor do mesmo modelo, crie outro produto com SKU diferente.
- O vínculo com o Perowba Gestão utiliza o SKU do produto combinado com o tamanho da variação.
- SKUs devem ser únicos dentro do catálogo.

Produtos antigos que possuíam várias cores dentro do mesmo cadastro precisam ser separados em produtos distintos antes de ativar a sincronização. Não faça essa conversão automaticamente sem conferir e distribuir os estoques de cada cor.
