
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

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

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
export const auth = getAuth(app);
export const storage = getStorage(app);

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

  const nomeSeguro = arquivo.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");

  const caminho =
    `produtos/${validarEmpresa(empresaId)}/` +
    `${Date.now()}-${crypto.randomUUID()}-${nomeSeguro}`;

  const referencia = ref(storage, caminho);

  await uploadBytes(referencia, arquivo, {
    contentType: arquivo.type
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
  const resultado = await signInWithEmailAndPassword(
    auth,
    email,
    senha
  );

  return resultado.user;
}

export async function sairAdmin() {
  await signOut(auth);
}

export function observarAutenticacao(callback) {
  return onAuthStateChanged(auth, callback);
}
