import { useCallback, useState } from "react";
import {
  findOrCreateCustomer,
  SyncStatusBadge,
  useOnlineStatus,
  type PaymentMethod,
  type SessionUser,
  type SyncStatus,
} from "@kumbakonam/shared";
import { Sidebar } from "../components/Sidebar";
import { MenuGrid } from "../components/MenuGrid";
import { CategoryTabs } from "../components/CategoryTabs";
import { CartPanel } from "../components/CartPanel";
import { PrinterSetupModal } from "../components/PrinterSetupModal";
import { BillView } from "../components/BillView";
import { SplitPaymentModal } from "../components/SplitPaymentModal";
import { ExpenseModal } from "../components/ExpenseModal";
import { CreditCustomerModal } from "../components/CreditCustomerModal";
import { KhataModal } from "../components/KhataModal";
import { useMenu } from "../hooks/useMenu";
import { useMenuCategories } from "../hooks/useMenuCategories";
import { useCart } from "../hooks/useCart";
import { useOrderSubmit } from "../hooks/useOrderSubmit";
import { usePrinter } from "../hooks/usePrinter";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useOutstandingCustomers } from "../hooks/useOutstandingCustomers";
import type { BillInput } from "../printing/receipt";
import { renderReceiptCanvas } from "../printing/receiptCanvas";
import { buildRasterReceipt } from "../printing/escposRaster";
import "./WorkerHome.css";

export interface WorkerHomeProps {
  sessionUser: SessionUser;
  onLogout: () => void;
}

