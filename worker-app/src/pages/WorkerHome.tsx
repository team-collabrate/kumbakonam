import { useCallback, useState } from "react";
import {
  SyncStatusBadge,
  useOnlineStatus,
  type PaymentMethod,
  type SessionUser,
  type SyncStatus,
} from "@kumbakonam/shared";
import { Sidebar } from "../components/Sidebar";
import { MenuGrid } from "../components/MenuGrid";
import { CartPanel } from "../components/CartPanel";
import { PrinterSetupModal } from "../components/PrinterSetupModal";
import { BillView } from "../components/BillView";
import { SplitPaymentModal } from "../components/SplitPaymentModal";
import { useMenu } from "../hooks/useMenu";
import { useMenuCategories } from "../hooks/useMenuCategories";
import { useCart } from "../hooks/useCart";
import { useOrderSubmit } from "../hooks/useOrderSubmit";
import { usePrinter } from "../hooks/usePrinter";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
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

  // Choosing Split is only half the decision — the amounts still have to be
  // entered, so the dialog opens straight away whether the method came from
  // the button or the S key.
  const selectPayment = useCallback(
    (method: PaymentMethod) => {
      cart.setPaymentMethod(method);
      if (method === "split") setSplitOpen(true);
    },
    [cart],
  );

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
  });

  return (
    <div className="worker-home" data-theme="dark">
      <Sidebar onOpenPrinterSetup={openPrinterSetup} onLogout={onLogout} />

      <div className="worker-home__menu">
        {/* Logo only. The app name, the signed-in worker and the shortcut
            crib all came off — staff know where they work and which keys
            they use, and the row they occupied is worth more as menu. The
            sync badge stays: it is the only place the counter learns an
            order hasn't reached the server yet. */}
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
          <SyncStatusBadge status={syncStatus} />
        </div>
        <MenuGrid
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
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
