import { getAuth } from '../lib/services';
import { HeaderNav } from './HeaderNav';

export async function Header() {
  const user = await getAuth().getCurrentUser().catch(() => undefined);

  return (
    <header className="border-b border-line bg-cream">
      <HeaderNav isLoggedIn={Boolean(user)} />
    </header>
  );
}
