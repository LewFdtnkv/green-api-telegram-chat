const TOKEN_KEY = 'telegram-inbox-token';

export const tokenSession = {
  get: (): string => sessionStorage.getItem(TOKEN_KEY) || '',
  set: (token: string): void => sessionStorage.setItem(TOKEN_KEY, token),
  clear: (): void => sessionStorage.removeItem(TOKEN_KEY)
};
