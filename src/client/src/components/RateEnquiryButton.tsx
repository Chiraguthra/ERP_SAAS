import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calculator } from "lucide-react";
import { formatINR } from "@/lib/currency";
import { calculateLogisticsRate } from "@/lib/logisticsRateCard";
import { useToast } from "@/hooks/use-toast";

export function RateEnquiryButton({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(defaultOpen);
  const [rateLocal, setRateLocal] = useState(false);
  const [rateDistance, setRateDistance] = useState("");
  const [rateWeight, setRateWeight] = useState("");
  const [rateResult, setRateResult] = useState<ReturnType<typeof calculateLogisticsRate> | null>(null);

  const handleRateEnquiry = () => {
    const weight = parseFloat(rateWeight);
    const distance = rateLocal ? 0 : parseFloat(rateDistance);
    if (Number.isNaN(weight)) {
      toast({ title: "Invalid input", description: "Enter weight in kg.", variant: "destructive" });
      return;
    }
    if (!rateLocal && (Number.isNaN(distance) || distance < 0)) {
      toast({ title: "Invalid input", description: "Enter distance in km or select Local.", variant: "destructive" });
      return;
    }
    const result = calculateLogisticsRate(rateLocal, distance, weight);
    setRateResult(result);
    if (!result.valid) {
      toast({ title: "Rate enquiry", description: result.error, variant: "destructive" });
    }
  };

  const closeDialog = () => {
    setOpen(false);
    setRateResult(null);
    setRateLocal(false);
    setRateDistance("");
    setRateWeight("");
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Calculator className="w-4 h-4 mr-2" /> Rate Enquiry
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Enquiry</DialogTitle>
            <p className="text-sm text-muted-foreground">From Jabalpur • Rate per kg by distance and weight</p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rate-enquiry-local"
                checked={rateLocal}
                onCheckedChange={(c) => setRateLocal(!!c)}
              />
              <Label htmlFor="rate-enquiry-local" className="cursor-pointer">Local</Label>
            </div>
            {!rateLocal && (
              <div className="space-y-2">
                <Label htmlFor="rate-enquiry-distance">Distance (km)</Label>
                <Input
                  id="rate-enquiry-distance"
                  type="number"
                  min={0}
                  max={480}
                  step={0.1}
                  placeholder="e.g. 100"
                  value={rateDistance}
                  onChange={(e) => setRateDistance(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rate-enquiry-weight">Weight (kg)</Label>
              <Input
                id="rate-enquiry-weight"
                type="number"
                min={0.1}
                step={0.01}
                placeholder="e.g. 999"
                value={rateWeight}
                onChange={(e) => setRateWeight(e.target.value)}
              />
            </div>
            <Button type="button" onClick={handleRateEnquiry} className="w-full">
              <Calculator className="w-4 h-4 mr-2" /> Calculate
            </Button>
            {rateResult?.valid && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Band: {rateResult.distanceLabel} • Weight: {rateResult.weightLabel} kg
                </p>
                <p className="text-sm">Rate: {formatINR(rateResult.ratePerKg)} per kg</p>
                <p className="text-xl font-semibold">Total: {formatINR(rateResult.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {rateResult.weightKg} kg × {rateResult.ratePerKg} = {formatINR(rateResult.total)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
