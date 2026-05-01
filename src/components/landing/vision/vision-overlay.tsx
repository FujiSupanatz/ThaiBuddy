"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import VisionControls from "./vision-controls";
import VisionHeader from "./vision-header";
import VisionViewfinder from "./vision-viewfinder";
import type {
  CurrencyCode,
  OCRGeneralResult,
  OCRMenuResult,
  OCRMode,
  ViewMode,
  VisionTab,
} from "../types";

interface VisionOverlayProps {
  view: ViewMode;
  visionTab: VisionTab;
  thbAmount: string;
  targetCurrency: CurrencyCode;
  isScanning: boolean;
  onClose: () => void;
  onVisionTabChange: (tab: VisionTab) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: CurrencyCode) => void;
}

function getVisionErrorMessage(errorText: string) {
  const normalized = errorText.toLowerCase();

  if (normalized.includes("network")) {
    return "Network error while contacting the OCR service.";
  }

  if (normalized.includes("api key")) {
    return "OCR backend configuration error: API key is missing or invalid.";
  }

  return "Unable to process this image right now.";
}

export default function VisionOverlay({
  view,
  visionTab,
  thbAmount,
  targetCurrency,
  isScanning,
  onClose,
  onVisionTabChange,
  onAmountChange,
  onCurrencyChange,
}: VisionOverlayProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrMode, setOCRMode] = useState<OCRMode>("general");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrError, setOCRError] = useState<string | null>(null);
  const [generalResult, setGeneralResult] = useState<OCRGeneralResult | null>(null);
  const [menuResult, setMenuResult] = useState<OCRMenuResult | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const hasVisionResults = Boolean(
    generalResult || (menuResult && menuResult.items.length >= 0),
  );
  const compactResults = visionTab === "signage" && hasVisionResults;

  const previewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    let ignore = false;

    const fetchExchangeRate = async () => {
      setIsRateLoading(true);
      setRateError(null);

      try {
        const response = await fetch(
          `/api/v1/vision/exchange-rate?from_currency=THB&to_currency=${targetCurrency}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          rate?: number;
          detail?: string;
          error?: string;
        };

        if (!response.ok || typeof payload.rate !== "number") {
          throw new Error(payload.detail || payload.error || "invalid exchange rate response");
        }

        if (!ignore) {
          setExchangeRate(payload.rate);
        }
      } catch (error) {
        if (!ignore) {
          setExchangeRate(null);
          setRateError(
            error instanceof Error
              ? getVisionErrorMessage(error.message)
              : "Unable to load the exchange rate.",
          );
        }
      } finally {
        if (!ignore) {
          setIsRateLoading(false);
        }
      }
    };

    void fetchExchangeRate();

    return () => {
      ignore = true;
    };
  }, [targetCurrency]);

  const handleImageSelected = (file: File | null) => {
    setSelectedImage(file);
    setOCRError(null);
    setGeneralResult(null);
    setMenuResult(null);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleImageSelected(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleRunOCR = async () => {
    if (!selectedImage) {
      setOCRError("Choose an image first.");
      return;
    }

    setIsProcessingOCR(true);
    setOCRError(null);
    setGeneralResult(null);
    setMenuResult(null);

    const formData = new FormData();
    formData.append("file", selectedImage);
    formData.append("scale", "2.0");
    formData.append("denoise", "true");
    formData.append("threshold", "false");

    const endpoint =
      ocrMode === "general" ? "/api/v1/vision/general" : "/api/v1/vision/menu";

    if (ocrMode === "menu") {
      formData.append("currency", targetCurrency);
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | OCRGeneralResult
        | OCRMenuResult
        | { detail?: string; error?: string };

      if (!response.ok) {
        throw new Error(
          "detail" in payload && payload.detail
            ? payload.detail
            : "error" in payload && payload.error
              ? payload.error
              : "ocr request failed",
        );
      }

      if (ocrMode === "general") {
        setGeneralResult(payload as OCRGeneralResult);
      } else {
        setMenuResult(payload as OCRMenuResult);
      }
    } catch (error) {
      setOCRError(
        error instanceof Error
          ? getVisionErrorMessage(error.message)
          : "Unable to process this image right now.",
      );
    } finally {
      setIsProcessingOCR(false);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-40 flex h-full min-h-0 flex-col bg-black transition-opacity duration-300 ${
        view === "vision" ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <VisionHeader onClose={onClose} />
      <VisionViewfinder
        isScanning={visionTab === "signage" ? isProcessingOCR : isScanning}
        visionTab={visionTab}
        previewUrl={previewUrl}
        compact={compactResults}
      />
      <VisionControls
        visionTab={visionTab}
        thbAmount={thbAmount}
        targetCurrency={targetCurrency}
        exchangeRate={exchangeRate}
        isRateLoading={isRateLoading}
        rateError={rateError}
        ocrMode={ocrMode}
        selectedImageName={selectedImage?.name ?? null}
        isProcessingOCR={isProcessingOCR}
        ocrError={ocrError}
        generalResult={generalResult}
        menuResult={menuResult}
        compactResults={compactResults}
        onVisionTabChange={onVisionTabChange}
        onAmountChange={onAmountChange}
        onCurrencyChange={onCurrencyChange}
        onOCRModeChange={setOCRMode}
        onCameraPick={() => cameraInputRef.current?.click()}
        onFilePick={() => fileInputRef.current?.click()}
        onRunOCR={() => {
          void handleRunOCR();
        }}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}
