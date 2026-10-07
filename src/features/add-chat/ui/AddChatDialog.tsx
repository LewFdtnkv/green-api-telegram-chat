import type { FormEventHandler } from 'react';
import { Plus, UserRound } from 'lucide-react';

type AddChatDialogProps = {
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
};

export function AddChatDialog({ onSubmit, onClose }: AddChatDialogProps) {
  return (
    <div className="overlay">
      <section className="modal compact" role="dialog" aria-modal="true" aria-labelledby="chat-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="modal-heading"><div className="modal-icon"><UserRound size={21} /></div><div><h2 id="chat-title">Добавить чат</h2><p>Укажите Chat ID получателя.</p></div></div>
        <form onSubmit={onSubmit}>
          <label htmlFor="chat-id">Chat ID</label>
          <input id="chat-id" name="chatId" placeholder="Например, 123456789" autoFocus />
          <p className="field-hint">Получатель должен сначала написать вашему боту.</p>
          <button className="primary-button full" type="submit"><Plus size={18} /> Открыть чат</button>
        </form>
      </section>
    </div>
  );
}
