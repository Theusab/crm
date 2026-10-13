"use client";

import { useActionState } from "react";
import {
  deleteKnowledgeDocument,
  uploadKnowledgeDocument,
  type KnowledgeActionState,
} from "@/features/knowledge/actions";

type KnowledgeDocument = {
  id: string;
  title: string;
  file_name: string;
  content_type: string;
  chunk_count: number;
  created_at: string;
};

export function DocumentManager({ documents }: { documents: KnowledgeDocument[] }) {
  const [state, action, pending] = useActionState<KnowledgeActionState, FormData>(uploadKnowledgeDocument, {});

  return <>
    <form action={action} className="crm-form crm-knowledge-upload">
      <label htmlFor="knowledge-file">Documento da empresa</label>
      <input id="knowledge-file" name="file" type="file" accept=".pdf,.txt,application/pdf,text/plain" required />
      <p className="crm-note">PDF ou TXT, até 8 MB. O sistema extrai o texto e cria uma indexação semântica; o arquivo original não é armazenado.</p>
      {state.error && <p className="crm-error" role="alert">{state.error}</p>}
      {state.success && <p className="crm-success" role="status">{state.success}</p>}
      <button className="button button-primary" disabled={pending}>{pending ? "Indexando documento..." : "Enviar e indexar"}</button>
    </form>
    {!documents.length ? <div className="crm-empty"><strong>A base ainda está vazia</strong><span>Envie materiais da empresa para a IA consultar antes de responder.</span></div> : <div className="crm-table-wrap"><table className="crm-table">
      <thead><tr><th>DOCUMENTO</th><th>TRECHOS</th><th>ADICIONADO EM</th><th aria-label="Ações" /></tr></thead>
      <tbody>{documents.map((document) => <tr key={document.id}>
        <td><strong>{document.title}</strong><small className="crm-knowledge-filename">{document.file_name}</small></td>
        <td>{document.chunk_count}</td>
        <td>{new Date(document.created_at).toLocaleDateString("pt-BR")}</td>
        <td><form action={deleteKnowledgeDocument}><input type="hidden" name="id" value={document.id} /><button className="button button-secondary crm-knowledge-delete">Remover</button></form></td>
      </tr>)}</tbody>
    </table></div>}
  </>;
}
