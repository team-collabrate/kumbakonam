import { useCallback, useState } from "react";
import { SyncStatusBadge, useOnlineStatus, type SessionUser, type SyncStatus } from "@kumbakonam/shared";
import { Sidebar } from "../components/Sidebar";
import { MenuGrid } from "../components/MenuGrid";
import { CartPanel } from "../components/CartPanel";
import { PrinterSetupModal } from "../components/PrinterSetupModal";
import { BillView } from "../components/BillView";
import { useMenu } from "../hooks/useMenu";
import { useCart } from "../hooks/useCart";
import { useOrderSubmit } from "../hooks/useOrderSubmit";
import { usePrinter } from "../hooks/usePrinter";
import { buildBillBytes, type BillInput } from "../printing/escpos";
import "./WorkerHome.css";

export interface WorkerHomeProps {
  sessionUser: SessionUser;
  onLogout: () => void;
}

export function WorkerHome({ sessionUser, onLogout }: WorkerHomeProps) {
  const { items, loading, error: menuError } = useMenu();
  const cart = useCart();
  const printer = usePrinter();
  const online = useOnlineStatus();
  const [printerSetupOpen, setPrinterSetupOpen] = useState(false);
  const [billToShow, setBillToShow] = useState<BillInput | null>(null);

  const handleOrderSaved = useCallback(
    async (bill: BillInput) => {
      if (printer.status !== "ready" || !(await printer.print(buildBillBytes(bill)))) {
        setBillToShow(bill);
      }
    },
    [printer],
  );

  const orderSubmit = useOrderSubmit(cart, sessionUser.userId, sessionUser.name, handleOrderSaved);

  const syncStatus: SyncStatus = !online ? "offline" : orderSubmit.pendingCount > 0 ? "pending" : "online";

  const retryPrint = useCallback(async () => {
    if (!billToShow) return;
    if (await printer.print(buildBillBytes(billToShow))) {
      setBillToShow(null);
    }
  }, [billToShow, printer]);

  return (
    <div className="worker-home" data-theme="dark">
      <Sidebar onOpenPrinterSetup={() => setPrinterSetupOpen(true)} onLogout={onLogout} />

      <div className="worker-home__menu">
        <div className="worker-home__menu-header">
          <div>
            <p className="worker-home__eyebrow">Kumbakonam POS</p>
            <h1 className="worker-home__title">{sessionUser.name}</h1>
          </div>
          <SyncStatusBadge status={syncStatus} />
        </div>
        <MenuGrid items={items} loading={loading} error={menuError} onAddItem={cart.addItem} />
      </div>

      <div className="worker-home__cart">
        <CartPanel cart={cart} orderSubmit={orderSubmit} />
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