export function WorkerHome({ sessionUser, onLogout }: WorkerHomeProps) {
  const { items, loading, error: menuError } = useMenu();
  const { categories, activeCategory, setActiveCategory, cycleCategory, visibleItems } = useMenuCategories(items);
  const cart = useCart();
  const printer = usePrinter();
  const online = useOnlineStatus();
  const [printerSetupOpen, setPrinterSetupOpen] = useState(false);
  const [billToShow, setBillToShow] = useState<BillInput | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [khataOpen, setKhataOpen] = useState(false);
  const outstanding = useOutstandingCustomers();

  const handleOrderSaved = useCallback(
    async (bill: BillInput) => {
      if (printer.status === "ready") {
        try {
          const canvas = await renderReceiptCanvas(bill);
          if (await printer.print(buildRasterReceipt(canvas))) return;
        } catch (err) {
          console.error("Receipt rendering failed", err);
        }
      }
      // Printer missing, refusing, or the render failed — hand the worker the
      // on-screen bill, which is the same artwork.
      setBillToShow(bill);
    },
    [printer],
  );

  const orderSubmit = useOrderSubmit(cart, sessionUser.userId, sessionUser.name, handleOrderSaved);

  const syncStatus: SyncStatus = !online ? "offline" : orderSubmit.pendingCount > 0 ? "pending" : "online";

  const retryPrint = useCallback(async () => {
    if (!billToShow) return;
    const canvas = await renderReceiptCanvas(billToShow);
    if (await printer.print(buildRasterReceipt(canvas))) {
      setBillToShow(null);
    }
  }, [billToShow, printer]);

  const openPrinterSetup = useCallback(() => setPrinterSetupOpen(true), []);
  const openExpenses = useCallback(() => setExpensesOpen(true), []);
  const openKhata = useCallback(() => setKhataOpen(true), []);

  // Choosing Split is only half the decision — the amounts still have to be
  // entered, so the dialog opens straight away whether the method came from
  // the button or the S key.
  const selectPayment = useCallback(
    (method: PaymentMethod) => {
      cart.setPaymentMethod(method);
      if (method === "split") setSplitOpen(true);
      if (method === "credit") setCreditOpen(true);
    },
    [cart],
  );

  // A name typed for the first time becomes a customer record here, so the
  // same person is matched rather than duplicated on their next order.
  const chooseCreditCustomer = useCallback(
    async (choice: { customer?: { customerId: string; name: string }; name?: string }) => {
      if (choice.customer) {
        cart.setCreditCustomer({ customerId: choice.customer.customerId, name: choice.customer.name });
        setCreditOpen(false);
        return;
      }
      if (!choice.name) return;
      try {
        const { customerId } = await findOrCreateCustomer(choice.name);
        cart.setCreditCustomer({ customerId, name: choice.name.trim() });
        setCreditOpen(false);
      } catch (err) {
        // Looking up an existing customer needs the network. Rather than
        // invent a duplicate record offline, back out of credit entirely so
        // the worker picks a method that can't lose the debt.
        console.error("Could not open a credit account", err);
        setCreditOpen(false);
        cart.setPaymentMethod(null);
      }
    },
    [cart],
  );

  const cancelCredit = useCallback(() => {
    setCreditOpen(false);
    if (!cart.creditCustomer) cart.setPaymentMethod(null);
  }, [cart]);

  const cancelSplit = useCallback(() => {
    setSplitOpen(false);
    // Backing out of the amounts means no method was really chosen.
    cart.setPaymentMethod(null);
  }, [cart]);

  useKeyboardShortcuts({
    visibleItems,
    cart,
    orderSubmit,
    onSelectPayment: selectPayment,
    onCycleCategory: cycleCategory,
    onRequestClearCart: () => setConfirmingClear(true),
    onOpenPrinterSetup: openPrinterSetup,
    onOpenExpenses: openExpenses,
    onOpenKhata: openKhata,
  });

  return (
    <div className="worker-home" data-theme="dark">
      <Sidebar onOpenKhata={openKhata} onOpenExpenses={openExpenses} onOpenPrinterSetup={openPrinterSetup} onLogout={onLogout} />

      <div className="worker-home__menu">
        {/* Logo, category tabs, sync badge — one row. The app name, the
            signed-in worker and the shortcut crib came off entirely; the
            tabs moved up from the grid so the menu starts at the top of its
            own scroll area with nothing floating over the cards. The sync
            badge stays: it is the only place the counter learns an order
            hasn't reached the server yet. */}
        <div className="worker-home__menu-header">
          <img
            className="worker-home__logo"
            src="/logo.png"
            alt="Kumbakonam Cafe"
            width={120}
            height={108}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
          <SyncStatusBadge status={syncStatus} />
        </div>
        <MenuGrid
          visibleItems={visibleItems}
          totalItemCount={items.length}
          loading={loading}
          error={menuError}
          onAddItem={cart.addItem}
        />
      </div>

      <div className="worker-home__cart">
        <CartPanel
          cart={cart}
          orderSubmit={orderSubmit}
          confirmingClear={confirmingClear}
          onRequestClear={() => setConfirmingClear(true)}
          onCancelClear={() => setConfirmingClear(false)}
          onSelectPayment={selectPayment}
        />
      </div>

      {splitOpen && (
        <SplitPaymentModal
          total={cart.total}
          upiAmount={cart.splitUpiAmount}
          cashAmount={cart.splitCashAmount}
          onUpiAmountChange={cart.setSplitUpiAmount}
          onConfirm={() => setSplitOpen(false)}
          onCancel={cancelSplit}
        />
      )}

      {creditOpen && (
        <CreditCustomerModal
          total={cart.total}
          customers={outstanding.customers}
          loading={outstanding.loading}
          onChoose={chooseCreditCustomer}
          onCancel={cancelCredit}
        />
      )}

      {khataOpen && (
        <KhataModal
          customers={outstanding.customers}
          loading={outstanding.loading}
          workerId={sessionUser.userId}
          onClose={() => setKhataOpen(false)}
        />
      )}

      {expensesOpen && (
        <ExpenseModal workerId={sessionUser.userId} onClose={() => setExpensesOpen(false)} />
      )}

      {printerSetupOpen && (
        <PrinterSetupModal
          status={printer.status}
          error={printer.error}
          deviceName={printer.deviceName}
          onConnect={printer.connect}
          onClose={() => setPrinterSetupOpen(false)}
        />
      )}

      {billToShow && (
        <BillView
          bill={billToShow}
          canRetryPrint={printer.status === "ready"}
          onRetryPrint={retryPrint}
          onClose={() => setBillToShow(null)}
        />
      )}
    </div>
  );
}
