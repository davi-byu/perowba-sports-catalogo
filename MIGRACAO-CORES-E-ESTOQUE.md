# Migração de produtos por cor e tamanho

## Regra de cadastro desejada
- Cada documento de produto representa uma única cor.
- As variações dentro do produto representam somente tamanhos.
- Cada produto/cor terá SKU próprio e único.
- O estoque deve permanecer discriminado por tamanho.

## Antes de migrar
1. Publique/execute esta versão somente em ambiente controlado.
2. Entre no painel administrativo com a conta autorizada.
3. Aguarde a lista de produtos carregar.
4. Clique em **Exportar produtos para migração (JSON)**.
5. Guarde o JSON como backup e envie-o para análise antes de executar qualquer migração.

## Importante sobre produtos antigos
Se o documento antigo tiver estoque por tamanho, mas apenas uma lista `cores` no produto, o banco não informa quanto daquele estoque pertence a cada cor. Não é seguro dividir esse número automaticamente. Esses produtos precisarão de uma distribuição confirmada manualmente.

Se o documento antigo já tiver `cor` em cada variação, a migração poderá agrupar por cor e tamanho preservando as quantidades registradas.

Esta versão não altera nem divide automaticamente os produtos existentes. O botão de exportação é somente leitura e serve para preparar uma migração auditável.
