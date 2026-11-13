# Configuração de segurança — Perowba Sports

## O que esta configuração faz
- Mantém a leitura pública dos produtos da empresa `perowba-sports` para o catálogo.
- Restringe cadastro e alterações administrativas ao UID administrador já usado pelo painel.
- Em produtos sincronizados pelo Perowba Gestão (`origemGestao`), permite ao painel alterar somente fotos, descrição, condição e destaque. SKU, preço, cor, tamanhos e estoque ficam protegidos.
- Impede excluir pelo painel produtos que são controlados pelo Gestão.
- Bloqueia caminhos não declarados.

## Antes de publicar
1. Faça backup/exportação dos produtos e das regras atuais.
2. Confirme que o UID administrador no Firebase Authentication é o mesmo usado pelo painel.
3. Teste primeiro em projeto de homologação, se disponível.
4. Publique somente as regras do Firestore deste projeto; não use este `firebase.json` para publicar Hosting.

## Publicação isolada das regras
Com o Firebase CLI instalado e o projeto `perowba-sports` selecionado:

```bash
firebase use perowba-sports
firebase deploy --only firestore:rules
```

Não publique antes de validar cadastro, edição de fotos/descrição e exclusão de produto não vinculado.

## Integração com o Gestão
O backend do Gestão usa Admin SDK para escrever no Firestore do Sports. Essas escritas não dependem das regras do cliente. A credencial do projeto Sports deve ser armazenada como Secret Manager secret no projeto do Gestão; nunca coloque chave JSON no site ou no repositório.
