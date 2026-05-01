import { EXCHANGE_RATES } from "../constants";
import type { CurrencyCode } from "../types";

interface CurrencyToolProps {
  thbAmount: string;
  targetCurrency: CurrencyCode;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: CurrencyCode) => void;
}

export default function CurrencyTool({
  thbAmount,
  targetCurrency,
  onAmountChange,
  onCurrencyChange,
}: CurrencyToolProps) {
  return (
    // content ของ tab currency
    // component นี้รับค่าและ callback จาก parent ทั้งหมดเพื่อไม่สร้าง state ซ้ำ
    <div className="animate-in slide-in-from-bottom-4 fade-in space-y-4 duration-300">
      <div className="mb-2 text-center text-xs text-gray-400">
        Or enter THB manually if scan fails
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">฿</span>
          <input
            type="number"
            placeholder="Enter Baht"
            value={thbAmount}
            onChange={(event) => onAmountChange(event.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pl-10 pr-4 text-white outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={targetCurrency}
          onChange={(event) => onCurrencyChange(event.target.value as CurrencyCode)}
          className="min-w-[80px] appearance-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-center text-white outline-none focus:border-indigo-500"
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="JPY">JPY</option>
        </select>
      </div>

      {thbAmount && (
        // แสดงผลลัพธ์ conversion เมื่อมีจำนวนเงินบาทแล้วเท่านั้น
        <div className="mt-4 flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-600/20 p-4 text-white">
          <div>
            <p className="text-xs text-indigo-300">Approximate Value</p>
            <p className="text-2xl font-bold">
              {(Number(thbAmount) * EXCHANGE_RATES[targetCurrency]).toFixed(2)}{" "}
              {targetCurrency}
            </p>
          </div>
          <div className="text-right text-xs text-gray-400">
            1 THB = {EXCHANGE_RATES[targetCurrency]} {targetCurrency}
          </div>
        </div>
      )}
    </div>
  );
}
