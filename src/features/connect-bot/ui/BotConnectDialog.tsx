import type { FormEventHandler } from 'react';
import { ArrowLeft, Bot, Check, KeyRound, LoaderCircle, LogOut } from 'lucide-react';
import type { TelegramBot } from '../../../entities/telegram/model/types';

type BotConnectDialogProps = {
  profile: TelegramBot | null;
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
          <div><h2 id="settings-title">Подключение бота</h2><p>Токен используется только в текущей сессии.</p></div>
        </div>
        {profile && <div className="connected-bot"><span className="avatar">{profile.first_name.slice(0, 1) || 'B'}</span><span><strong>{profile.first_name}</strong><small>@{profile.username}</small></span><Check size={19} /></div>}
        <form onSubmit={onConnect}>
          <label htmlFor="bot-token">Токен Telegram Bot API</label>
          <input id="bot-token" name="token" type="password" placeholder="123456789:AA..." autoComplete="off" autoFocus />
          <p className="field-hint">Создайте бота через @BotFather и вставьте его токен сюда.</p>
          <button className="primary-button full" type="submit" disabled={isConnecting}>{isConnecting ? <><LoaderCircle className="spin" size={18} /> Проверяем</> : <><Bot size={18} /> Подключить</>}</button>
        </form>
        {profile && <button className="danger-link" type="button" onClick={onDisconnect}><LogOut size={17} /> Отключить бота</button>}
        {profile && <button className="close-link" type="button" onClick={onClose}><ArrowLeft size={17} /> Вернуться к чату</button>}
      </section>
    </div>
  );
}
