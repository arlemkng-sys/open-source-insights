import { useCallback, useEffect, useState } from "react";
import {
  ACCOUNT_EVENT,
  AUTH_EVENT,
  getAccount,
  getSession,
  type Account,
  type JumpUser,
} from "@/lib/jump/store";

export function useSession() {
  const [user, setUser] = useState<JumpUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getSession());
    sync();
    setReady(true);
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { user, ready };
}

export function useAccount(userId: string | undefined) {
  const [account, setAccount] = useState<Account | null>(null);

  const refresh = useCallback(() => {
    setAccount(userId ? getAccount(userId) : null);
  }, [userId]);

  useEffect(() => {
    refresh();
    window.addEventListener(ACCOUNT_EVENT, refresh);
    return () => window.removeEventListener(ACCOUNT_EVENT, refresh);
  }, [refresh]);

  return { account, refresh };
}
