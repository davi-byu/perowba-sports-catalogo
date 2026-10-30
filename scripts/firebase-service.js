
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Auth e Storage passam a ser carregados sob demanda (import dinâmico),
// para as páginas públicas (catálogo, produto, carrinho) não baixarem
// SDKs que não utilizam — reduz o tempo de bloqueio da página.
let moduloAuth = null;
let auth = null;

async function carregarAuth() {
  if (!moduloAuth) {
    moduloAuth = await import(
      "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"
    );
    auth = moduloAuth.getAuth(app);
  }

  return moduloAuth;
}

let moduloStorage = null;
let storage = null;

async function carregarStorage() {
  if (!moduloStorage) {
    moduloStorage = await import(
      "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js"
    );
    storage = moduloStorage.getStorage(app);
  }

  return moduloStorage;
}

const firebaseConfig = window.FIREBASE_CONFIG;

if (!firebaseConfig) {
  throw new Error(
    "Configuração do Firebase não encontrada. Verifique scripts/firebase-config.js."
  );
}

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db = getFirestore(app);

function validarEmpresa(empresaId) {
  if (!empresaId || typeof empresaId !== "string") {
    throw new Error("Identificador da empresa inválido.");
  }

  return empresaId;
}

function validarProduto(produto) {
  if (!produto || typeof produto !== "object") {
    throw new Error("Dados do produto inválidos.");
  }

  if (!String(produto.nome || "").trim()) {
    throw new Error("Informe o nome do produto.");
  }

  if (!Number.isFinite(Number(produto.preco)) || Number(produto.preco) < 0) {
    throw new Error("Informe um preço válido.");
  }
}

function produtosRef(empresaId) {
  return collection(
    db,
    "empresas",
    validarEmpresa(empresaId),
    "produtos"
  );
}

function pedidosRef(empresaId) {
  return collection(
    db,
    "empresas",
    validarEmpresa(empresaId),
    "pedidos"
  );
}

export async function listarProdutos(empresaId) {
  const snapshot = await getDocs(produtosRef(empresaId));

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function buscarProduto(empresaId, produtoId) {
  const referencia = doc(produtosRef(empresaId), produtoId);
  const snapshot = await getDoc(referencia);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function salvarProduto(
  empresaId,
  produto,
  produtoId = null
) {
  validarProduto(produto);

  const dados = {
    ...produto,
    nome: String(produto.nome).trim(),
    preco: Number(produto.preco),
    ativo: produto.ativo !== false,
    atualizadoEm: serverTimestamp()
  };

  delete dados.id;

  if (produtoId) {
    await setDoc(
      doc(produtosRef(empresaId), produtoId),
      dados,
      { merge: true }
    );

    return produtoId;
  }

  const novoProduto = await addDoc(produtosRef(empresaId), {
    ...dados,
    criadoEm: serverTimestamp()
  });

  return novoProduto.id;
}

export async function excluirProduto(empresaId, produtoId) {
  await deleteDoc(doc(produtosRef(empresaId), produtoId));
}

// Converte imagens JPG/PNG para WebP no navegador antes do envio,
// reduzindo o tamanho dos arquivos e acelerando o carregamento do site.
const FORMATOS_CONVERTER_WEBP = ["image/jpeg", "image/png"];
const QUALIDADE_WEBP = 0.82;

async function converterParaWebp(arquivo) {
  if (
    !FORMATOS_CONVERTER_WEBP.includes(arquivo.type) ||
    typeof createImageBitmap !== "function"
  ) {
    return arquivo;
  }

  try {
    const bitmap = await createImageBitmap(arquivo, {
      imageOrientation: "from-image"
    });

    let convertido = null;

    if (typeof OffscreenCanvas === "function") {
      const tela = new OffscreenCanvas(bitmap.width, bitmap.height);
      tela.getContext("2d").drawImage(bitmap, 0, 0);
      bitmap.close();
      convertido = await tela.convertToBlob({
        type: "image/webp",
        quality: QUALIDADE_WEBP
      });
    } else if (typeof document !== "undefined") {
      const tela = document.createElement("canvas");
      tela.width = bitmap.width;
      tela.height = bitmap.height;
      tela.getContext("2d").drawImage(bitmap, 0, 0);
      bitmap.close();
      convertido = await new Promise(resolucao =>
        tela.toBlob(resolucao, "image/webp", QUALIDADE_WEBP)
      );
    } else {
      bitmap.close();
      return arquivo;
    }

    if (!convertido || convertido.size <= 0) {
      return arquivo;
    }

    const nomeWebp = arquivo.name.replace(/\.[^.]+$/, "") + ".webp";

    return new File([convertido], nomeWebp, { type: "image/webp" });
  } catch (erro) {
    console.warn(
      "Não foi possível converter para WebP; enviando o arquivo original.",
      erro
    );
    return arquivo;
  }
}

export async function enviarImagemProduto(
  arquivo,
  empresaId = "perowba-sports"
) {
  if (!(arquivo instanceof File)) {
    throw new Error("Arquivo de imagem inválido.");
  }

  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }

  if (arquivo.size >= 5 * 1024 * 1024) {
    throw new Error("Cada imagem deve ter menos de 5 MB.");
  }

  const arquivoFinal = await converterParaWebp(arquivo);

  const nomeSeguro = arquivoFinal.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");

  const caminho =
    `produtos/${validarEmpresa(empresaId)}/` +
    `${Date.now()}-${crypto.randomUUID()}-${nomeSeguro}`;

  const { ref, uploadBytes, getDownloadURL } = await carregarStorage();

  const referencia = ref(storage, caminho);

  await uploadBytes(referencia, arquivoFinal, {
    contentType: arquivoFinal.type
  });

  const url = await getDownloadURL(referencia);

  return {
    url,
    caminho
  };
}

export async function excluirImagemProduto(caminho) {
  if (!caminho || typeof caminho !== "string") {
    return;
  }

  const { ref, deleteObject } = await carregarStorage();

  await deleteObject(ref(storage, caminho));
}

export async function atualizarEstoque(
  empresaId,
  produtoId,
  novoEstoque
) {
  const quantidade = Number(novoEstoque);

  if (!Number.isFinite(quantidade) || quantidade < 0) {
    throw new Error(
      "O estoque deve ser igual ou maior que zero."
    );
  }

  await updateDoc(
    doc(produtosRef(empresaId), produtoId),
    {
      estoque: quantidade,
      atualizadoEm: serverTimestamp()
    }
  );
}

export async function listarPedidos(empresaId) {
  const referencia = query(
    pedidosRef(empresaId),
    orderBy("criadoEm", "desc")
  );

  const snapshot = await getDocs(referencia);

  return snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

export async function registrarPedido(empresaId, pedido) {
  if (
    !pedido ||
    !Array.isArray(pedido.itens) ||
    pedido.itens.length === 0
  ) {
    throw new Error("O pedido precisa ter pelo menos um item.");
  }

  return addDoc(pedidosRef(empresaId), {
    ...pedido,
    status: "recebido",
    criadoEm: serverTimestamp()
  });
}

export async function entrarAdmin(email, senha) {
  const { signInWithEmailAndPassword } = await carregarAuth();

  const resultado = await signInWithEmailAndPassword(
    auth,
    email,
    senha
  );

  return resultado.user;
}

export async function sairAdmin() {
  const { signOut } = await carregarAuth();

  await signOut(auth);
}

export async function observarAutenticacao(callback) {
  const { onAuthStateChanged } = await carregarAuth();

  return onAuthStateChanged(auth, callback);
}
