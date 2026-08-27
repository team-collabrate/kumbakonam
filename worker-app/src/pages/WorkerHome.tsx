import { useCallback, useState } from "react";
import { SyncStatusBadge, useLanguage, useOnlineStatus, type SessionUser, type SyncStatus } from "@kumbakonam/shared";
import { Sidebar } from "../components/Sidebar";
import { MenuGrid } from "../components/MenuGrid";
import { CartPanel } from "../components/CartPanel";
import { PrinterSetupModal } from "../components/PrinterSetupModal";
import { BillView } from "../components/BillView";
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

const SHORTCUTS_HINT = {
  en: "⌨ 1–9, 0 add item · ←→ category · C/U/K payment · ↵ print bill · ⌫ clear cart · P printer · L language",
  ta: "⌨ 1–9, 0 பொருள் சேர் · ←→ பிரிவு · C/U/K பணம் செலுத்தும் முறை · ↵ பில் அச்சிடு · ⌫ கார்ட் காலி · P பிரிண்டர் · L மொழி",
};

export interface WorkerHomeProps {
  sessionUser: SessionUser;
  onLogout: () => void;
}

export function WorkerHome({ sessionUser, onLogout }: WorkerHomeProps) {
  const { language } = useLanguage();
  const { items, loading, error: menuError } = useMenu();
  const { categories, activeCategory, setActiveCategory, cycleCategory, visibleItems } = useMenuCategories(items);
  const cart = useCart();
  const printer = usePrinter();
  const online = useOnlineStatus();
  const [printerSetupOpen, setPrinterSetupOpen] = useState(false);
  const [billToShow, setBillToShow] = useState<BillInput | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

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

  useKeyboardShortcuts({
    visibleItems,
    cart,
    orderSubmit,
    onCycleCategory: cycleCategory,
    onRequestClearCart: () => setConfirmingClear(true),
    onOpenPrinterSetup: openPrinterSetup,
  });

  return (
    <div className="worker-home" data-theme="dark">
      <Sidebar onOpenPrinterSetup={openPrinterSetup} onLogout={onLogout} />

      <div className="worker-home__menu">
        <div className="worker-home__menu-header">
          <div>
            <p className="worker-home__eyebrow">Kumbakonam POS</p>
            <h1 className="worker-home__title">{sessionUser.name}</h1>
          </div>
          <SyncStatusBadge status={syncStatus} />
        </div>
        <p className="worker-home__shortcuts-hint">{SHORTCUTS_HINT[language]}</p>
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
        />
      </div>

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
