import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacter } from '../hooks/useCharacter';
import { subscribeToInventory } from '../firebase/inventory';
import { subscribeToBank, depositItem, withdrawItem, buyBankSlot } from '../firebase/bank';
import { nextBankSlotCost, MAX_BANK_SLOTS } from '../gameData/bank';
import { ITEMS } from '../gameData/items';
import type { Inventory } from '../types/character';

function sortedEntries(inv: Inventory) {
  return Object.entries(inv.items)
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => (ITEMS[a]?.name ?? a).localeCompare(ITEMS[b]?.name ?? b));
}

export function BankScreen() {
  const { user } = useAuth();
  const { character, refetch } = useCharacter();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [bank, setBank] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubInv = subscribeToInventory(user.uid, setInventory);
    const unsubBank = subscribeToBank(user.uid, setBank);
    return () => {
      unsubInv();
      unsubBank();
    };
  }, [user]);

  if (!inventory || !bank || !character) return null;

  async function handleDeposit(itemId: string, quantity: number) {
    if (!user) return;
    setError(null);
    const result = await depositItem(user.uid, itemId, quantity);
    if (!result.success) setError(result.reason ?? 'Could not deposit that.');
  }

  async function handleWithdraw(itemId: string, quantity: number) {
    if (!user) return;
    setError(null);
    const result = await withdrawItem(user.uid, itemId, quantity);
    if (!result.success) setError(result.reason ?? 'Could not withdraw that.');
  }

  async function handleBuySlot() {
    if (!user) return;
    setError(null);
    setBuying(true);
    try {
      const result = await buyBankSlot(user.uid);
      if (!result.success) setError(result.reason ?? 'Could not buy a bank slot.');
      await refetch();
    } finally {
      setBuying(false);
    }
  }

  const distinctBankCount = Object.values(bank.items).filter((q) => q > 0).length;
  const atMaxSlots = character.bankSlots >= MAX_BANK_SLOTS;
  const cost = nextBankSlotCost(character.bankSlots);
  const canAfford = character.gold >= cost;

  return (
    <div className="bank-screen">
      <h2>Bank</h2>
      <p>
        <small>
          {distinctBankCount} / {character.bankSlots} bank slots used
        </small>
        <button onClick={handleBuySlot} disabled={buying || atMaxSlots || !canAfford} style={{ marginLeft: 8 }}>
          {atMaxSlots ? 'Max slots' : buying ? 'Buying…' : `Buy slot (${cost} gold)`}
        </button>
      </p>
      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h3>Inventory</h3>
          {sortedEntries(inventory).length === 0 ? (
            <p>Nothing to deposit.</p>
          ) : (
            <ul>
              {sortedEntries(inventory).map(([itemId, quantity]) => (
                <li key={itemId}>
                  {ITEMS[itemId]?.name ?? itemId}: {quantity}
                  <button onClick={() => handleDeposit(itemId, quantity)}>Deposit all</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <h3>Bank</h3>
          {sortedEntries(bank).length === 0 ? (
            <p>Empty so far.</p>
          ) : (
            <ul>
              {sortedEntries(bank).map(([itemId, quantity]) => (
                <li key={itemId}>
                  {ITEMS[itemId]?.name ?? itemId}: {quantity}
                  <button onClick={() => handleWithdraw(itemId, quantity)}>Withdraw all</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
