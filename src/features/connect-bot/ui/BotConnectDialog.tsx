import type { FormEventHandler } from 'react';
import { ArrowLeft, Check, KeyRound, LoaderCircle, LogOut } from 'lucide-react';
import type { GreenApiInstance } from '../../../entities/telegram/model/types';

type BotConnectDialogProps = {
  profile: GreenApiInstance | null;
  onConnect: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
};

export function BotConnectDialog({ profile, onConnect, onClose, onDisconnect, isConnecting }: BotConnectDialogProps) {
  return (
    <div className="overlay" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div className="modal-icon"><KeyRound size={21} /></div>
          <div><h2 id="settings-title">Подключение GREEN-API</h2><p>Реквизиты используются только в текущей сессии.</p></div>
        </div>
        {profile && <div className="connected-bot"><span className="avatar">G</span><span><strong>Инстанс {profile.idInstance}</strong><small>{profile.wid || profile.typeInstance || 'Telegram API'}</small></span><Check size={19} /></div>}
        <form onSubmit={onConnect}>
          <label htmlFor="api-url">apiUrl</label>
          <input id="api-url" name="apiUrl" type="url" placeholder="https://4100.api.green-api.com" autoComplete="off" required />
          <label htmlFor="id-instance">idInstance</label>
          <input id="id-instance" name="idInstance" inputMode="numeric" placeholder="1100000000" autoComplete="off" autoFocus required />
          <label htmlFor="api-token-instance">apiTokenInstance</label>
          <input id="api-token-instance" name="apiTokenInstance" type="password" placeholder="Ключ доступа инстанса" autoComplete="off" required />
          <p className="field-hint">Скопируйте три значения из личного кабинета GREEN-API. Они не сохраняются в браузере.</p>
          <button className="primary-button full" type="submit" disabled={isConnecting}>{isConnecting ? <><LoaderCircle className="spin" size={18} /> Проверяем</> : <><KeyRound size={18} /> Подключить инстанс</>}</button>
        </form>
        {profile && <button className="danger-link" type="button" onClick={onDisconnect}><LogOut size={17} /> Отключить инстанс</button>}
        {profile && <button className="close-link" type="button" onClick={onClose}><ArrowLeft size={17} /> Вернуться к чату</button>}
      </section>
    </div>
  );
}
